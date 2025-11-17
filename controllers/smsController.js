import Sms from "../models/Sms.js";

/* GET SMS */
export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;

    const smsList = await Sms.find({ uniqueid: id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Fetched SMS successfully",
      data: smsList,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* SAVE NEW SMS */
export const sendSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;
    let { to, body, simSlot, timestamp } = req.body;

    const sentTime = timestamp ? new Date(timestamp) : new Date();

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
    console.error("Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
