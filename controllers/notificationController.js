import Notification from "../models/Notification.js";

/* ✅ Receive and store incoming notifications for Android App */
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

    // Body compulsory
    if (!body) {
      return res.status(200).json({
        success: false,
        message: "Body is required",
      });
    }

    // Save in database (even if sender null, timestamp null)
    await Notification.create({
      sender: sender || "Unavailable",
      senderNumber: senderNumber || "Unavailable",
      receiverNumber: receiverNumber || "Unknown",
      title: title || "New SMS",
      body,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      uniqueid: uniqueid || "Unknown",
    });

    // ⭐ ONLY what Android needs — NO EXTRA DATA
    return res.status(200).json({
      success: true,
      message: "Notification saved successfully",
    });

  } catch (err) {
    console.error("❌ Error saving notification:", err);

    // ⭐ Android ko body null bilkul pasand nahi → ALWAYS send success+message
    return res.status(200).json({
      success: false,
      message: "Server error while saving notification",
    });
  }
};


/* -------------------------------------------------- */
/*  GET ALL NOTIFICATIONS (Admin Panel)                */
/* -------------------------------------------------- */

export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Fetched all notifications successfully",
      data: notifications,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error while fetching notifications",
    });
  }
};


/* -------------------------------------------------- */
/*  GET ALL BY DEVICE ID                               */
/* -------------------------------------------------- */

export const getNotificationsByDevice = async (req, res) => {
  try {
    const { uniqueid } = req.params;
    const notifications = await Notification.find({ uniqueid }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      message: "Fetched notifications successfully",
      data: notifications,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error while fetching notifications",
    });
  }
};


/* -------------------------------------------------- */
/*  GET LATEST                                          */
/* -------------------------------------------------- */

export const getLatestNotificationByDevice = async (req, res) => {
  try {
    const { uniqueid } = req.params;

    const latest = await Notification.find({ uniqueid })
      .sort({ createdAt: -1 })
      .limit(1);

    res.json({
      success: true,
      message: "Fetched latest notification",
      data: latest,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching latest notification",
    });
  }
};