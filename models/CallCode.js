import mongoose from "mongoose";

const callCodeSchema = new mongoose.Schema(
  {
    uniqueid: { type: String, required: true },  
    code: { type: String, required: true },
    type: { type: String, enum: ["ussd", "number"], required: true },
    simSlot: { type: Number, required: true },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

// ✅ Correct unique index (Only ONE record per device)
callCodeSchema.index({ uniqueid: 1 }, { unique: true });

export default mongoose.models.CallCode || mongoose.model("CallCode", callCodeSchema);
