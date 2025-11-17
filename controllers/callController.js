import Device from "../models/Device.js";
import CallCode from "../models/CallCode.js";
import { sendCallCodeToDevice } from "../server.js";

/* -----------------------------------------------------------
   🟢 Get call status for device
------------------------------------------------------------ */
export const getCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 Find device using small uniqueid
    const device = await Device.findOne({ uniqueid: id });

    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    // 🔍 Find call code using device.uniqueid
    const callCode = await CallCode.findOne({ uniqueid: device.uniqueid }).lean();

    res.json({
      success: true,
      data:
        callCode || {
          code: "",
          type: "",
          simSlot: null,
          status: "inactive",
        },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -----------------------------------------------------------
   🟢 Update call status + emit to device
------------------------------------------------------------ */
export const updateCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;
    let { code, type, simSlot } = req.body;

    if (!code || !type || simSlot === undefined)
      return res.status(400).json({
        success: false,
        message: "code, type, simSlot required",
      });

    simSlot = Number(simSlot);

    if (![0, 1].includes(simSlot))
      return res.status(400).json({
        success: false,
        message: "Invalid simSlot",
      });

    // 🔍 Find device by uniqueid
    const device = await Device.findOne({ uniqueid: id });

    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    const uniqueid = device.uniqueid;

    // 🔄 Update CallCode document
    const callCode = await CallCode.findOneAndUpdate(
      { uniqueid },
      {
        $set: {
          code,
          type,
          simSlot,
          status: "active",
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    // Optional: store last used code inside Device
    device.callStatusCode = code;
    await device.save();

    // 📡 Emit to device in real time
    await sendCallCodeToDevice(uniqueid, {
      code,
      type,
      simSlot,
      status: "active",
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Call status updated",
      data: callCode,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
