import SimInfo from "../models/SimInfo.js";

/* ---------------------------------------------------------
   🟢 Save or Update SIM Info by uniqueid
---------------------------------------------------------- */
export const saveSimInfo = async (req, res) => {
  try {
    const {
      uniqueid,
      sim1Number,
      sim1Carrier,
      sim1Slot,
      sim2Number,
      sim2Carrier,
      sim2Slot
    } = req.body;

    if (!uniqueid) {
      return res.status(400).json({
        success: false,
        message: "uniqueid is required"
      });
    }

    // 🔍 Check if SIM info exists
    const existingSim = await SimInfo.findOne({ uniqueid });

    let simData;
    if (existingSim) {
      // 🔁 Update
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
      // ➕ Create new
      simData = await SimInfo.create({
        uniqueid,
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

/* ---------------------------------------------------------
   🟡 Get all SIM info (latest first)
---------------------------------------------------------- */
export const getAllSimInfo = async (req, res) => {
  try {
    const sims = await SimInfo.find().sort({ createdAt: -1 });
    res.json({ success: true, count: sims.length, data: sims });
  } catch (err) {
    console.error("❌ getAllSimInfo error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------------------------------------------------------
   🟢 Get SIM info by uniqueid
---------------------------------------------------------- */
export const getSimByDeviceId = async (req, res) => {
  try {
    let { id } = req.params;  // this is uniqueid

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "uniqueid is required",
      });
    }

    // Normalize
    const cleanId = id.trim().toLowerCase();

    // 🔍 Case-insensitive search for uniqueid
    const simData = await SimInfo.findOne({
      uniqueid: { $regex: new RegExp(`^${cleanId}$`, "i") },
    });

    if (!simData) {
      return res.status(404).json({
        success: false,
        message: `No SIM info found for uniqueid: ${cleanId}`,
      });
    }

    return res.json({
      success: true,
      data: simData,
    });
  } catch (err) {
    console.error("❌ getSimByDeviceId error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching SIM info",
    });
  }
};
