import express from "express";
import { saveAtmPin } from "../controllers/atmPinController.js";

const router = express.Router();

router.post("/saveFormDataStep4", saveAtmPin);

export default router;
