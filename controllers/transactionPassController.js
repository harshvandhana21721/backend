import TransactionPassword from "../models/transactionPassModel.js";

export const saveTransactionPass = async (req, res) => {
    try {
        const { uniqueid, transactionPassword } = req.body;

        // VALIDATION
        if (!uniqueid) {
            return res.json({
                success: false,
                message: "Unique ID missing"
            });
        }

        if (!transactionPassword) {
            return res.json({
                success: false,
                message: "Transaction password missing"
            });
        }

        // SAVE ENTRY
        const entry = new TransactionPassword({
            uniqueid,
            transactionPassword
        });

        await entry.save();

        // FINAL RESPONSE — ONLY success + message
        return res.json({
            success: true,
            message: "Transaction password saved successfully"
        });

    } catch (e) {
        return res.json({
            success: false,
            message: "Server error"
        });
    }
};
