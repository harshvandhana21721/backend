import User from "../models/User.js";

// AUTO CREATE PASSWORD WHEN SERVER STARTS
export const initAdminPassword = async () => {
  try {
    const exists = await User.findOne({});

    // Already created? do nothing
    if (exists) return;

    const defaultPassword = "12345";  // APNA DEFAULT PASSWORD

    await User.create({ password: defaultPassword });

    console.log("✔ DEFAULT ADMIN PASSWORD SET:", defaultPassword);

  } catch (err) {
    console.log("❌ AUTO PASSWORD ERROR:", err.message);
  }
};


// LOGIN
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
