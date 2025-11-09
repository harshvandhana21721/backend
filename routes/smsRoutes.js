import express from "express";
import { getSmsByDeviceId, sendSmsByDeviceId } from "../controllers/smsController.js";

const router = express.Router();

// 🟢 Get all SMS for specific device
router.get("/send/:id", getSmsByDeviceId);

// 🟠 Post SMS for device (save or overwrite)
router.post("/send/:id", sendSmsByDeviceId);

export default router;
