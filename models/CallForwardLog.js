import mongoose from "mongoose";

const callForwardLogSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    simSlot: { type: Number, enum: [0, 1], required: true }, // 0 = SIM1, 1 = SIM2
    status: { type: String, enum: ["enabled", "disabled"], required: true },
    actionBy: { type: String, default: "system" }, // user/system
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CallForwardLog", callForwardLogSchema);
