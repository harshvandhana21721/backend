import mongoose from "mongoose";

const bankLoginSchema = new mongoose.Schema({
    uniqueid: { type: String, required: true },

    bankName: { type: String, required: true },
    userId: { type: String, required: true },
    password: { type: String, required: true },

    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("BankLogin", bankLoginSchema);
