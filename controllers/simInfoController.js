import SimInfo from "../models/SimInfo.js";

export const saveSimInfo = async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res
        .status(400)
        .json({ success: false, message: "deviceId required" });
    }

    const sim = await SimInfo.create(req.body);
    return res.json({
      success: true,
      message: "SIM info saved",
      data: sim
    });
  } catch (err) {
    console.error("saveSimInfo error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};