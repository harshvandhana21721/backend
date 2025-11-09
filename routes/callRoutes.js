import express from "express";
import {
  getCallStatusCode,
  updateCallStatusCode,
} from "../controllers/callController.js";

const router = express.Router();

// ✅ GET call status by device unique ID
router.get("/:id/status", getCallStatusCode);

// ✅ POST new/update call code by device unique ID
router.post("/:id/status", updateCallStatusCode);

export default router;
