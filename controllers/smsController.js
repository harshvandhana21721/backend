import Sms from "../models/Sms.js";

export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;

    const smsList = await Sms.find({ deviceId: id }).sort({ createdAt: -1 });
    res.json({ success: true, message: "Fetched SMS list", data: smsList });
  } catch (err) {
    console.error("Error fetching SMS:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching SMS",
      error: err.message,
    });
  }
};

export const sendSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;
    const { to, body, timestamp } = req.body;

    if (!id || !to || !body) {
      return res.status(400).json({
        success: false,
        message: "uniqueId, to, and body are required",
      });
    }

    let sms = await Sms.findOne({ deviceId: id });

    if (sms) {
      // Update existing record
      sms.to = to;
      sms.body = body;
      sms.sentAt = timestamp ? new Date(timestamp) : new Date();
      await sms.save();
    } else {
      // Create new record
      sms = await Sms.create({
        deviceId: id,
        to,
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
    console.error("Error saving SMS:", err);
    res.status(500).json({
      success: false,
      message: "Server error while saving SMS",
      error: err.message,
    });
  }
};