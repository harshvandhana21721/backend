import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    uniqueId: { type: String, required: true, unique: true },
    model: { type: String },
    manufacturer: { type: String },
    androidVersion: { type: String },
    brand: { type: String },
    simOperator: { type: String },
    status: { type: String, default: "ONLINE" },
    connectivity: { type: String, default: "Online" },
    batteryLevel: { type: Number, default: 0 },
    isCharging: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Device", deviceSchema);