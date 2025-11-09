import Notification from "../models/Notification.js";

/**
 * ✅ POST /api/notification/save
 * Save single SMS/notification entry
 */
export const receiveNotification = async (req, res) => {
  try {
    const {
      sender,
      senderNumber,
      receiverNumber,
      title,
      body,
      timestamp,
      uniqueid,
    } = req.body;

    // 🧩 Validate fields
    if (!uniqueid || !receiverNumber || !body) {
      return res.status(400).json({
        success: false,
        message: "uniqueid, receiverNumber, and body are required",
      });
    }

    // 🆕 Create new Notification record
    const notification = await Notification.create({
      sender: sender || "Unavailable",
      senderNumber: senderNumber || "Unavailable",
      receiverNumber,
      title: title || "New SMS",
      body,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      uniqueid,
    });

    res.status(201).json({
      success: true,
      message: "Notification saved successfully",
      data: notification,
    });
  } catch (err) {
    console.error("❌ Error saving notification:", err);
    res.status(500).json({
      success: false,
      message: "Server error while saving notification",
      error: err.message,
    });
  }
};

/**
 * ✅ GET /api/notification/all
 * Fetch all notifications (latest first)
 */
export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      message: "Fetched all notifications",
      data: notifications,
    });
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching notifications",
      error: err.message,
    });
  }
};

/**
 * ✅ GET /api/notification/:uniqueid
 * Fetch notifications for a specific device
 */
export const getNotificationsByDevice = async (req, res) => {
  try {
    const { uniqueid } = req.params;
    const notifications = await Notification.find({ uniqueid }).sort({
      createdAt: -1,
    });
    res.json({
      success: true,
      message: "Fetched notifications for device",
      data: notifications,
    });
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching device notifications",
      error: err.message,
    });
  }
};
