import express from "express";
import {
  saveSerialNumber,
  getSerialByDeviceId,
  getAllSerials,
} from "../controllers/serialController.js";

const router = express.Router();

router.post("/save", saveSerialNumber);

router.get("/:id", getSerialByDeviceId);

router.get("/", getAllSerials);

export default router;
