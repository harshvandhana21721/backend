import Device from "../models/Device.js";
import CallCode from "../models/CallCode.js";

/* ✅ GET current call status by uniqueId */
export const getCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params; // uniqueId from URL

    // 🔍 Find Device by uniqueId
    const device = await Device.findOne({ uniqueId: id });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    // 🔍 Find latest CallCode for this deviceId = uniqueId string
    const callCode = await CallCode.findOne({ deviceId: device.uniqueId })
      .sort({ createdAt: -1 })
      .lean();

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

/* ✅ UPDATE or UPSERT call status code by uniqueId + simSlot numeric + deviceId=uniqueId (string) */
export const updateCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params; // uniqueId from URL
    let { code, type, simSlot } = req.body;

    // 🧩 Validation
    if (code === undefined || type === undefined || simSlot === undefined) {
      return res.status(400).json({
        success: false,
        message: "code, type and simSlot are required",
      });
    }

    // 🧠 Convert simSlot to number (for safety)
    simSlot = Number(simSlot);
    if (![0, 1].includes(simSlot)) {
      return res.status(400).json({
        success: false,
        message: "simSlot must be 0 or 1",
      });
    }

    // 🔍 Find Device by uniqueId
    const device = await Device.findOne({ uniqueId: id });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    // ✅ FIXED: use device.uniqueId string as deviceId (not ObjectId)
    const deviceId = device.uniqueId;

    // 🔁 Check existing CallCode for this deviceId (string) and simSlot
    let callCode = await CallCode.findOne({ deviceId, simSlot });

    if (callCode) {
      // 🟢 Update existing
      callCode.code = code;
      callCode.type = type;
      callCode.status = "active";
      callCode.updatedAt = new Date();
      await callCode.save();
    } else {
      // 🆕 Create new
      callCode = await CallCode.create({
        deviceId, // string uniqueId
        code,
        type,
        simSlot,
        status: "active",
      });
    }

    device.callStatusCode = code;
    await device.save();

    res.json({
      success: true,
      message: "Call status code saved successfully ✅",
      data: {
        uniqueId: device.uniqueId,
        deviceId: device.uniqueId, // string type
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
