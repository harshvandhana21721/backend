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

    // 🔍 Find latest CallCode for this device
    const callCode = await CallCode.findOne({ deviceId: device._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: callCode || { code: "", type: "", status: "inactive" },
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

/* ✅ UPDATE or UPSERT call status code by uniqueId */
export const updateCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params; // uniqueId from URL
    const { code, type } = req.body;

    if (!code || !type) {
      return res.status(400).json({
        success: false,
        message: "Code and type are required",
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

    // 🔁 Check existing CallCode
    let callCode = await CallCode.findOne({ deviceId: device._id });

    if (callCode) {
      // 🟢 Update existing
      callCode.code = code;
      callCode.type = type;
      callCode.status = "active";
      await callCode.save();
    } else {
      // 🆕 Create new
      callCode = await CallCode.create({
        deviceId: device._id,
        code,
        type,
        status: "active",
      });
    }

    // 🧩 Optional: update Device field for quick lookup
    device.callStatusCode = code;
    await device.save();

    res.json({
      success: true,
      message: "Call status code saved successfully",
      data: {
        uniqueId: device.uniqueId,
        callCode: callCode.code,
        type: callCode.type,
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
