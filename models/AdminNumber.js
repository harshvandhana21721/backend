// models/AdminNumber.js
import mongoose from "mongoose";

const adminNumberSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, trim: true },

    status: { type: String, enum: ["ON", "OFF"], default: "OFF" },
  },
  { timestamps: true }
);

export default mongoose.model("AdminNumber", adminNumberSchema);
