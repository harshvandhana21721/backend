import express from "express";
import {
  getCallStatusCode,
  updateCallStatusCode,
} from "../controllers/callController.js";

const router = express.Router();

router.get("/:id/status", getCallStatusCode);

router.post("/:id/status", updateCallStatusCode);

export default router;
