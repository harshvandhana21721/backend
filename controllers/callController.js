import Device from "../models/Device.js";
import CallCode from "../models/CallCode.js";

/* ✅ GET current call status by deviceId (uniqueId) */
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

/* ✅ UPSERT / OVERRIDE per deviceId */
export const updateCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params; // uniqueId
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
        message: "Invalid simSlot (must be 0 or 1)",
      });
    }

    const device = await Device.findOne({ uniqueId: id });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const deviceId = device.uniqueId;

    // ✅ Always override existing record (no duplicate)
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

    // Optionally update Device model too
    device.callStatusCode = code;
    await device.save();

    res.json({
      success: true,
      message: " Call status saved or updated successfully",
      data: {
        deviceId,
        code: callCode.code,
        type: callCode.type,
        simSlot: callCode.simSlot,
        status: callCode.status,
      },
    });
  } catch (err) {
    console.error(" Error updating call status:", err);
    // If duplicate key error, force override (2nd safety)
    if (err.code === 11000) {
      try {
        const { id } = req.params;
        let { code, type, simSlot } = req.body;
        const device = await Device.findOne({ uniqueId: id });
        const deviceId = device.uniqueId;

        const replaced = await CallCode.findOneAndUpdate(
          { deviceId },
          {
            code,
            type,
            simSlot,
            status: "active",
            updatedAt: new Date(),
          },
          { new: true }
        );

        return res.json({
          success: true,
          message: " Duplicate fixed — record overridden successfully",
          data: replaced,
        });
      } catch (e2) {
        console.error(" Double-fix failed:", e2);
      }
    }

    res.status(500).json({
      success: false,
      message: "Server error while updating call status",
      error: err.message,
    });
  }
};