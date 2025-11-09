import Device from "../models/Device.js";
import CallCode from "../models/CallCode.js";

/* ✅ GET current call status by device ID */
export const getCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 Find Device
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    // 🔍 Find existing CallCode for this device (latest only)
    const callCode = await CallCode.findOne({ deviceId: device._id }).lean();

    res.json({
      success: true,
      data: callCode || { code: "", type: "", status: "inactive" },
    });
  } catch (err) {
    console.error("❌ Error getting call status:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/* ✅ UPDATE or UPSERT call status code for device */
export const updateCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, type } = req.body;

    if (!code || !type)
      return res
        .status(400)
        .json({ success: false, message: "Code and type are required" });

    // 🔍 Find Device
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    // 🔁 Find existing CallCode for this device
    let callCode = await CallCode.findOne({ deviceId: device._id });

    if (callCode) {
      // 🔁 Update existing record
      callCode.code = code;
      callCode.type = type;
      callCode.status = "active";
      await callCode.save();
    } else {
      // ➕ Create new record (first time)
      callCode = await CallCode.create({
        deviceId: device._id,
        code,
        type,
        status: "active",
      });
    }

    // 🧩 Also update Device field
    device.callStatusCode = code;
    await device.save();

    res.json({
      success: true,
      message: "Call status code saved successfully",
      data: callCode,
    });
  } catch (err) {
    console.error("❌ Error updating call status:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
