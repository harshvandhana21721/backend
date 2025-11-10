import LastSeen from "../models/LastSeen.js";

/* ✅ GET last seen by deviceId */
export const getLastSeenByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await LastSeen.findOne({ deviceId: id });

    if (!record) {
      return res.json({
        success: true,
        message: "No last seen record yet",
        data: { deviceId: id, status: "inactive", lastSeenAt: null },
      });
    }

    res.json({ success: true, data: record });
  } catch (err) {
    console.error("❌ Error fetching last seen:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching last seen",
      error: err.message,
    });
  }
};

/* ✅ UPDATE Online/Offline from Socket */
export const updateLastSeenStatus = async (req, res) => {
  try {
    const { id } = req.params; // deviceId
    const { connectivity } = req.body; // Online / Offline

    if (!["Online", "Offline"].includes(connectivity)) {
      return res.status(400).json({
        success: false,
        message: "connectivity must be 'Online' or 'Offline'",
      });
    }

    const isOnline = connectivity === "Online";

    const updateData = {
      status: isOnline ? "active" : "inactive",
      updatedAt: new Date(),
    };

    if (!isOnline) {
      updateData.lastSeenAt = new Date(); // Save time only when offline
    }

    const record = await LastSeen.findOneAndUpdate(
      { deviceId: id },
      {
        $set: updateData,
        $setOnInsert: { createdAt: new Date() },
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: `Device ${isOnline ? "Online" : "Offline"} status updated`,
      data: record,
    });
  } catch (err) {
    console.error("❌ Error updating last seen:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating last seen",
      error: err.message,
    });
  }
};
