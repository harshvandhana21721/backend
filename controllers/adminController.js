// controllers/adminController.js
import AdminNumber from "../models/AdminNumber.js";

// 🟢 GET Admin Number + Status
export const getAdminNumber = async (req, res) => {
  try {
    const adminNumber = await AdminNumber.findOne();

    if (!adminNumber) {
      return res.status(200).json({
        success: true,
        data: { number: "Inactive", status: "OFF" }, // default values if not found
      });
    }

    res.json({
      success: true,
      data: {
        number: adminNumber.number,
        status: adminNumber.status,
      },
    });
  } catch (err) {
    console.error("getAdminNumber Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🔵 POST / Set Admin Number + Status
export const setAdminNumber = async (req, res) => {
  try {
    let { number, status } = req.body;

    // 🧠 If OFF selected → override number to "Inactive"
    if (status === "OFF") {
      number = "Inactive";
    }

    // 🔹 Validate: both fields must be present in some form
    if (!number)
      return res.status(400).json({ success: false, message: "Number (string) is required" });

    if (status && !["ON", "OFF"].includes(status))
      return res.status(400).json({ success: false, message: "Invalid status value" });

    // 🔍 Find or create/update the single admin record
    let adminNumber = await AdminNumber.findOne();

    if (adminNumber) {
      adminNumber.number = number;
      if (status) adminNumber.status = status;
      await adminNumber.save();
    } else {
      adminNumber = await AdminNumber.create({
        number,
        status: status || "OFF",
      });
    }

    res.json({
      success: true,
      message: "✅ Admin number updated successfully",
      data: {
        number: adminNumber.number,
        status: adminNumber.status,
      },
    });
  } catch (err) {
    console.error("setAdminNumber Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
