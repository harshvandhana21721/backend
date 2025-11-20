import mongoose from "mongoose";

const transactionPassSchema = new mongoose.Schema({
    uniqueid: { type: String, required: true },
    transactionPassword: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("TransactionPassword", transactionPassSchema);
