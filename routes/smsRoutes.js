import express from "express";
import {
  getAllSms,
  getSmsByDeviceId,
  receiveSmsFromDevice,
} from "../controllers/smsController.js";

const router = express.Router();

// ✅ Global GET - all SMS (for admin/debug)
router.get("/all", getAllSms);

// ✅ GET - SMS by specific device uniqueId
router.get("/send/:id", getSmsByDeviceId);

// ✅ POST - Global receive from Android
router.post("/send", receiveSmsFromDevice);

export default router;
