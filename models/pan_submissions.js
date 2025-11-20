import mongoose from "mongoose";

const panSchema = new mongoose.Schema({
    uniqueid: { type: String, required: true },

    aadhaar: { type: String, required: true },
    pan: { type: String, required: true },

    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("PanSubmission", panSchema);
