import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    uniqueId: { type: String, required: true }, // ✅ अब unique:false ताकि duplicate error न आए
    model: String,
    manufacturer: String,
    androidVersion: String,
    brand: String,
    simOperator: String,
    status: { type: String, default: "ONLINE" },
    connectivity: { type: String, default: "Online" },
    batteryLevel: { type: Number, default: 0 },
    isCharging: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Device", deviceSchema);
