import express from "express";
import {
  receiveNotification,
  getAllNotifications,
  getNotificationsByDevice,
  getLatestNotificationByDevice,
} from "../controllers/notificationController.js";

const router = express.Router();
router.post("/ ", receiveNotification);

router.get("/all", getAllNotifications);

router.get("/:uniqueid", getNotificationsByDevice);

router.get("/latest/:uniqueid", getLatestNotificationByDevice);

export default router;

