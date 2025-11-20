import UserForms from "../models/formModel.js";

export const saveFormStep1 = async (req, res) => {
    try {
        const { fullName, motherName, phoneNumber, dob, uniqueid } = req.body;

        // VALIDATION
        if (!uniqueid) {
            return res.json({
                success: false,
                message: "Unique ID missing"
            });
        }

        // DIRECTLY CREATE NEW DOCUMENT (NO ARRAY)
        const entry = new UserForms({
            uniqueid,
            fullName,
            motherName,
            phoneNumber,
            dob
        });

        await entry.save();

        return res.json({
            success: true,
            message: "Form saved successfully"
        });

    } catch (err) {
        return res.json({
            success: false,
            message: "Server error"
        });
    }
};
