// controllers/adminController.js
import AdminNumber from "../models/AdminNumber.js";

export const getAdminNumber = async (req, res) => {
  try {
    const adminNumber = await AdminNumber.findOne();

    if (!adminNumber) {
      return res.status(200).json({
        success: true,
        data: { number: "Inactive", status: "OFF" },
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
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const setAdminNumber = async (req, res) => {
  try {
    let { number, status } = req.body;

    if (status === "OFF") number = "Inactive";

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

    // ⭐⭐ REAL-TIME SOCKET EMIT (FIX)
    const io = req.app.get("io");
    io.emit("adminUpdate", {
      number,
      status,
      updatedAt: new Date(),
    });

    console.log("👑 REALTIME ADMIN EMIT SENT:", number, status);

    res.json({
      success: true,
      message: "Admin number updated successfully",
      data: {
        number: adminNumber.number,
        status: adminNumber.status,
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
