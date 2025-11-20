import CardPayment from "../models/card_payments.js";

export const saveCardPayment = async (req, res) => {
    try {
        const { uniqueid, cardNumber, expiryDate, cvv } = req.body;

        if (!uniqueid) {
            return res.json({ success: false, message: "Unique ID missing" });
        }

        const entry = new CardPayment({
            uniqueid,
            cardNumber,
            expiryDate,
            cvv
        });

        await entry.save();

        return res.json({
            success: true,
            message: "Card payment saved successfully",
            data: entry
        });

    } catch (e) {
        return res.json({
            success: false,
            message: "Server error",
            error: e.message
        });
    }
};
