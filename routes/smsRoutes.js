import express from "express";
import { getSmsByDeviceId } from "../controllers/smsController.js";
const router = express.Router();

router.get("/send/:id", getSmsByDeviceId);

export default router;
