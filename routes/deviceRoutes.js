import express from "express";
import { registerDevice, updateStatus, getAllDevices } from "../controllers/deviceController.js";

const router = express.Router();

router.post("/admin/device-details", registerDevice);
router.post("/status/updatee", updateStatus);

router.get("/list", getAllDevices);

export default router;
