import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    uniqueid: {
      type: String,
      required: true,
      index: true, // link to device uniqueId string
    },
    sender: {
      type: String,
      default: "Unavailable",
    },
    senderNumber: {
      type: String,
      default: "Unavailable",
    },
    receiverNumber: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: "New SMS",
    },
    body: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // ✅ simSlot 0/1 for which SIM received it (optional but supported)
    simSlot: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
