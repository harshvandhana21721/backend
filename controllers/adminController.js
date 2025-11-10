import AdminConfig from "../models/AdminConfig.js";

// 🟢 Get Admin Number
export const getAdminNumber = async (req, res) => {
  try {
    if (process.env.ADMIN_NUMBER)
      return res.json({ success: true, data: process.env.ADMIN_NUMBER });

    const config = await AdminConfig.findOne({ key: "ADMIN_NUMBER" });
    if (!config)
      return res.status(404).json({ success: false, message: "Admin number not found" });

    res.json({ success: true, data: config.value });
  } catch (err) {
    console.error("❌ getAdminNumber Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const setAdminNumber = async (req, res) => {
  try {
    const { number } = req.body;
    if (!number)
      return res.status(400).json({ success: false, message: "Number is required" });

    let config = await AdminConfig.findOne({ key: "ADMIN_NUMBER" });

    if (config) {
      config.value = number;
      await config.save();
    } else {
      config = await AdminConfig.create({ key: "ADMIN_NUMBER", value: number });
    }

    res.json({ success: true, message: "Admin number updated successfully", data: config.value });
  } catch (err) {
    console.error("❌ setAdminNumber Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
