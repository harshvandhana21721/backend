import ActionLog from "../models/ActionLog.js";

export const saveLog = async (req, res) => {
    try {
        const log = new ActionLog(req.body);
        await log.save();

        res.json({ success: true, log });
    } catch (err) {
        console.error("SAVE LOG ERROR:", err);
        res.status(500).json({ success: false, error: "Server Error" });
    }
};

export const getLogs = async (req, res) => {
    try {
        const logs = await ActionLog.find({ uniqueid: req.params.uniqueid })
            .sort({ createdAt: -1 });

        res.json({ success: true, logs });
    } catch (err) {
        console.error("GET LOGS ERROR:", err);
        res.status(500).json({ success: false });
    }
};
