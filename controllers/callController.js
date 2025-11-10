import Device from "../models/Device.js";
import CallCode from "../models/CallCode.js";

export const getCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findOne({ uniqueId: id });
    if (!device) {
      return res.status(404).json({ success: false, message: "Device not found" });
    }

    const callCode = await CallCode.findOne({ deviceId: device.uniqueId }).lean();

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

/* ✅ UPSERT call status by deviceId (override previous record) */
export const updateCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params; // uniqueId from URL
    let { code, type, simSlot } = req.body;

    // Validation
    if (!code || !type || simSlot === undefined) {
      return res.status(400).json({
        success: false,
        message: "code, type, and simSlot are required",
      });
    }

    simSlot = Number(simSlot);
    if (![0, 1].includes(simSlot)) {
      return res.status(400).json({
        success: false,
        message: "simSlot must be 0 or 1",
      });
    }

    const device = await Device.findOne({ uniqueId: id });
    if (!device) {
      return res.status(404).json({ success: false, message: "Device not found" });
    }

    const deviceId = device.uniqueId;

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
      message: "✅ Call status updated successfully",
      data: {
        deviceId,
        callCode: callCode.code,
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