import mongoose from "mongoose";

// ⚙️ Prevent model overwrite error
if (mongoose.models.Sms) {
  delete mongoose.models.Sms;
}

const smsSchema = new mongoose.Schema(
  {
    deviceId: { 
      type: String, 
      required: true,
      index: true,           // ✅ device uniqueId string
    },
    to: { 
      type: String, 
      required: true 
    },        // Receiver number
    body: { 
      type: String, 
      required: true 
    },       // Message content
    simSlot: { 
      type: Number, 
      enum: [0, 1], 
      required: true 
    },      // ✅ SIM slot info (0 or 1)
    sentAt: { 
      type: Date, 
      default: Date.now 
    }        // Timestamp of SMS
  },
  { timestamps: true }
);

export default mongoose.model("Sms", smsSchema);
