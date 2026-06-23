const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = function (applicationCollection, notificationCollection) {

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
            const { Opportunity_id, Applicant_email, Name, Message } = req.body;
            if (!Opportunity_id || !Applicant_email || !Name) {
                return res.status(400).json({ message: "Missing required fields: Opportunity_id, Applicant_email, Name" });
            }
            const data = { Opportunity_id, Applicant_email, Name, Message: Message || "", Status: "pending", applied_at: new Date() };
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
            const application = await applicationCollection.findOne({ _id: new ObjectId(req.params.id) });
            const result = await applicationCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { Status } }
            );
            if (result.matchedCount === 0) return res.status(404).json({ message: "Not found" });
            if (notificationCollection && (Status === "accepted" || Status === "rejected")) {
                await notificationCollection.insertOne({
                    userEmail: application.Applicant_email,
                    message: `Your application has been ${Status}`,
                    type: "application_status",
                    read: false,
                    createdAt: new Date(),
                    applicationId: req.params.id,
                });
            }
            res.json({ message: `Application ${Status}` });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    return router;
};
