import mongoose from "mongoose";

// ⚙️ Prevent model overwrite issue
if (mongoose.models.CallCode) {
  delete mongoose.models.CallCode;
}

const callCodeSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,   // ✅ string rakha gaya (no ObjectId)
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
      type: Number,
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
