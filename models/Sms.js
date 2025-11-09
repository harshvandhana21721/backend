import mongoose from "mongoose";

const smsSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    from: String,
    to: String,
    body: String,
    sentAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("Sms", smsSchema);