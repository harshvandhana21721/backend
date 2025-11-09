import express from "express";
import {
  getSmsByDeviceId,
  sendSmsByDeviceId,
} from "../controllers/smsController.js";

const router = express.Router();

// 🟢 GET all SMS for a device
router.get("/send/:id", getSmsByDeviceId);

// 🟠 POST new SMS for a device
router.post("/send/:id", sendSmsByDeviceId);

export default router;
