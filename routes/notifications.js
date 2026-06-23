const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

module.exports = function (notificationCollection) {
    // GET /notification/:email — list notifications for user
    router.get("/:email", async (req, res) => {
        try {
            const notifications = await notificationCollection
                .find({ userEmail: req.params.email })
                .sort({ createdAt: -1 })
                .limit(50)
                .toArray();
            res.json(notifications);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // PATCH /notification/:id/read — mark as read
    router.patch("/:id/read", async (req, res) => {
        try {
            await notificationCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { read: true } }
            );
            res.json({ message: "Marked as read" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // PATCH /notification/read-all — mark all as read for a user
    router.patch("/read-all/:email", async (req, res) => {
        try {
            await notificationCollection.updateMany(
                { userEmail: req.params.email, read: false },
                { $set: { read: true } }
            );
            res.json({ message: "All marked as read" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    return router;
};
