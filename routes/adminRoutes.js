import express from "express";
import { getAdminNumber, setAdminNumber } from "../controllers/adminController.js";

const router = express.Router();

router.get("/", getAdminNumber);
router.post("/", setAdminNumber);

export default router;
