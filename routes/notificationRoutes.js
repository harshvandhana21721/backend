import express from "express";
import {
  receiveNotification,
  getAllNotifications,
  getNotificationsByDevice,
} from "../controllers/notificationController.js";

const router = express.Router();

// 🔔 Device se aane wala notification (incoming SMS, etc.)
router.post("/receive", receiveNotification);

// 🔔 Sab notifications (for admin / logs)
router.get("/all", getAllNotifications);

// 🔔 Specific device ke notifications (by uniqueid)
router.get("/:uniqueid", getNotificationsByDevice);

export default router;
