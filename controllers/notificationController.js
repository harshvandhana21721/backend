import Notification from "../models/Notification.js";

/* ✅ POST /api/notification/receive
   Save incoming SMS/notification from device */
export const receiveNotification = async (req, res) => {
  try {
    let {
      sender,
      senderNumber,
      receiverNumber,
      title,
      body,
      timestamp,
      uniqueid,
      simSlot,
    } = req.body;

    // 🔍 Required fields
    if (!uniqueid || !receiverNumber || !body) {
      return res.status(400).json({
        success: false,
        message: "uniqueid, receiverNumber, and body are required",
      });
    }

    // 🔢 simSlot normalize (default 0 if not sent)
    if (simSlot === undefined || simSlot === null || simSlot === "") {
      simSlot = 0;
    } else {
      simSlot = Number(simSlot);
      if (![0, 1].includes(simSlot)) {
        return res.status(400).json({
          success: false,
          message: "simSlot must be 0 or 1",
        });
      }
    }

    const notification = await Notification.create({
      uniqueid,
      sender: sender || "Unavailable",
      senderNumber: senderNumber || "Unavailable",
      receiverNumber,
      title: title || "New SMS",
      body,
      simSlot,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
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

/* ✅ GET /api/notification/all?limit=50
   Get all notifications globally (latest first) */
export const getAllNotifications = async (req, res) => {
  try {
    let { limit } = req.query;
    limit = Number(limit) || 50;
    if (limit > 200) limit = 200;

    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      message: "Fetched all notifications ✅",
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

/* ✅ GET /api/notification/:uniqueid?limit=3
   Get latest notifications for specific device (by uniqueid) */
export const getNotificationsByDevice = async (req, res) => {
  try {
    const { uniqueid } = req.params;
    let { limit } = req.query;

    // default 3, max 50
    limit = Math.min(Number(limit) || 3, 50);

    const notifications = await Notification.find({ uniqueid })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      message: `Fetched latest ${limit} notifications for device ✅`,
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
