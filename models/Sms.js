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

smsSchema.index({ deviceId: 1, simSlot: 1 }, { unique: true });

export default mongoose.model("Sms", smsSchema);
