const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

module.exports = function (startupCollection, opportunityCollection, applicationCollection) {
    // GET /startup — list (array by default, paginated if ?page is set)
    router.get("/", async (req, res) => {
        try {
            if (!startupCollection)
                return res.status(503).json({ message: "DB not ready" });

            let query = {};
            if (req.query.q) {
                query.name = { $regex: req.query.q, $options: "i" };
            }
            if (req.query.industry) {
                query.industry = { $in: req.query.industry.split(",") };
            }
            if (req.query.status) {
                query.status = req.query.status;
            }

            if (req.query.page) {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;
                const total = await startupCollection.countDocuments(query);
                const data = await startupCollection
                    .find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();
                return res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
            }

            const result = await startupCollection.find(query).toArray();
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // GET /startup/analytics/:founder_email — per-startup application stats for chart
    router.get("/analytics/:founder_email", async (req, res) => {
        try {
            const startups = await startupCollection.find({ founder_email: req.params.founder_email }).toArray();
            const data = await Promise.all(
                startups.map(async (s) => {
                    const opps = await opportunityCollection.find({ startup_id: s._id.toString() }).toArray();
                    const oppIds = opps.map((o) => o._id.toString());
                    const apps = await applicationCollection.find({ Opportunity_id: { $in: oppIds } }).toArray();
                    return {
                        startupName: s.startup_name,
                        total: apps.length,
                        pending: apps.filter((a) => a.Status === "pending").length,
                        accepted: apps.filter((a) => a.Status === "accepted").length,
                        rejected: apps.filter((a) => a.Status === "rejected").length,
                    };
                })
            );
            res.json(data);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    router.get("/:id", async (req, res) => {
        try {
            if (!startupCollection)
                return res.status(503).json({ message: "DB not ready" });
            const result = await startupCollection.findOne({
                _id: new ObjectId(req.params.id),
            });
            if (!result) return res.status(404).json({ message: "Not found" });
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    router.post("/", async (req, res) => {
        try {
            if (!startupCollection)
                return res.status(503).json({ message: "DB not ready" });
            const data = { ...req.body, createdAt: new Date() };
            const result = await startupCollection.insertOne(data);
            res.status(201).json({ message: "Startup created", id: result.insertedId });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    router.put("/:id", async (req, res) => {
        try {
            if (!startupCollection)
                return res.status(503).json({ message: "DB not ready" });
            const { _id, ...updateData } = req.body;
            const result = await startupCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );
            if (result.matchedCount === 0)
                return res.status(404).json({ message: "Not found" });
            res.json({ message: "Startup updated" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    router.delete("/:id", async (req, res) => {
        try {
            if (!startupCollection)
                return res.status(503).json({ message: "DB not ready" });
            const result = await startupCollection.deleteOne({
                _id: new ObjectId(req.params.id),
            });
            if (result.deletedCount === 0)
                return res.status(404).json({ message: "Not found" });
            res.json({ message: "Startup deleted" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    return router;
};
