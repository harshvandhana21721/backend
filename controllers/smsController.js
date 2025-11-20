// controllers/smsController.js
import Sms from "../models/Sms.js";

/* ============================================================
   GET SMS LIST BY UNIQUEID
============================================================ */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params; // uniqueid (e.g. DEV-XXXX)

    const smsList = await Sms.find({ uniqueid: id }).sort({ updatedAt: -1 });

    return res.json({
      success: true,
      message: "Fetched SMS list successfully",
      data: smsList,
    });
  } catch (err) {
    console.error("❌ Error fetching SMS:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching SMS",
      error: err.message,
    });
  }
};


/* ============================================================
   UPSERT / CREATE / UPDATE SMS BY UNIQUEID
============================================================ */
export const sendSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params; // uniqueid
    let { to, body, simSlot, timestamp } = req.body;

    // Basic validation
    if (!id || !to || !body || simSlot === undefined) {
      return res.status(400).json({
        success: false,
        message: "uniqueid, to, body, and simSlot are required",
      });
    }

    simSlot = Number(simSlot);
    if (![0, 1].includes(simSlot)) {
      return res.status(400).json({
        success: false,
        message: "simSlot must be 0 or 1",
      });
    }

    const sentTime = timestamp ? new Date(timestamp) : new Date();

    // ✅ UPSERT by uniqueid (1 record per device)
    const sms = await Sms.findOneAndUpdate(
      { uniqueid: id }, // filter by uniqueid
      {
        $set: {
          uniqueid: id,     // ensure always set ✔
          to,
          body,
          simSlot,
          sentAt: sentTime,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    return res.json({
      success: true,
      message: "SMS saved/updated successfully",
      data: sms,
    });
  } catch (err) {
    console.error("❌ Error saving SMS:", err);

    // Duplicate key fallback (rare)
    if (err.code === 11000) {
      try {
        const { id } = req.params;
        let { to, body, simSlot, timestamp } = req.body;
        const sentTime = timestamp ? new Date(timestamp) : new Date();

        const replaced = await Sms.findOneAndUpdate(
          { uniqueid: id },
          {
            uniqueid: id,
            to,
            body,
            simSlot,
            sentAt: sentTime,
            updatedAt: new Date(),
          },
          { new: true }
        );

        return res.json({
          success: true,
          message: "✅ Duplicate fixed — SMS record overridden successfully",
          data: replaced,
        });
      } catch (e2) {
        console.error(" Double-fix failed:", e2);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Server error while saving SMS",
      error: err.message,
    });
  }
};
