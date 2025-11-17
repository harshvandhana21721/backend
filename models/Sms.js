import mongoose from "mongoose";

const smsSchema = new mongoose.Schema(
  {
    uniqueid: { type: String, required: true },  // ❌ UNIQUE NAHI
    to: { type: String, required: true },
    body: { type: String, required: true },
    simSlot: { type: Number, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ❌ REMOVE unique index (very important)
// smsSchema.index({ uniqueid: 1 }, { unique: true });  // DELETE THIS LINE

const Sms = mongoose.model("Sms", smsSchema);

export default Sms;
