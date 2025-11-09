import express from "express";
import { saveSimInfo } from "../controllers/simInfoController.js";
const router = express.Router();

router.post("/save", saveSimInfo);

export default router;
