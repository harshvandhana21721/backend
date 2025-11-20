import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    uniqueid: { type: String, required: true, unique: true },
    model: { type: String, default: "Unknown" },
    manufacturer: { type: String, default: "Unknown" },
    brand: { type: String, default: "Unknown" },
    androidVersion: { type: String, default: "Unknown" },
    simOperator: { type: String, default: "Unavailable" },
    batteryLevel: { type: Number, default: 0 },
    isCharging: { type: Boolean, default: false },
    connectivity: { type: String, default: "Offline" },
    status: { type: String, default: "OFFLINE" },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Device", deviceSchema);