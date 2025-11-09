import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
  {
    uniqueid: {
      type: String,
      required: true,
      trim: true,
    },
    connectivity: {
      type: String,
      enum: ["Online", "Offline"],
      default: "Offline",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const StatusModel = mongoose.model("DeviceStatus", statusSchema);
export default StatusModel;
