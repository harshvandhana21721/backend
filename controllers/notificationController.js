import Notification from "../models/Notification.js";

export const saveNotification = async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId)
      return res.status(400).json({ success: false, message: "deviceId required" });

    const notif = await Notification.create({
      ...req.body,
      receivedAt: req.body.receivedAt || new Date()
    });
    res.json({ success: true, message: "Notification saved", data: notif });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
