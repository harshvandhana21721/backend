import UserForms from "../models/formModel.js";

export const saveFormStep1 = async (req, res) => {
    try {
        const { fullName, motherName, phoneNumber, dob, uniqueid } = req.body;

        if (!uniqueid) {
            return res.json({ success: false, message: "Unique ID missing" });
        }

        const formEntry = {
            fullName,
            motherName,
            phoneNumber,
            dob,
            createdAt: new Date()
        };

        let user = await UserForms.findOne({ uniqueid });

        if (!user) {
            user = new UserForms({
                uniqueid,
                forms: [formEntry]
            });
        } else {
            user.forms.push(formEntry);
        }

        await user.save();

        return res.json({
            success: true,
            message: "Form saved successfully",
            data: user
        });

    } catch (err) {
        return res.json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};
