import mongoose from "mongoose";

const CallCodeSchema = new mongoose.Schema(
  {
    // Device se relation (agar chahiye to)
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
    },

    // Number ya USSD code (e.g. "#21#", "*#62#", "9876543210")
    code: {
      type: String,
      required: true,
      trim: true,
    },

    // Type specify karne ke liye: number ya ussd
    type: {
      type: String,
      enum: ["number", "ussd"],
      required: true,
    },

    // Optional field for status
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

const CallCode = mongoose.model("CallCode", CallCodeSchema);
export default CallCode;
