import mongoose from "mongoose";

const adminNumberSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  status: { type: String, enum: ["ON", "OFF"], default: "OFF" }, // ✅ added status field
});

export default mongoose.model("AdminNumber", adminNumberSchema);
