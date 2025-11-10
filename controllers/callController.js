import Device from "../models/Device.js";
import CallCode from "../models/CallCode.js";
import { sendCallCodeToDevice } from "../server.js";

/* ✅ Get current call status by deviceId */
export const getCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    const callCode = await CallCode.findOne({ deviceId: device.uniqueId }).lean();

    res.json({
      success: true,
      data: callCode || { code: "", type: "", simSlot: null, status: "inactive" },
    });
  } catch (err) {
    console.error("❌ Error getting call status:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

/* ✅ Update or Insert call status */
export const updateCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params; // uniqueId
    let { code, type, simSlot } = req.body;

    if (!code || !type || simSlot === undefined)
      return res.status(400).json({ success: false, message: "code, type, simSlot required" });

    simSlot = Number(simSlot);
    if (![0, 1].includes(simSlot))
      return res.status(400).json({ success: false, message: "Invalid simSlot" });

    const device = await Device.findOne({ uniqueId: id });
    if (!device) return res.status(404).json({ success: false, message: "Device not found" });

    const deviceId = device.uniqueId;

    const callCode = await CallCode.findOneAndUpdate(
      { deviceId },
      { $set: { code, type, simSlot, status: "active", updatedAt: new Date() } },
      { new: true, upsert: true }
    );

    // Update device too
    device.callStatusCode = code;
    await device.save();

    // ✅ Real-time emit to device
    await sendCallCodeToDevice(deviceId, {
      code,
      type,
      simSlot,
      status: "active",
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Call status updated successfully",
      data: callCode,
    });
  } catch (err) {
    console.error("❌ Error updating call status:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
