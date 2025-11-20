import mongoose from "mongoose";

const ActionLogSchema = new mongoose.Schema({
    uniqueid: { type: String, required: true },

    type: { type: String, enum: ["CALL", "SMS"], required: true },

    // CALL
    callCode: String,
    callStatus: { type: String, enum: ["ACTIVE", "DEACTIVE", "FAILED"] },

    // SMS
    smsTo: String,
    smsBody: String,
    smsStatus: { type: String, enum: ["SUCCESS", "FAILED"] },

    simSlot: Number,

    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("ActionLog", ActionLogSchema);
