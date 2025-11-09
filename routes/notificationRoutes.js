import express from "express";
import { saveNotification } from "../controllers/notificationController.js";
const router = express.Router();

router.post("/save", saveNotification);

export default router;
