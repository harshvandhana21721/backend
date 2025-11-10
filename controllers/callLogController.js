import CallForwardLog from "../models/CallForwardLog.js";
import Device from "../models/Device.js";
import { sendCallCodeToDevice } from "../server.js";

/* =========================================================
   🧾 Get call forwarding history logs
   ========================================================= */
export const getCallForwardLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    const logs = await CallForwardLog.find({ deviceId: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    console.error("💥 Error in getCallForwardLogs:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   🟢 Log call forwarding status (enabled / disabled)
   ========================================================= */
export const logCallForwardStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { simSlot, status, actionBy } = req.body;

    if (simSlot === undefined || !["enabled", "disabled"].includes(status))
      return res
        .status(400)
        .json({ success: false, message: "simSlot and valid status required" });

    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    const entry = new CallForwardLog({
      deviceId: id,
      simSlot,
      status,
      actionBy: actionBy || "user",
    });
    await entry.save();

    // ✅ Emit live update to device dashboard
    await sendCallCodeToDevice(id, {
      simSlot,
      status,
      actionBy,
      timestamp: entry.timestamp,
    });

    console.log(`🗂️ Logged ${status.toUpperCase()} for SIM${simSlot + 1} of ${id}`);

    res.json({ success: true, message: "Log saved successfully", data: entry });
  } catch (err) {
    console.error("💥 Error in logCallForwardStatus:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
