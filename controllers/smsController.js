import Sms from "../models/Sms.js";

/* ✅ GET SMS by deviceId (hamesha max 1 record milega) */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;

    // Array format maintain kar rahe hain frontend compat ke liye
    const smsList = await Sms.find({ deviceId: id }).sort({ updatedAt: -1 });

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

/* ✅ SEND / UPSERT SMS by deviceId
   👉 same deviceId par naya SMS aaya to purana overwrite karega
*/
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

    // ✅ IMPORTANT: yahi override ka magic hai
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
        new: true,    // updated document return karega
        upsert: true, // agar nahi mila to naya banayega
      }
    );

    res.json({
      success: true,
      message: "✅ SMS saved/updated successfully",
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
