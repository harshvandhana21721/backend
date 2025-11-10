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

    simSlot = Number(simSlot);
    if (![0, 1].includes(simSlot)) {
      return res.status(400).json({
        success: false,
        message: "simSlot must be 0 or 1",
      });
    }

    // ✅ Overwrite old SMS if same deviceId + simSlot already exists
    const sentTime = timestamp ? new Date(timestamp) : new Date();

    const sms = await Sms.findOneAndUpdate(
      { deviceId: id, simSlot },
      {
        $set: {
          to,
          body,
          sentAt: sentTime,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        new: true, // return updated document
        upsert: true, // create if not exists
      }
    );

    res.json({
      success: true,
      message: "✅ SMS saved or updated successfully",
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
