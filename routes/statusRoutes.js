import express from "express";
import { updateStatus } from "../controllers/statusController.js";

const router = express.Router();

// POST /api/status/updatee
router.post("/updatee", updateStatus);

export default router;
