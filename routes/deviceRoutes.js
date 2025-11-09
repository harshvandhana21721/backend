import express from "express";
import {
  registerDevice,
  updateStatus,
  getAllDevices,
  getDeviceById,
} from "../controllers/deviceController.js";

const router = express.Router();

// Register new device
router.post("/admin/device-details", registerDevice);

// Update status
router.post("/status/updatee", updateStatus);

// Get all devices
router.get("/list", getAllDevices);

// 🟢 Get single device by uniqueId (NEW)
router.get("/:id", getDeviceById);

export default router;
