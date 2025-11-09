import express from "express";
import { getAdminNumber } from "../controllers/adminController.js";
const router = express.Router();

router.get("/number", getAdminNumber);

export default router;