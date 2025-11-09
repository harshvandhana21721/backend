import express from "express";
import { saveSimInfo, getAllSimInfo } from "../controllers/simInfoController.js";

const router = express.Router();

// 📨 Save SIM Info from Android
router.post("/save", saveSimInfo);

// 📋 Optional: Get all SIM info records
router.get("/all", getAllSimInfo);

export default router;
