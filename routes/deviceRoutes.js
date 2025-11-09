import express from "express";
import { registerDevice, updateStatus, getAllDevices } from "../controllers/deviceController.js";

const router = express.Router();

// Android APIs
router.post("/admin/device-details", registerDevice);
router.post("/status/updatee", updateStatus);

// Frontend API
router.get("/list", getAllDevices);

export default router;
