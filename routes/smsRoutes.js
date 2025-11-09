import express from "express";
import { getSmsByDeviceId, sendSmsByDeviceId } from "../controllers/smsController.js";

const router = express.Router();

router.get("/send/:id", getSmsByDeviceId);

router.post("/send/:id", sendSmsByDeviceId);

export default router;