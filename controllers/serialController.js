import { Serial } from "../models/SerialModel.js";

/* -------------------------------------------------------------------------- */
/* 🟢 POST: Save Serial Number for a Device                                    */
/* -------------------------------------------------------------------------- */
export const saveSerialNumber = async (req, res) => {
  try {
    const { uniqueId, serialNumber } = req.body;

    if (!uniqueId || !serialNumber) {
      return res.status(400).json({
        success: false,
        message: "uniqueId and serialNumber are required",
      });
    }

    // Check if already exists
    const existing = await Serial.findOne({ uniqueId });
    if (existing) {
      existing.serialNumber = serialNumber;
      await existing.save();
      return res.status(200).json({
        success: true,
        message: "Serial number updated successfully",
        data: existing,
      });
    }

    const newSerial = await Serial.create({ uniqueId, serialNumber });

    res.status(201).json({
      success: true,
      message: "Serial number saved successfully",
      data: newSerial,
    });
  } catch (error) {
    console.error("Error saving serial:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔵 GET: Get Serial Number by Device ID                                     */
/* -------------------------------------------------------------------------- */
export const getSerialByDeviceId = async (req, res) => {
  try {
    const { id } = req.params;
    const serial = await Serial.findOne({ uniqueId: id });

    if (!serial) {
      return res.status(404).json({
        success: false,
        message: "Serial number not found for this device",
      });
    }

    res.status(200).json({
      success: true,
      message: "Serial number fetched successfully",
      data: serial,
    });
  } catch (error) {
    console.error("Error fetching serial:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* 🟣 GET: Fetch All Devices with Their Serial Numbers                         */
/* -------------------------------------------------------------------------- */
export const getAllSerials = async (req, res) => {
  try {
    const serials = await Serial.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: serials.length,
      data: serials,
    });
  } catch (error) {
    console.error("Error fetching all serials:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
