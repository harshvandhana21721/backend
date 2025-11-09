import StatusModel from "../models/StatusModel.js";

export const updateStatus = async (req, res) => {
  try {
    const { uniqueid, connectivity } = req.body;
    if (!uniqueid || !connectivity) {
      return res.status(400).json({
        success: false,
        message: "uniqueid and connectivity are required",
      });
    }

    let device = await StatusModel.findOne({ uniqueid });

    if (device) {
      device.connectivity = connectivity;
      device.updatedAt = new Date();
      await device.save();
    } else {
      device = await StatusModel.create({ uniqueid, connectivity });
    }

    // ✅ Emit real-time update through socket
    const io = req.app.get("io");
    if (io) {
      io.emit("statusUpdate", {
        uniqueid,
        connectivity,
        updatedAt: device.updatedAt,
      });
      console.log(`📢 Live update emitted → ${uniqueid} is ${connectivity}`);
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
