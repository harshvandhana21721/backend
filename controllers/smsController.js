import Sms from "../models/Sms.js";

/* ---------------------------------------------------------
   🟢 GET SMS BY uniqueid
---------------------------------------------------------- */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params; // uniqueid

    const smsList = await Sms.find({ uniqueid: id }).sort({ createdAt: -1 });

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

/* ---------------------------------------------------------
   🟡 SAVE NEW SMS (NO UPSERT)
   ➝ Har SMS ek new entry
   ➝ Har device ka alag data
---------------------------------------------------------- */
export const sendSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params; // uniqueid
    let { to, body, simSlot, timestamp } = req.body;

    // Validation
    if (!id || !to || !body) {
      return res.status(400).json({
        success: false,
        message: "uniqueid, to, body required",
      });
    }

    const sentTime = timestamp ? new Date(timestamp) : new Date();

    // CREATE NEW SMS ENTRY
    const sms = await Sms.create({
      uniqueid: id,
      to,
      body,
      simSlot: Number(simSlot),
      sentAt: sentTime,
    });

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
