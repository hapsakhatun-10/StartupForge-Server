const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

module.exports = function (bookmarkCollection, startupCollection) {
    // GET /bookmark/:email — get bookmarked startup IDs
    router.get("/:email", async (req, res) => {
        try {
            const bookmarks = await bookmarkCollection
                .find({ userEmail: req.params.email })
                .toArray();
            const startupIds = bookmarks.map((b) => b.startupId);
            res.json(startupIds);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // GET /bookmark/:email/startups — get full startup docs
    router.get("/:email/startups", async (req, res) => {
        try {
            const bookmarks = await bookmarkCollection
                .find({ userEmail: req.params.email })
                .toArray();
            const startupIds = bookmarks.map((b) => new ObjectId(b.startupId));
            const startups = await startupCollection
                .find({ _id: { $in: startupIds } })
                .toArray();
            res.json(startups);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // POST /bookmark/toggle — toggle bookmark for a user
    router.post("/toggle", async (req, res) => {
        try {
            const { userEmail, startupId } = req.body;
            if (!userEmail || !startupId) {
                return res.status(400).json({ message: "Missing userEmail or startupId" });
            }
            const existing = await bookmarkCollection.findOne({ userEmail, startupId });
            if (existing) {
                await bookmarkCollection.deleteOne({ _id: existing._id });
                return res.json({ bookmarked: false });
            }
            await bookmarkCollection.insertOne({ userEmail, startupId, createdAt: new Date() });
            res.json({ bookmarked: true });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    return router;
};
