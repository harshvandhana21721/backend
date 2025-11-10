import Device from "../models/Device.js";

/* -----------------------------------------------------------
   🔹 Generate Unique Device ID
------------------------------------------------------------ */
const generateDeviceId = () => {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `DEV-${randomPart.slice(0, 6)}`;
};

/* -----------------------------------------------------------
   🟢 Register New Device (Fix Duplicate Logic)
------------------------------------------------------------ */
export const registerDevice = async (req, res) => {
  try {
    let { uniqueId, model, manufacturer, androidVersion, brand, simOperator } = req.body || {};

    model = model || "Unknown";
    manufacturer = manufacturer || "Unknown";
    androidVersion = androidVersion || "Unknown";
    brand = brand || "Unknown";
    simOperator = simOperator || "Unavailable";

    // 🔍 If device already registered, update instead of creating duplicate
    if (uniqueId) {
      const existing = await Device.findOne({ uniqueId });
      if (existing) {
        existing.lastSeenAt = new Date();
        existing.connectivity = "Online";
        existing.status = "ONLINE";
        await existing.save();
        return res.status(200).json({
          success: true,
          message: "Device already registered — updated existing record",
          deviceId: existing.uniqueId,
        });
      }
    }

    // 🆕 Otherwise, create a new device
    const deviceId = uniqueId || generateDeviceId();

    await Device.create({
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

    res.status(201).json({
      success: true,
      message: "Device registered successfully",
      deviceId,
    });
  } catch (err) {
    console.error("registerDevice error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while registering device",
      error: err.message,
    });
  }
};

/* -----------------------------------------------------------
   🟡 Update Device Status
------------------------------------------------------------ */
export const updateStatus = async (req, res) => {
  try {
    const { deviceId, batteryLevel, isCharging, connectivity } = req.body || {};
    if (!deviceId)
      return res.status(400).json({ success: false, message: "deviceId is required" });

    let status = "OFFLINE";
    if (typeof connectivity === "string") {
      const lower = connectivity.toLowerCase();
      if (lower.includes("online")) status = "ONLINE";
      else if (lower.includes("busy")) status = "BUSY";
      else if (lower.includes("idle")) status = "IDLE";
    }

    const update = {
      lastSeenAt: new Date(),
      connectivity: connectivity || "Unknown",
      status,
    };
    if (typeof batteryLevel === "number") update.batteryLevel = batteryLevel;
    if (typeof isCharging === "boolean") update.isCharging = isCharging;

    const device = await Device.findOneAndUpdate({ uniqueId: deviceId }, update, { new: true });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    res.json({ success: true, message: "Status updated successfully" });
  } catch (err) {
    console.error("updateStatus error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating status",
      error: err.message,
    });
  }
};

/* -----------------------------------------------------------
   🟢 Get All Devices (No Limit)
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

    res.json({
      success: true,
      total,
      data: devices,
    });
  } catch (err) {
    console.error("getAllDevices error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching devices",
      error: err.message,
    });
  }
};

/* -----------------------------------------------------------
   🟢 Get Single Device
------------------------------------------------------------ */
export const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Device ID required" });

    const device = await Device.findOne({ uniqueId: id });
    if (!device)
      return res.status(404).json({ success: false, message: "Device not found" });

    res.json({
      success: true,
      data: device,
    });
  } catch (err) {
    console.error("getDeviceById error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching device",
      error: err.message,
    });
  }
};
