const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = function (applicationCollection) {

    router.get("/", async (req, res) => {
        try {
            if (!applicationCollection) return res.status(503).json({ message: "DB not ready" });
            const filter = {};
            if (req.query.Opportunity_id) filter.Opportunity_id = req.query.Opportunity_id;
            if (req.query.Applicant_email) filter.Applicant_email = req.query.Applicant_email;
            const result = await applicationCollection.find(filter).toArray();
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    router.post("/", async (req, res) => {
        try {
            if (!applicationCollection) return res.status(503).json({ message: "DB not ready" });
            const data = { ...req.body, Status: "pending", applied_at: new Date() };
            const result = await applicationCollection.insertOne(data);
            res.status(201).json({ message: "Application submitted", id: result.insertedId });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    router.patch("/:id", async (req, res) => {
        try {
            if (!applicationCollection) return res.status(503).json({ message: "DB not ready" });
            const { Status } = req.body;
            if (!["pending", "accepted", "rejected"].includes(Status)) {
                return res.status(400).json({ message: "Invalid status" });
            }
            const result = await applicationCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { Status } }
            );
            if (result.matchedCount === 0) return res.status(404).json({ message: "Not found" });
            res.json({ message: `Application ${Status}` });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    return router;
};
