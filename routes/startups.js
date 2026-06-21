const express = require('express');
const router = express.Router();

module.exports = function (startupCollection) {

    router.get("/", async (req, res) => {
        try {
            if (!startupCollection) {
                return res.status(503).json({ message: "DB not ready" });
            }
            const result = await startupCollection.find().toArray();
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    router.post("/", async (req, res) => {
        try {
            if (!startupCollection) {
                return res.status(503).json({ message: "DB not ready" });
            }
            const startupData = req.body;
            console.log(startupData);
            const result = await startupCollection.insertOne(startupData);
            res.status(201).json({ message: "Startup created", id: result.insertedId });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });












    return router;
};
