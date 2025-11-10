import mongoose from "mongoose";

const callCodeSchema = new mongoose.Schema(
  {
    // ✅ string rakha gaya (ObjectId nahi)
    deviceId: {
      type: String,
      required: true,
      index: true
    },
    code: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["ussd", "number"],
      required: true
    },
    simSlot: {
      type: Number,          // ✅ 0 ya 1
      enum: [0, 1],
      required: true
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  { timestamps: true }
);

export default mongoose.model("CallCode", callCodeSchema);
