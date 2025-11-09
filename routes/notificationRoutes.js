import express from "express";
import {
  receiveNotification,
  getAllNotifications,
  getNotificationsByDevice,
} from "../controllers/notificationController.js";

const router = express.Router();

// 🟢 Save notification from Android
router.post("/save", receiveNotification);

// 🔵 Get all notifications
router.get("/all", getAllNotifications);

// 🔴 Get notifications by unique device ID
router.get("/:uniqueid", getNotificationsByDevice);

export default router;
