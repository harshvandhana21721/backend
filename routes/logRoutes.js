import express from "express";
import { saveLog, getLogs } from "../controllers/logController.js";

const router = express.Router();

router.post("/log", saveLog);
router.get("/log/:uniqueid", getLogs);

export default router;
