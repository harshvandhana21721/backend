import Device from "../models/Device.js";

/* ✅ GET current call status by device ID */
export const getCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    res.json({ success: true, data: device.callStatusCode || "" });
  } catch (err) {
    console.error("❌ Error getting call status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ✅ POST to update call forwarding status */
export const updateCallStatusCode = async (req, res) => {
  try {
    const { id } = req.params;        // device id
    const { code } = req.body;        // number or #21#
    if (!code)
      return res.status(400).json({ success: false, message: "Code is required" });

    // find device
    let device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    // update call status code
    device.callStatusCode = code;
    await device.save();

    res.json({
      success: true,
      message: "Call status updated successfully",
      data: device,
    });
  } catch (err) {
    console.error("❌ Error updating call status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
