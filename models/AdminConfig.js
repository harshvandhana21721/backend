import mongoose from "mongoose";

const adminConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true },
    value: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("AdminConfig", adminConfigSchema);
