import mongoose from "mongoose";

const callCodeSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["ussd", "number"],
      required: true,
    },
    simSlot: {
      type: Number, // ✅ 0 or 1 (not string)
      enum: [0, 1],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("CallCode", callCodeSchema);
