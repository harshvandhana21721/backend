import express from "express";
import {
  saveSimInfo,
  getAllSimInfo,
  getSimByDeviceId
} from "../controllers/simInfoController.js";

const router = express.Router();

router.post("/save", saveSimInfo);        // Save/Update SIM Info
router.get("/list", getAllSimInfo);       // Get ALL sims
router.get("/:id", getSimByDeviceId);     // FIXED (id not deviceId)

export default router;
