import mongoose from "mongoose";

const CallCodeSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["number", "ussd"],
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

const CallCode = mongoose.model("CallCode", CallCodeSchema);
export default CallCode;
