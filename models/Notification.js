import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    sender: { type: String, default: "Unavailable" },
    senderNumber: { type: String, default: "Unavailable" },
    receiverNumber: { type: String, required: true },
    title: { type: String, default: "New SMS" },
    body: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    uniqueid: { type: String, required: true },
  },
  { timestamps: true }
);

// ✅ Prevent OverwriteModelError
export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
