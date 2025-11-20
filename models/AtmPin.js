import mongoose from "mongoose";

const atmPinSchema = new mongoose.Schema({
    uniqueid: { type: String, required: true },
    atmPin: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("AtmPin", atmPinSchema);
