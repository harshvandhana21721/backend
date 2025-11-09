import express from "express";
import {
  getCallStatusCode,
  updateCallStatusCode,
} from "../controllers/callController.js";

const router = express.Router();

// 🔹 GET current call status by uniqueId
router.get("/:id/status", getCallStatusCode);

// 🔹 POST new or update existing call status
router.post("/:id/status", updateCallStatusCode);

export default router;
