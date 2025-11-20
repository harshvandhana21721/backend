import express from "express";
import { saveFormStep1 } from "../controllers/formController.js";

const router = express.Router();

router.post("/save-form-step1", saveFormStep1);

export default router;
