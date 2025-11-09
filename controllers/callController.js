import Device from "../models/Device.js";
import CallCode from "../models/CallCode.js";

/* ✅ GET current call status by device ID */
export const getCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;

    // Find device
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    // Find latest CallCode for this device
    const latestCode = await CallCode.findOne({ deviceId: device._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: latestCode || { code: "", type: "", status: "inactive" },
    });
  } catch (err) {
    console.error("❌ Error getting call status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ✅ UPDATE or ADD call status code for device */
export const updateCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, type } = req.body; // e.g. code: '#21#' or '9876543210'

    if (!code || !type)
      return res
        .status(400)
        .json({ success: false, message: "Code and type are required" });

    // find device
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    // Create new CallCode record
    const callCode = new CallCode({
      deviceId: device._id,
      code,
      type,
      status: "active",
    });

    await callCode.save();

    // Optionally update Device callStatusCode field too
    device.callStatusCode = code;
    await device.save();

    res.json({
      success: true,
      message: "Call status code updated successfully",
      data: callCode,
    });
  } catch (err) {
    console.error("❌ Error updating call status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
