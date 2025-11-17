import Sms from "../models/Sms.js";

/* ---------------------------------------------------------
   🟢 GET SMS BY uniqueid
---------------------------------------------------------- */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params; // this is uniqueid

    const smsList = await Sms.find({ uniqueid: id }).sort({ updatedAt: -1 });

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
   🟡 UPSERT / OVERRIDE SMS BY uniqueid
---------------------------------------------------------- */
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

    // 🔥 UPSERT — always only 1 SMS record per uniqueid
    const sms = await Sms.findOneAndUpdate(
      { uniqueid: id }, // filter by uniqueid only
      {
        $set: {
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

    res.json({
      success: true,
      message: "SMS saved/updated successfully",
      data: sms,
    });
  } catch (err) {
    console.error("❌ Error saving SMS:", err);

    // 🛠 Duplicate Fix (if DB contains old duplicates)
    if (err.code === 11000) {
      try {
        const { id } = req.params;
        let { to, body, simSlot, timestamp } = req.body;
        const sentTime = timestamp ? new Date(timestamp) : new Date();

        const replaced = await Sms.findOneAndUpdate(
          { uniqueid: id },
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
          message: "✅ Duplicate fixed — SMS overridden successfully",
          data: replaced,
        });
      } catch (err2) {
        console.error("🔥 Double-fix failed:", err2);
      }
    }

    res.status(500).json({
      success: false,
      message: "Server error while saving SMS",
      error: err.message,
    });
  }
};
