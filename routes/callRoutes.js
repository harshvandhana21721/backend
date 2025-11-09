import express from "express";
import { getCallStatusCode } from "../controllers/callController.js";
const router = express.Router();

router.get("/status/:id", getCallStatusCode);

export default router;
