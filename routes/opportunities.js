const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

module.exports = function (opportunityCollection) {
    // GET /opportunity — list (array by default, paginated if ?page is set)
    router.get("/", async (req, res) => {
        try {
            if (!opportunityCollection)
                return res.status(503).json({ message: "DB not ready" });

            const filter = {};
            if (req.query.startup_id) filter.startup_id = req.query.startup_id;

            // if page param is provided, return paginated
            if (req.query.page) {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;
                const total = await opportunityCollection.countDocuments(filter);
                const data = await opportunityCollection
                    .find(filter)
                    .skip(skip)
                    .limit(limit)
                    .toArray();
                return res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
            }

            // otherwise return full array (backward compatible)
            const result = await opportunityCollection.find(filter).toArray();
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // GET /opportunity/search — search by role_title and required_skills ($regex)
    router.get("/search", async (req, res) => {
        try {
            if (!opportunityCollection)
                return res.status(503).json({ message: "DB not ready" });

            const q = req.query.q || "";
            if (!q.trim()) {
                const data = await opportunityCollection.find({}).toArray();
                return res.json(data);
            }

            const regex = new RegExp(q, "i");
            const filter = {
                $or: [
                    { role_title: { $regex: regex } },
                    { required_skills: { $regex: regex } },
                ],
            };

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const total = await opportunityCollection.countDocuments(filter);
            const data = await opportunityCollection
                .find(filter)
                .skip(skip)
                .limit(limit)
                .toArray();

            res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // GET /opportunity/filter — filter by work_type ($in)
    router.get("/filter", async (req, res) => {
        try {
            if (!opportunityCollection)
                return res.status(503).json({ message: "DB not ready" });

            const filter = {};

            if (req.query.work_type) {
                const types = req.query.work_type.split(",").map((t) => t.trim());
                filter.work_type = { $in: types };
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const total = await opportunityCollection.countDocuments(filter);
            const data = await opportunityCollection
                .find(filter)
                .skip(skip)
                .limit(limit)
                .toArray();

            res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // GET /opportunity/count — total count
    router.get("/count", async (req, res) => {
        try {
            const total = await opportunityCollection.countDocuments({});
            res.json({ total });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    router.get("/:id", async (req, res) => {
        try {
            if (!opportunityCollection)
                return res.status(503).json({ message: "DB not ready" });
            const result = await opportunityCollection.findOne({
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
            if (!opportunityCollection)
                return res.status(503).json({ message: "DB not ready" });
            const data = { ...req.body, createdAt: new Date() };
            const result = await opportunityCollection.insertOne(data);
            res
                .status(201)
                .json({ message: "Opportunity created", id: result.insertedId });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    router.put("/:id", async (req, res) => {
        try {
            if (!opportunityCollection)
                return res.status(503).json({ message: "DB not ready" });
            const { _id, ...updateData } = req.body;
            const result = await opportunityCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );
            if (result.matchedCount === 0)
                return res.status(404).json({ message: "Not found" });
            res.json({ message: "Opportunity updated" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    router.delete("/:id", async (req, res) => {
        try {
            if (!opportunityCollection)
                return res.status(503).json({ message: "DB not ready" });
            const result = await opportunityCollection.deleteOne({
                _id: new ObjectId(req.params.id),
            });
            if (result.deletedCount === 0)
                return res.status(404).json({ message: "Not found" });
            res.json({ message: "Opportunity deleted" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    return router;
};
