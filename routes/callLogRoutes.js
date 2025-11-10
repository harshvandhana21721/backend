import express from "express";
import {
  getCallForwardLogs,
  logCallForwardStatus,
} from "../controllers/callLogController.js";

const router = express.Router();

// 🔹 POST → Log status (enable/disable) for SIM1/SIM2
router.post("/:id/log", logCallForwardStatus);

// 🔹 GET → Fetch recent history logs
router.get("/:id/logs", getCallForwardLogs);

export default router;
