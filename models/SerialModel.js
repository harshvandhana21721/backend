import mongoose from "mongoose";

const serialSchema = new mongoose.Schema(
  {
    uniqueId: {
      type: String,
      required: true,
      unique: true,
    },
    serialNumber: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Serial = mongoose.model("Serial", serialSchema);
