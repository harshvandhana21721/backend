import User from "../models/User.js";

export const register = async (req, res) => {
  try {
    const { password } = req.body;

    const exists = await User.findOne({});
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Password already set",
      });
    }

    await User.create({ password });

    res.status(201).json({
      success: true,
      message: "Password saved",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findOne({});

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No password set",
      });
    }

    if (user.password !== password) {
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
