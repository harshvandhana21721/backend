import express from "express";
import { getCallStatusCode, updateCallStatusCode } from "../controllers/callController.js";

const router = express.Router();

// ✅ GET by device ID
router.get("/status/:id", getCallStatusCode);

// ✅ POST update by device ID
router.post("/status/:id", updateCallStatusCode);

export default router;
