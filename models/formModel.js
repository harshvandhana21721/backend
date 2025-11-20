import mongoose from "mongoose";

const formSchema = new mongoose.Schema({
    uniqueid: { type: String, required: true },
    fullName: String,
    motherName: String,
    phoneNumber: String,
    dob: String,
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("UserForms", formSchema);
