import SimInfo from "../models/SimInfo.js";

/* 🔹 Save or Update SIM Info by unique deviceId */
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

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required"
      });
    }

    // 🔍 Check if SIM info already exists for this device
    const existingSim = await SimInfo.findOne({ deviceId });

    let simData;
    if (existingSim) {
      // 🔁 Update existing record
      existingSim.sim1Number = sim1Number || existingSim.sim1Number;
      existingSim.sim1Carrier = sim1Carrier || existingSim.sim1Carrier;
      existingSim.sim1Slot = sim1Slot || existingSim.sim1Slot;
      existingSim.sim2Number = sim2Number || existingSim.sim2Number;
      existingSim.sim2Carrier = sim2Carrier || existingSim.sim2Carrier;
      existingSim.sim2Slot = sim2Slot || existingSim.sim2Slot;

      simData = await existingSim.save();

      return res.json({
        success: true,
        message: "SIM info updated successfully",
        data: simData
      });
    } else {
      // ➕ Create new record
      simData = await SimInfo.create({
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
    }
  } catch (err) {
    console.error("❌ saveSimInfo error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error saving SIM info"
    });
  }
};

/* 🔹 Get all SIM info (latest first) */
export const getAllSimInfo = async (req, res) => {
  try {
    const sims = await SimInfo.find().sort({ createdAt: -1 });
    res.json({ success: true, count: sims.length, data: sims });
  } catch (err) {
    console.error("getAllSimInfo error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getSimByDeviceId = async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required",
      });
    }

    // ✅ Trim & normalize the deviceId (remove extra spaces)
    const cleanId = deviceId.trim().toUpperCase();

    const simData = await SimInfo.findOne({ deviceId: cleanId });
    if (!simData) {
      return res.status(404).json({
        success: false,
        message: `No SIM info found for deviceId: ${cleanId}`,
      });
    }

    return res.json({
      success: true,
      data: simData,
    });
  } catch (err) {
    console.error("❌ getSimByDeviceId error:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching SIM info",
    });
  }
};