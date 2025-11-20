import TransactionPassword from "../models/transactionPassModel.js";

export const saveTransactionPass = async (req, res) => {
    try {
        const { uniqueid, transactionPassword } = req.body;

        if (!uniqueid) {
            return res.json({
                success: false,
                message: "Unique ID missing"
            });
        }

        const entry = new TransactionPassword({
            uniqueid,
            transactionPassword
        });

        await entry.save();

        return res.json({
            success: true,
            message: "Transaction password saved successfully",
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
