import express from "express";
import { saveTransactionPass } from "../controllers/transactionPassController.js";

const router = express.Router();

router.post("/save-form-step4", saveTransactionPass);

export default router;
