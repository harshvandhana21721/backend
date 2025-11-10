import mongoose from "mongoose";

const callCodeSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },  // e.g. "DEV-OVI7UI"
    code: { type: String, required: true },
    type: { type: String, enum: ["ussd", "number"], required: true },
    simSlot: { type: Number, required: true },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

callCodeSchema.index({ deviceId: 1 }, { unique: true });

export default mongoose.model("CallCode", callCodeSchema);
