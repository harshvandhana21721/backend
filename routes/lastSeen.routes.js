import express from "express";
import {
  getLastSeenByDeviceId,
  updateLastSeenStatus,
} from "../controllers/lastSeen.controller.js";

const router = express.Router();

router.get("/:id", getLastSeenByDeviceId);
router.post("/:id/status", updateLastSeenStatus);

export default router;