import mongoose from "mongoose";

const adminNumberSchema = new mongoose.Schema({
  number: { type: Number, required: true },
});

export default mongoose.model("AdminNumber", adminNumberSchema);
