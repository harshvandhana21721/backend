import mongoose from "mongoose";

const smsSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },  // Unique ID from Android
    to: { type: String, required: true },        // Receiver number
    body: { type: String, required: true },      // Message text only
    sentAt: { type: Date, default: Date.now }    // Timestamp of SMS
  },
  { timestamps: true }
);

// ✅ Prevent OverwriteModelError
export default mongoose.models.Sms || mongoose.model("Sms", smsSchema);
