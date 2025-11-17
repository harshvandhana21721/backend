import CallLog from "../models/CallLog.js";
import Device from "../models/Device.js";

/* ------------------------------------------------------
   🟢 POST → Log Call Forward Status (enable/disable)
------------------------------------------------------- */
export const logCallForwardStatus = async (req, res) => {
  try {
    const { id } = req.params; // this is uniqueid
    const { code, simSlot, type, status } = req.body;

    if (!code || simSlot === undefined || !type || !status) {
      return res.status(400).json({
        success: false,
        message: "code, simSlot, type and status are required",
      });
    }

    // 🔍 Find device by small uniqueid
    const device = await Device.findOne({ uniqueid: id });
    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    // 📝 Create call log using uniqueid
    const log = await CallLog.create({
      uniqueid: id, // FIXED: no deviceId
      code,
      simSlot,
      type,
      status,
    });

    res.json({
      success: true,
      message: "Call forward logged",
      data: log,
    });
  } catch (err) {
    console.error("💥 Log call error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ------------------------------------------------------
   🟢 GET → Recent Call Forward History
------------------------------------------------------- */
export const getCallForwardLogs = async (req, res) => {
  try {
    const { id } = req.params; // uniqueid

    // 🔍 Check device exists
    const device = await Device.findOne({ uniqueid: id });
    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    // 📜 Fetch logs by uniqueid
    const logs = await CallLog.find({ uniqueid: id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (err) {
    console.error("💥 Fetch logs error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
