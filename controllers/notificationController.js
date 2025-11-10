import Notification from "../models/Notification.js";

/* ✅ Receive and store incoming notifications */
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

    // 🧩 Validation
    if (!uniqueid || !receiverNumber || !body) {
      return res.status(400).json({
        success: false,
        message: "uniqueid, receiverNumber, and body are required",
      });
    }

    // 🆕 Create and save new notification
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
      message: "Notification saved successfully ✅",
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

/* ✅ Get all notifications (for admin or list view) */
export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Fetched all notifications successfully ✅",
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

/* ✅ Get notifications for a specific device by uniqueid */
export const getNotificationsByDevice = async (req, res) => {
  try {
    const { uniqueid } = req.params;

    const notifications = await Notification.find({ uniqueid }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      message: `Fetched notifications for device: ${uniqueid}`,
      data: notifications,
    });
  } catch (err) {
    console.error("❌ Error fetching device notifications:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching device notifications",
      error: err.message,
    });
  }
};

/* ✅ Get latest notification (for refresh or 'Get SMS' click) */
export const getLatestNotificationByDevice = async (req, res) => {
  try {
    const { uniqueid } = req.params;

    const latest = await Notification.find({ uniqueid })
      .sort({ createdAt: -1 })
      .limit(1);

    res.json({
      success: true,
      message: "Fetched latest notification successfully ✅",
      data: latest,
    });
  } catch (err) {
    console.error("❌ Error fetching latest notification:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching latest notification",
      error: err.message,
    });
  }
};
