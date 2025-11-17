import Sms from "../models/Sms.js";

/* ============================================================
   GET SMS LIST BY UNIQUEID
============================================================ */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;   // uniqueid

    const smsList = await Sms.find({ uniqueid: id }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      message: "Fetched SMS list successfully",
      data: smsList,
    });
  } catch (err) {
    console.error(" Error fetching SMS:", err);
    res.status(500).json({
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

    // Validation
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

    // MAIN UPSERT QUERY — filter by uniqueid
    const sms = await Sms.findOneAndUpdate(
      { uniqueid: id },     // FIXED (deviceId → uniqueid)
      {
        $set: {
          to,
          body,
          simSlot,
          sentAt: sentTime,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          uniqueid: id,
          createdAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    res.json({
      success: true,
      message: "SMS saved/updated successfully",
      data: sms,
    });

  } catch (err) {
    console.error("Error saving SMS:", err);

    // Duplicate index fix
    if (err.code === 11000) {
      try {
        const { id } = req.params;
        let { to, body, simSlot, timestamp } = req.body;
        const sentTime = timestamp ? new Date(timestamp) : new Date();

        const replaced = await Sms.findOneAndUpdate(
          { uniqueid: id },  // FIXED
          {
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
          message: "Duplicate fixed — SMS record overridden successfully",
          data: replaced,
        });
      } catch (e2) {
        console.error("🔥 Double-fix failed:", e2);
      }
    }

    res.status(500).json({
      success: false,
      message: "Server error while saving SMS",
      error: err.message,
    });
  }
};
