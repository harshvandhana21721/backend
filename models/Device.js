import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    uniqueId: { type: String, required: true, unique: true },
    brand: String,
    model: String,
    androidVersion: String,

    status: {
      type: String,
      enum: ["ONLINE", "OFFLINE", "BUSY", "IDLE"],
      default: "OFFLINE"
    },

    lastSeenAt: { type: Date, default: Date.now },

    // For /api/device/admin/call-status/{id}
    callStatusCode: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("Device", deviceSchema);
