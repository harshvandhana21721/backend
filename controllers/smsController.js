import Sms from "../models/Sms.js";

export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;

    const smsList = await Sms.find({ deviceId: id }).sort({ updatedAt: -1 });

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

/* ✅ UPSERT / OVERRIDE SMS by deviceId */
export const sendSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params; // deviceId (uniqueId)
    let { to, body, simSlot, timestamp } = req.body;

    // Validation
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

    const sentTime = timestamp ? new Date(timestamp) : new Date();

    // ✅ Always override same deviceId record
    const sms = await Sms.findOneAndUpdate(
      { deviceId: id }, // filter only by deviceId
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
        new: true,   // return updated doc
        upsert: true // create if not exists
      }
    );

    res.json({
      success: true,
      message: "SMS saved/updated successfully",
      data: sms,
    });
  } catch (err) {
    console.error("Error saving SMS:", err);

    // ⚠️ Duplicate key fix fallback (in case DB has duplicates)
    if (err.code === 11000) {
      try {
        const { id } = req.params;
        let { to, body, simSlot, timestamp } = req.body;
        const sentTime = timestamp ? new Date(timestamp) : new Date();

        const replaced = await Sms.findOneAndUpdate(
          { deviceId: id },
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
          message: "✅ Duplicate fixed — SMS record overridden successfully",
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
