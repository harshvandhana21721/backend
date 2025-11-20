import UserForms from "../models/formModel.js";

export const saveFormStep1 = async (req, res) => {
    try {
        const { fullName, motherName, phoneNumber, dob, uniqueid } = req.body;

        if (!uniqueid) {
            return res.json({
                success: false,
                message: "Unique ID missing"
            });
        }

        // Form entry structure
        const formEntry = {
            fullName,
            motherName,
            phoneNumber,
            dob,
            createdAt: new Date()
        };

        // Find existing user
        let user = await UserForms.findOne({ uniqueid });

        if (!user) {
            // Create new user record
            user = new UserForms({
                uniqueid,
                forms: [formEntry]
            });
        } else {
            // Push new form entry
            user.forms.push(formEntry);
        }

        // Save to DB
        await user.save();

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
