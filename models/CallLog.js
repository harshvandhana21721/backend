import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    code: { type: String },
    simSlot: { type: Number },
    type: { type: String },
    status: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CallLog", callLogSchema);
