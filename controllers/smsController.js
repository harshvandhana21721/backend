import Sms from "../models/Sms.js";
import Device from "../models/Device.js";


export const getSmsByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findOne({ uniqueId: id });
    if (!device) return res.status(404).json({ success: false, message: "Device not found" });

    const smsList = await Sms.find({ deviceId: id }).sort({ createdAt: -1 });
    res.json({ success: true, data: smsList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};