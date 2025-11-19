import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  password: {
    type: String,
    required: true,
  }
});

export default mongoose.model("User", userSchema);
