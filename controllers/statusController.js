import StatusModel from "../models/StatusModel.js";

// POST /api/status/updatee
export const updateStatus = async (req, res) => {
  try {
    const { uniqueid, connectivity } = req.body;

    if (!uniqueid || !connectivity) {
      return res.status(400).json({
        success: false,
        message: "uniqueid and connectivity are required",
      });
    }

    // Check if device exists
    let device = await StatusModel.findOne({ uniqueid });

    if (device) {
      // Update existing record
      device.connectivity = connectivity;
      device.updatedAt = new Date();
      await device.save();
    } else {
      // Create new record
      device = await StatusModel.create({ uniqueid, connectivity });
    }

    res.status(200).json({
      success: true,
      message: `Device status updated: ${connectivity}`,
      data: device,
    });
  } catch (error) {
    console.error("Error in updateStatus:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
