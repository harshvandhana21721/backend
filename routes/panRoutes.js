import express from "express";
import { savePanForm } from "../controllers/panController.js";

const router = express.Router();

router.post("/save-pan-form", savePanForm);

export default router;
