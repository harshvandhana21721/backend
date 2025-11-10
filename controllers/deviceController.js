import Device from "../models/Device.js";

/* -----------------------------------------------------------
   🔹 Generate Random Device ID
------------------------------------------------------------ */
const generateDeviceId = () =>
  `DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

/* -----------------------------------------------------------
   🟢 Register / Update Device (LIVE EMIT)
------------------------------------------------------------ */
export const registerDevice = async (req, res) => {
  try {
    const io = req.app.get("io");
    let { uniqueId, model, manufacturer, androidVersion, brand, simOperator } =
      req.body || {};

    model ||= "Unknown";
    manufacturer ||= "Unknown";
    androidVersion ||= "Unknown";
    brand ||= "Unknown";
    simOperator ||= "Unavailable";

    let device;

    // 🔍 If device already exists, update
    if (uniqueId) {
      device = await Device.findOne({ uniqueId });
      if (device) {
        device.lastSeenAt = new Date();
        device.connectivity = "Online";
        device.status = "ONLINE";
        await device.save();

        io.emit("deviceListUpdated", { event: "device_updated", device });

        return res.status(200).json({
          success: true,
          message: "Device already registered — updated existing record",
          deviceId: device.uniqueId,
        });
      }
    }

    // 🆕 Create new device
    const deviceId = uniqueId || generateDeviceId();
    device = await Device.create({
      uniqueId: deviceId,
      model,
      manufacturer,
      brand,
      androidVersion,
      simOperator,
      status: "ONLINE",
      connectivity: "Online",
      lastSeenAt: new Date(),
    });

    io.emit("deviceListUpdated", { event: "device_registered", device });

    res.status(201).json({
      success: true,
      message: "Device registered successfully",
      deviceId,
    });
  } catch (err) {
    console.error("registerDevice error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error registering device" });
  }
};

/* -----------------------------------------------------------
   🟡 Update Device Status (LIVE EMIT)
------------------------------------------------------------ */
export const updateStatus = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { deviceId, batteryLevel, isCharging, connectivity } = req.body || {};
    if (!deviceId)
      return res
        .status(400)
        .json({ success: false, message: "deviceId required" });

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

    if (typeof batteryLevel === "number") update.batteryLevel = batteryLevel;
    if (typeof isCharging === "boolean") update.isCharging = isCharging;

    const device = await Device.findOneAndUpdate(
      { uniqueId: deviceId },
      update,
      { new: true }
    );

    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    io.emit("deviceListUpdated", { event: "device_status", device });

    res.json({ success: true, message: "Status updated successfully" });
  } catch (err) {
    console.error("updateStatus error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/* -----------------------------------------------------------
   🟢 Get All Devices (LIVE LIST SUPPORT)
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
        { uniqueId: { $regex: search, $options: "i" } },
      ];
    }

    const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
    const devices = await Device.find(query).sort(sortOption);
    const total = devices.length;

    res.json({ success: true, total, data: devices });
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
   🟢 Get Single Device by ID
------------------------------------------------------------ */
export const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Device ID required" });

    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });

    res.json({ success: true, data: device });
  } catch (err) {
    console.error("getDeviceById error:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching device",
      error: err.message,
    });
  }
};
