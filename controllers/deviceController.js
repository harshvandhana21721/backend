import Device from "../models/Device.js";

/* -----------------------------------------------------------
   🔹 Generate Random uniqueid
------------------------------------------------------------ */
const generateUniqueId = () =>
  `DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

/* -----------------------------------------------------------
   🟢 Register / Update Device (LIVE EMIT)
------------------------------------------------------------ */
export const registerDevice = async (req, res) => {
  try {
    const io = req.app.get("io");

    let { uniqueid, model, manufacturer, androidVersion, brand, simOperator } =
      req.body || {};

    model ||= "Unknown";
    manufacturer ||= "Unknown";
    androidVersion ||= "Unknown";
    brand ||= "Unknown";
    simOperator ||= "Unavailable";

    let device;

    // 🔍 Already registered → update
    if (uniqueid) {
      device = await Device.findOne({ uniqueid });

      if (device) {
        device.lastSeenAt = new Date();
        device.connectivity = "Online";
        device.status = "ONLINE";
        await device.save();

        io.emit("deviceListUpdated", {
          event: "device_updated",
          device,
        });

        return res.status(200).json({
          success: true,
          message: "Device already registered — updated existing record",
          uniqueid: device.uniqueid,
        });
      }
    }

    // 🆕 New device
    const newId = uniqueid || generateUniqueId();

    device = await Device.create({
      uniqueid: newId,
      model,
      manufacturer,
      brand,
      androidVersion,
      simOperator,
      status: "ONLINE",
      connectivity: "Online",
      lastSeenAt: new Date(),
    });

    io.emit("deviceListUpdated", {
      event: "device_registered",
      device,
    });

    res.status(201).json({
      success: true,
      message: "Device registered successfully",
      uniqueid: newId,
    });
  } catch (err) {
    console.error("registerDevice error:", err);
    res.status(500).json({
      success: false,
      message: "Error registering device",
    });
  }
};

/* -----------------------------------------------------------
   🟡 Update Device Status (LIVE EMIT)
------------------------------------------------------------ */
export const updateStatus = async (req, res) => {
  try {
    const io = req.app.get("io");

    const { uniqueid, batteryLevel, isCharging, connectivity } = req.body || {};

    if (!uniqueid)
      return res.status(400).json({
        success: false,
        message: "uniqueid required",
      });

    // Status mapping
    let status = "OFFLINE";
    const lower = (connectivity || "").toLowerCase();

    if (lower.includes("online")) status = "ONLINE";
    else if (lower.includes("busy")) status = "BUSY";
    else if (lower.includes("idle")) status = "IDLE";

    const update = {
      lastSeenAt: new Date(),
      connectivity: connectivity || "Unknown",
      status,
    };

    if (typeof batteryLevel === "number")
      update.batteryLevel = batteryLevel;

    if (typeof isCharging === "boolean")
      update.isCharging = isCharging;

    const device = await Device.findOneAndUpdate(
      { uniqueid },
      update,
      { new: true }
    );

    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    io.emit("deviceListUpdated", {
      event: "device_status",
      device,
    });

    res.json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (err) {
    console.error("updateStatus error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

/* -----------------------------------------------------------
   🟢 Get All Devices
------------------------------------------------------------ */
export const getAllDevices = async (req, res) => {
  try {
    const { search = "", sort = "latest" } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { brand: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { androidVersion: { $regex: search, $options: "i" } },
        { uniqueid: { $regex: search, $options: "i" } },
      ];
    }

    const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const devices = await Device.find(query).sort(sortOption);

    res.json({
      success: true,
      total: devices.length,
      data: devices,
    });
  } catch (err) {
    console.error("getAllDevices error:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching devices",
      error: err.message,
    });
  }
};

/* -----------------------------------------------------------
   🟢 Get Single Device by uniqueid
------------------------------------------------------------ */
export const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id)
      return res.status(400).json({
        success: false,
        message: "uniqueid required",
      });

    const device = await Device.findOne({ uniqueid: id });

    if (!device)
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });

    res.json({
      success: true,
      data: device,
    });
  } catch (err) {
    console.error("getDeviceById error:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching device",
      error: err.message,
    });
  }
};
