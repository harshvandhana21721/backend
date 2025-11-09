import SimInfo from "../models/SimInfo.js";

// 📩 Save SIM Info
export const saveSimInfo = async (req, res) => {
  try {
    const {
      deviceId,
      sim1Number,
      sim1Carrier,
      sim1Slot,
      sim2Number,
      sim2Carrier,
      sim2Slot
    } = req.body;

    // Validation
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId required"
      });
    }

    // 🧩 Save to DB
    const simData = await SimInfo.create({
      deviceId,
      sim1Number,
      sim1Carrier,
      sim1Slot,
      sim2Number,
      sim2Carrier,
      sim2Slot
    });

    return res.json({
      success: true,
      message: "SIM info saved successfully",
      data: simData
    });
  } catch (err) {
    console.error("❌ saveSimInfo error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error saving SIM info"
    });
  }
};

export const getAllSimInfo = async (req, res) => {
  try {
    const sims = await SimInfo.find().sort({ createdAt: -1 });
    res.json({ success: true, count: sims.length, data: sims });
  } catch (err) {
    console.error("getAllSimInfo error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
