import mongoose from "mongoose";

const lastSeenSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    status: { type: String, enum: ["active", "inactive"], default: "inactive" },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

lastSeenSchema.index({ deviceId: 1 }, { unique: true });

export default mongoose.model("LastSeen", lastSeenSchema);
