import express from "express";
import {
  getCallForwardLogs,
  logCallForwardStatus,
} from "../controllers/callLogController.js";

const router = express.Router();

router.post("/:id/log", logCallForwardStatus);
router.get("/:id/logs", getCallForwardLogs);

export default router;