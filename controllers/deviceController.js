import Device from "../models/Device.js";

const generateDeviceId = () => {

  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();

  return `DEV-${randomPart.slice(0, 6)}`; 
};

export const registerDevice = async (req, res) => {
  try {
    let { model, manufacturer, androidVersion, brand, simOperator } = req.body || {};

    // Default fallback values
    model = model || "Unknown";
    manufacturer = manufacturer || "Unknown";
    androidVersion = androidVersion || "Unknown";
    brand = brand || "Unknown";
    simOperator = simOperator || "Unavailable";

    const deviceId = generateDeviceId();

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

    return res.status(201).json({
      success: true,
      message: "Device registered successfully",
      deviceId,
    });
  } catch (err) {
    console.error("registerDevice error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while registering device",
      error: err.message,
    });
  }
};

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
      return res
        .status(404)
        .json({ success: false, message: "Device not found for this deviceId" });

    return res.json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (err) {
    console.error("updateStatus error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating status",
      error: err.message,
    });
  }
};

export const getAllDevices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", sort = "latest" } = req.query;

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

    const total = await Device.countDocuments(query);
    const devices = await Device.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
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