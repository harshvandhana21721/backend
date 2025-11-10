import mongoose from "mongoose";

const smsSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    to: { type: String, required: true },
    body: { type: String, required: true },
    simSlot: { type: Number, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ 1 deviceId = 1 hi SMS document (override behavior)
smsSchema.index({ deviceId: 1 }, { unique: true });

const Sms = mongoose.model("Sms", smsSchema);

export default Sms;
