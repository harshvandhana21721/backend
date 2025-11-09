import AdminConfig from "../models/AdminConfig.js";

export const getAdminNumber = async (req, res) => {
  try {
    if (process.env.ADMIN_NUMBER)
      return res.json({ success: true, data: process.env.ADMIN_NUMBER });

    const config = await AdminConfig.findOne({ key: "ADMIN_NUMBER" });
    if (!config)
      return res.status(404).json({ success: false, message: "Admin number not found" });

    res.json({ success: true, data: config.value });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
