import LastSeen from "../models/LastSeen.js";

/* ---------------------------------------------------------
   🟢 GET last seen by uniqueid 
---------------------------------------------------------- */
export const getLastSeenByDeviceId = async (req, res) => {
  try {
    const { id } = req.params; // this is uniqueid

    const record = await LastSeen.findOne({ uniqueid: id });

    if (!record) {
      return res.json({
        success: true,
        message: "No last seen record yet",
        data: { uniqueid: id, status: "inactive", lastSeenAt: null },
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

/* ---------------------------------------------------------
   🟢 UPDATE Online/Offline from Socket (uniqueid)
---------------------------------------------------------- */
export const updateLastSeenStatus = async (req, res) => {
  try {
    const { id } = req.params; // uniqueid
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
      updateData.lastSeenAt = new Date(); // Only save time on offline
    }

    const record = await LastSeen.findOneAndUpdate(
      { uniqueid: id }, // FIXED: deviceId removed
      {
        $set: updateData,
        $setOnInsert: { createdAt: new Date(), uniqueid: id },
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
