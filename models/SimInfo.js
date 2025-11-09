import mongoose from "mongoose";

const simInfoSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    simSlot: Number,
    carrierName: String,
    countryIso: String,
    number: String
  },
  { timestamps: true }
);

export default mongoose.model("SimInfo", simInfoSchema);
