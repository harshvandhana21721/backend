import Device from "../models/Device.js";
import CallCode from "../models/CallCode.js";
import { sendCallCodeToDevice } from "../server.js";

/* =========================================================
   📡 Get current call status
   ========================================================= */
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
      data:
        callCode || {
          code: "",
          type: "",
          simSlot: null,
          status: "inactive",
          message: "No active call forwarding",
        },
    });
  } catch (err) {
    console.error("💥 Error in getCallStatusCode:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   🔁 Update / Save call status and emit to device
   ========================================================= */
export const updateCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;
    let { code, type, simSlot, status } = req.body;

    // ✅ Validate inputs
    if (!code || !type || simSlot === undefined || !status)
      return res
        .status(400)
        .json({ success: false, message: "code, type, simSlot, status required" });

    simSlot = Number(simSlot);
    if (![0, 1].includes(simSlot))
      return res.status(400).json({ success: false, message: "Invalid simSlot" });

    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    const deviceId = device.uniqueId;

    // ✅ Update or insert call forwarding entry
    const callCode = await CallCode.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          code,
          type,
          simSlot,
          status,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    // ✅ Update device model as well
    device.callStatusCode = code;
    device.callStatus = status;
    await device.save();

    // ✅ Emit live update to specific device
    await sendCallCodeToDevice(deviceId, {
      code,
      type,
      simSlot,
      status,
      updatedAt: new Date(),
    });

    console.log(
      `📞 [${deviceId}] Call forward ${status === "active" ? "enabled" : "disabled"} → ${code}`
    );

    res.json({
      success: true,
      message: `Call ${status === "active" ? "forwarded" : "disabled"} successfully`,
      data: callCode,
    });
  } catch (err) {
    console.error("💥 Error in updateCallStatusCode:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   🚫 Disable call forwarding (set inactive)
   ========================================================= */
export const disableCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    const deviceId = device.uniqueId;

    const callCode = await CallCode.findOneAndUpdate(
      { deviceId },
      { $set: { status: "inactive", updatedAt: new Date() } },
      { new: true }
    );

    await sendCallCodeToDevice(deviceId, {
      code: callCode?.code || "",
      type: callCode?.type || "",
      simSlot: callCode?.simSlot || 0,
      status: "inactive",
      updatedAt: new Date(),
    });

    device.callStatus = "inactive";
    await device.save();

    console.log(`🚫 [${deviceId}] Call forwarding disabled`);
    res.json({ success: true, message: "Call forwarding disabled", data: callCode });
  } catch (err) {
    console.error("💥 Error in disableCallStatusCode:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
