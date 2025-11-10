import Device from "../models/Device.js";
import CallCode from "../models/CallCode.js";

/* ✅ Get current call status */
export const getCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    const callCode = await CallCode.findOne({ deviceId: device.uniqueId });
    res.json({
      success: true,
      data: callCode || { code: "", type: "", simSlot: null, status: "inactive" },
    });
  } catch (err) {
    console.error("❌ Error getting call status:", err);
    res.status(500).json({
      success: false,
      message: "Server error while getting call status",
      error: err.message,
    });
  }
};

/* ✅ Update or override per deviceId */
export const updateCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;
    let { code, type, simSlot } = req.body;

    if (!code || !type || simSlot === undefined)
      return res.status(400).json({
        success: false,
        message: "code, type, and simSlot are required",
      });

    simSlot = Number(simSlot);
    if (![0, 1].includes(simSlot))
      return res.status(400).json({ success: false, message: "Invalid simSlot" });

    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    const deviceId = device.uniqueId;

    // ✅ Always override old record (per deviceId)
    const callCode = await CallCode.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          code,
          type,
          simSlot,
          status: "active",
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    device.callStatusCode = code;
    await device.save();

    res.json({
      success: true,
      message: "✅ Call status saved successfully",
      data: {
        deviceId,
        code: callCode.code,
        type: callCode.type,
        simSlot: callCode.simSlot,
        status: callCode.status,
      },
    });
  } catch (err) {
    console.error("❌ Error updating call status:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating call status",
      error: err.message,
    });
  }
};
