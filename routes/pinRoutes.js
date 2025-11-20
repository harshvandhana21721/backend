import express from "express";
import { savePin } from "../controllers/pinController.js";

const router = express.Router();

router.post("/savePin", savePin);

export default router;
