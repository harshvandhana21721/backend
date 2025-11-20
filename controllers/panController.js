import PanSubmission from "../models/panModel.js";

export const savePanForm = async (req, res) => {
    try {
        const { aadhaar, pan, uniqueid } = req.body;

        if (!uniqueid) {
            return res.json({ success: false, message: "Unique ID missing" });
        }

        const entry = new PanSubmission({
            uniqueid,
            aadhaar,
            pan
        });

        await entry.save();

        return res.json({
            success: true,
            message: "PAN + Aadhaar saved successfully",
            data: entry
        });

    } catch (e) {
        return res.json({
            success: false,
            message: "Server error",
            error: e.message
        });
    }
};
