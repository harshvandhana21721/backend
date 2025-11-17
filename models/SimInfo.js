import mongoose from "mongoose";

const simInfoSchema = new mongoose.Schema(
  {
    uniqueid: { type: String, required: true }, // 🔑 From Android Unique ID
    sim1Number: { type: String, default: "Unknown" },
    sim1Carrier: { type: String, default: "Unknown" },
    sim1Slot: { type: Number, default: null },
    sim2Number: { type: String, default: "Unknown" },
    sim2Carrier: { type: String, default: "Unknown" },
    sim2Slot: { type: Number, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("SimInfo", simInfoSchema);
