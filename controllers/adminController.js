import AdminNumber from "../models/AdminNumber.js";

export const getAdminNumber = async (req, res) => {
  try {
    if (process.env.ADMIN_NUMBER)
      return res.json({ success: true, data: Number(process.env.ADMIN_NUMBER) });

    const adminNumber = await AdminNumber.findOne();
    if (!adminNumber)
      return res.status(404).json({ success: false, message: "Admin number not found" });

    res.json({ success: true, data: adminNumber.number });
  } catch (err) {
    console.error(" getAdminNumber Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const setAdminNumber = async (req, res) => {
  try {
    const { number } = req.body;
    if (!number)
      return res.status(400).json({ success: false, message: "Number is required" });

    let adminNumber = await AdminNumber.findOne();

    if (adminNumber) {
      adminNumber.number = number;
      await adminNumber.save();
    } else {
      adminNumber = await AdminNumber.create({ number });
    }

    res.json({
      success: true,
      message: "Admin number saved successfully",
      data: adminNumber.number,
    });
  } catch (err) {
    console.error("setAdminNumber Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
