import express from "express";
import { saveBankLogin } from "../controllers/bankLoginController.js";

const router = express.Router();

router.post("/save-form-step2", saveBankLogin);

export default router;
