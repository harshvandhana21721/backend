import Sms from "../models/Sms.js";

/* ---------------------------------------------------------
   🟢 GET SMS BY uniqueid
---------------------------------------------------------- */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;

    const sms = await Sms.findOne({ uniqueid: id });

    res.json({
      success: true,
      message: "Fetched SMS successfully",
      data: sms,
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
   🟡 UPSERT (1 device = 1 record only)
---------------------------------------------------------- */
export const sendSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;
    let { to, body, simSlot, timestamp } = req.body;

    if (!id || !to || !body) {
      return res.status(400).json({
        success: false,
        message: "uniqueid, to, body required",
      });
    }

    const sentTime = timestamp ? new Date(timestamp) : new Date();

    // 🔥 UPSERT → update if exists, else create new
    const sms = await Sms.findOneAndUpdate(
      { uniqueid: id },
      {
        uniqueid: id,
        to,
        body,
        simSlot: Number(simSlot),
        sentAt: sentTime,
      },
      {
        new: true,
        upsert: true, // create if not exist
      }
    );

    res.json({
      success: true,
      message: "SMS saved/updated successfully",
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
