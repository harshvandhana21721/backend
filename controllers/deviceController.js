import Device from "../models/Device.js";

const generateDeviceId = () => {
  const rand = Math.floor(Math.random() * 100000);
  return `DEV-${Date.now()}-${rand}`;
};

export const registerDevice = async (req, res) => {
  try {
    const { model, manufacturer, androidVersion, brand, simOperator } = req.body;

    const deviceId = generateDeviceId();

    const device = new Device({
      uniqueId: deviceId,
      model,
      manufacturer,
      androidVersion,
      brand,
      simOperator,
      status: "ONLINE",
      connectivity: "Online",
      lastSeenAt: new Date(),
    });

    await device.save();

    res.status(201).json({
      success: true,
      message: "Device registered successfully",
      deviceId,
      data: device,
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
