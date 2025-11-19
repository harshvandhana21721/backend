import SimInfo from "../models/SimInfo.js";

/* ---------------------------------------------------------
   SAVE / UPDATE SIM
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

    const existingSim = await SimInfo.findOne({ uniqueid });

    if (existingSim) {
      existingSim.sim1Number  = sim1Number  || existingSim.sim1Number;
      existingSim.sim1Carrier = sim1Carrier || existingSim.sim1Carrier;
      existingSim.sim1Slot    = sim1Slot    || existingSim.sim1Slot;

      existingSim.sim2Number  = sim2Number  || existingSim.sim2Number;
      existingSim.sim2Carrier = sim2Carrier || existingSim.sim2Carrier;
      existingSim.sim2Slot    = sim2Slot    || existingSim.sim2Slot;

      const updated = await existingSim.save();

      return res.json({
        success: true,
        message: "SIM info updated successfully",
        data: updated
      });
    }

    const created = await SimInfo.create({
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
      data: created
    });

  } catch (err) {
    console.error("saveSimInfo error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error saving SIM info"
    });
  }
};

/* ---------------------------------------------------------
   GET ALL SIM INFO
---------------------------------------------------------- */
export const getAllSimInfo = async (req, res) => {
  try {
    const sims = await SimInfo.find().sort({ createdAt: -1 });
    return res.json({ success: true, count: sims.length, data: sims });

  } catch (err) {
    console.error("getAllSimInfo error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* ---------------------------------------------------------
   GET SIM INFO BY UNIQUEID
---------------------------------------------------------- */
export const getSimByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "uniqueid is required",
      });
    }

    const cleanId = id.trim();

    const simData = await SimInfo.findOne({
      uniqueid: { $regex: new RegExp(`^${cleanId}$`, "i") }
    });

    if (!simData) {
      return res.status(404).json({
        success: false,
        message: `No SIM info found for ${cleanId}`
      });
    }

    return res.json({
      success: true,
      data: simData
    });

  } catch (err) {
    console.error("getSimByDeviceId error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching SIM info"
    });
  }
};