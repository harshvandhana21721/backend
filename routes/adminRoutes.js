import express from "express";
import { getAdminNumber, setAdminNumber } from "../controllers/adminController.js";

const router = express.Router();

router.get("/number", getAdminNumber);  // GET admin number
router.post("/number", setAdminNumber); // POST/UPDATE admin number

export default router;
