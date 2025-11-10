import CallLog from "../models/CallLog.js";
import Device from "../models/Device.js";

// ✅ POST → log call forward enable/disable
export const logCallForwardStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, simSlot, type, status } = req.body;

    if (!code || simSlot === undefined || !type || !status) {
      return res.status(400).json({
        success: false,
        message: "code, simSlot, type and status are required",
      });
    }

    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    const log = await CallLog.create({
      deviceId: id,
      code,
      simSlot,
      type,
      status,
    });

    res.json({ success: true, message: "Call forward logged", data: log });
  } catch (err) {
    console.error("💥 Log call error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET → recent call forward history
export const getCallForwardLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    const logs = await CallLog.find({ deviceId: id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (err) {
    console.error("💥 Fetch logs error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
