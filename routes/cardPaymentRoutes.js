import express from "express";
import { saveCardPayment } from "../controllers/cardPaymentController.js";

const router = express.Router();

router.post("/save-form-step3", saveCardPayment);

export default router;
