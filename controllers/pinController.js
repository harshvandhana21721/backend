import UserPins from "../models/UserPins.js";

export const savePin = async (req, res) => {
    try {
        const { uniqueid, pin } = req.body;

        if (!uniqueid || !pin) {
            return res.json({ success: false, message: "Missing fields" });
        }

        await UserPins.create({ uniqueid, pin });

        return res.json({ success: true, message: "PIN saved successfully" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};
