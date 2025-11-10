import Sms from "../models/Sms.js";

/* ✅ GET all SMS by deviceId */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;
    const smsList = await Sms.find({ deviceId: id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Fetched SMS list successfully",
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

export const sendSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params; 
    let { to, body, simSlot, timestamp } = req.body;

    if (!id || !to || !body || simSlot === undefined) {
      return res.status(400).json({
        success: false,
        message: "uniqueId, to, body, and simSlot are required",
      });
    }

    simSlot = Number(simSlot);
    if (![0, 1].includes(simSlot)) {
      return res.status(400).json({
        success: false,
        message: "simSlot must be 0 or 1",
      });
    }

    const sms = new Sms({
      deviceId: id,
      to,
      body,
      simSlot,
      sentAt: timestamp ? new Date(timestamp) : new Date(),
    });

    await sms.save();

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
