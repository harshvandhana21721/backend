import Sms from "../models/Sms.js";
import Device from "../models/Device.js";

/* ✅ GET all SMS for a device (by uniqueId) */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 Find Device
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    // 🔍 Get all SMS for this device
    const smsList = await Sms.find({ deviceId: id }).sort({ createdAt: -1 });

    res.json({ success: true, data: smsList });
  } catch (err) {
    console.error("❌ Error fetching SMS:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/* ✅ POST new SMS by device uniqueId (overwrite if exists) */
export const sendSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params; // uniqueId from URL
    const { to, body, from } = req.body;

    if (!to || !body)
      return res
        .status(400)
        .json({ success: false, message: "To and body are required" });

    // 🔍 Find Device
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    // 🔁 Check existing SMS for this device
    let sms = await Sms.findOne({ deviceId: id });

    if (sms) {
      // 🟢 Update existing record
      sms.from = from || device.simOperator || "Unavailable";
      sms.to = to;
      sms.body = body;
      sms.sentAt = new Date();
      await sms.save();
    } else {
      // 🆕 Create new record if none exists
      sms = await Sms.create({
        deviceId: id,
        from: from || device.simOperator || "Unavailable",
        to,
        body,
        sentAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: "SMS saved (updated if existed)",
      data: sms,
    });
  } catch (err) {
    console.error("❌ Error sending SMS:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
