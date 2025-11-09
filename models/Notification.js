import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    title: String,
    message: String,
    packageName: String,
    receivedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
