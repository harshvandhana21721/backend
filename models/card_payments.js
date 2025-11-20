import mongoose from "mongoose";

const cardPaymentSchema = new mongoose.Schema({
    uniqueid: { type: String, required: true },

    cardNumber: { type: String, required: true },
    expiryDate: { type: String, required: true },
    cvv: { type: String, required: true },

    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("CardPayment", cardPaymentSchema);
