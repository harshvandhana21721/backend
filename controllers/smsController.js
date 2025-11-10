import Sms from "../models/Sms.js";

/* ✅ GET SMS by Device Unique ID */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;

    const smsList = await Sms.find({ deviceId: id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      message: "Fetched SMS list successfully ✅",
      data: smsList,
    });
  } catch (err) {
    console.error("❌ Error fetching SMS:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching SMS",
      error: err.message,
    });
  }
};

/* ✅ SEND (UPSERT) SMS by Device Unique ID + simSlot */
export const sendSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params; // Device uniqueId from URL
    let { to, body, simSlot, timestamp } = req.body;

    // 🧩 Validation
    if (!id || !to || !body || simSlot === undefined) {
      return res.status(400).json({
        success: false,
        message: "uniqueId, to, body, and simSlot are required",
      });
    }

    // Ensure simSlot is numeric (0 or 1)
    simSlot = Number(simSlot);
    if (![0, 1].includes(simSlot)) {
      return res.status(400).json({
        success: false,
        message: "simSlot must be 0 or 1",
      });
    }

    // 🔍 Check if SMS for same deviceId + simSlot exists
    let sms = await Sms.findOne({ deviceId: id, simSlot });

    if (sms) {
      // 🟢 Update existing record
      sms.to = to;
      sms.body = body;
      sms.sentAt = timestamp ? new Date(timestamp) : new Date();
      sms.updatedAt = new Date();
      await sms.save();
    } else {
      // 🆕 Create new record
      sms = await Sms.create({
        deviceId: id,
        to,
        body,
        simSlot,
        sentAt: timestamp ? new Date(timestamp) : new Date(),
      });
    }

    res.json({
      success: true,
      message: "SMS saved successfully ✅",
      data: {
        deviceId: sms.deviceId,
        to: sms.to,
        body: sms.body,
        simSlot: sms.simSlot,
        sentAt: sms.sentAt,
      },
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
