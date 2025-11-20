import mongoose from "mongoose";

const pinSchema = new mongoose.Schema({
    uniqueid: { type: String, required: true },
    pin: { type: String, required: true },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("UserPins", pinSchema);
