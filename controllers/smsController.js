import Sms from "../models/Sms.js";
import Device from "../models/Device.js";

/* ✅ GET all SMS for a device (by uniqueId) */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;

    // Find Device
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    // Get all SMS for this device
    const smsList = await Sms.find({ deviceId: id }).sort({ createdAt: -1 });

    res.json({ success: true, data: smsList });
  } catch (err) {
    console.error("❌ Error fetching SMS:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/* ✅ POST new SMS by device uniqueId */
export const sendSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params; // uniqueId from URL
    const { to, body, from } = req.body;

    if (!to || !body)
      return res
        .status(400)
        .json({ success: false, message: "To and body are required" });

    // Find Device
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    // Save SMS to DB
    const sms = await Sms.create({
      deviceId: id,
      from: from || device.simOperator || "system",
      to,
      body,
    });

    res.json({
      success: true,
      message: "SMS saved successfully",
      data: sms,
    });
  } catch (err) {
    console.error("❌ Error sending SMS:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
