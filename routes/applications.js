const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = function (applicationCollection, notificationCollection, opportunityCollection, userCollection) {

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

    // GET /application/match/:opportunity_id/:email — calculate skill match %
    router.get("/match/:opportunity_id/:email", async (req, res) => {
        try {
            const [user, opportunity] = await Promise.all([
                userCollection.findOne({ email: req.params.email }),
                opportunityCollection.findOne({ _id: new ObjectId(req.params.opportunity_id) }),
            ]);
            if (!user || !opportunity) {
                return res.json({ matchPercentage: 0, matchedSkills: [], missingSkills: [] });
            }
            const userSkills = (user.skills || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
            const requiredSkills = (opportunity.required_skills || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
            if (requiredSkills.length === 0) return res.json({ matchPercentage: 100, matchedSkills: [], missingSkills: [] });
            const matchedSkills = userSkills.filter((s) => requiredSkills.includes(s));
            const missingSkills = requiredSkills.filter((s) => !userSkills.includes(s));
            const matchPercentage = Math.round((matchedSkills.length / requiredSkills.length) * 100);
            res.json({ matchPercentage, matchedSkills, missingSkills, userSkills: userSkills, requiredSkills: requiredSkills });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    return router;
};
