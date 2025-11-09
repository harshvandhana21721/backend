import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    uniqueId: { type: String, required: true }, // 🚫 no "unique: true"
    model: { type: String, default: "Unknown" },
    manufacturer: { type: String, default: "Unknown" },
    androidVersion: { type: String, default: "Unknown" },
    brand: { type: String, default: "Unknown" },
    simOperator: { type: String, default: "Unavailable" },
    status: { type: String, default: "ONLINE" },
    connectivity: { type: String, default: "Online" },
    batteryLevel: { type: Number, default: 0 },
    isCharging: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
     callStatusCode: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("Device", deviceSchema);
