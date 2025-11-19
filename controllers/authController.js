import User from "../models/User.js";


// 🔥 AUTO CREATE ADMIN PASSWORD WHEN SERVER STARTS
export const initAdminPassword = async () => {
  try {
    const exists = await User.findOne({});

    if (exists) return;

    const defaultPassword = "admin";  // Default Admin Pass

    await User.create({ password: defaultPassword });

    console.log("✔ DEFAULT ADMIN PASSWORD SET:", defaultPassword);

  } catch (err) {
    console.log("❌ AUTO PASSWORD ERROR:", err.message);
  }
};



// 🔒 LOGIN ADMIN
export const login = async (req, res) => {
  try {
    const { password } = req.body;

    const admin = await User.findOne({});

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Admin password not set",
      });
    }

    if (admin.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    res.json({
      success: true,
      message: "Access Granted",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



// 🔥 CHANGE PASSWORD (NO OLD PASSWORD REQUIRED)
export const changePassword = async (req, res) => {
  try {
    const { newPass } = req.body;

    if (!newPass) {
      return res.status(400).json({
        success: false,
        message: "New password required",
      });
    }

    const admin = await User.findOne({});

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Admin not found",
      });
    }

    admin.password = newPass;
    await admin.save();

    res.json({
      success: true,
      message: "Password updated",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
