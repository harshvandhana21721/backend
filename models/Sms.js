import mongoose from "mongoose";

const smsSchema = new mongoose.Schema(
  {
    uniqueid: { type: String, required: true, unique: true },
    to: { type: String, required: true },
    body: { type: String, required: true },
    simSlot: { type: Number, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 🔥 Make sure uniqueid is unique
smsSchema.index({ uniqueid: 1 }, { unique: true });

const Sms = mongoose.model("Sms", smsSchema);

export default Sms;
