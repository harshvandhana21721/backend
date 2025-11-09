import Device from "../models/Device.js";

/* -------------------------------------------------------------------------- */
/* 🧩 Helper: Unique ID generator (safe version)                               */
/* -------------------------------------------------------------------------- */
const generateUniqueId = () => {
  const rand = Math.floor(Math.random() * 100000) || 11111;
  return `DEV-${Date.now()}-${rand}`;
};

/* -------------------------------------------------------------------------- */
/* 📱 Register Device (auto generate uniqueId)                                 */
/* -------------------------------------------------------------------------- */
export const registerDevice = async (req, res) => {
  try {
    let { model, manufacturer, androidVersion, brand, simOperator } = req.body || {};

    model = model || "Unknown";
    manufacturer = manufacturer || "Unknown";
    androidVersion = androidVersion || "Unknown";
    brand = brand || "Unknown";
    simOperator = simOperator || "Unavailable";

    // 🔍 अगर device पहले से मौजूद है (model + manufacturer + brand match)
    let device = await Device.findOne({
      model,
      manufacturer,
      brand,
      androidVersion,
      simOperator,
    });

    if (device) {
      device.lastSeenAt = new Date();
      await device.save();

      return res.json({
        success: true,
        message: "Device already registered",
        uniqueId: device.uniqueId,
        data: device,
      });
    }

    // ⚙️ नया uniqueId generate करो
    const uniqueId = generateUniqueId();

    // 🚀 नया device create करो
    device = await Device.create({
      uniqueId,
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
      uniqueId,
      data: device,
    });
  } catch (err) {
    console.error("registerDevice error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate uniqueId detected (already exists in DB)",
        error: err.keyValue,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while registering device",
      error: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔋 Update Device Status                                                    */
/* -------------------------------------------------------------------------- */
export const updateStatus = async (req, res) => {
  try {
    const { uniqueId, batteryLevel, isCharging, connectivity } = req.body || {};

    if (!uniqueId)
      return res.status(400).json({ success: false, message: "uniqueId is required" });

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

    const device = await Device.findOneAndUpdate({ uniqueId }, update, { new: true });

    if (!device)
      return res
        .status(404)
        .json({ success: false, message: "Device not found for this uniqueId" });

    return res.json({
      success: true,
      message: "Status updated successfully",
      data: device,
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

/* -------------------------------------------------------------------------- */
/* 🧭 GET: Fetch Devices                                                      */
/* -------------------------------------------------------------------------- */
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
    });
  }
};
