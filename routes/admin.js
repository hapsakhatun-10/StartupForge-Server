const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

module.exports = function (startupCollection, opportunityCollection, applicationCollection, userCollection, paymentCollection) {

    // Middleware: verify admin via Better Auth session stored in DB
    router.use(async (req, res, next) => {
        const email = req.headers["x-user-email"];
        if (!email) return res.status(401).json({ message: "Access denied. No email header." });
        const user = await userCollection.findOne({ email });
        if (!user || user.role !== "admin") return res.status(403).json({ message: "Access denied. Not an admin." });
        req.adminUser = user;
        next();
    });

    // GET /admin/stats — overview counts
    router.get("/stats", async (req, res) => {
        try {
            const totalUsers = await userCollection.countDocuments({});
            const totalStartups = await startupCollection.countDocuments({});
            const totalOpportunities = await opportunityCollection.countDocuments({});
            const payments = await paymentCollection.find({}).toArray();
            const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

            res.json({
                totalUsers,
                totalStartups,
                totalOpportunities,
                totalRevenue,
                totalPayments: payments.length,
            });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // GET /admin/users — list all users
    router.get("/users", async (req, res) => {
        try {
            const users = await userCollection
                .find({}, { projection: { password: 0 } })
                .toArray();
            res.json(users);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // PATCH /admin/users/:id/block
    router.patch("/users/:id/block", async (req, res) => {
        try {
            await userCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { isBlocked: true } }
            );
            res.json({ message: "User blocked" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // PATCH /admin/users/:id/unblock
    router.patch("/users/:id/unblock", async (req, res) => {
        try {
            await userCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { isBlocked: false } }
            );
            res.json({ message: "User unblocked" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // GET /admin/startups — list all startups for admin
    router.get("/startups", async (req, res) => {
        try {
            const startups = await startupCollection.find({}).toArray();
            res.json(startups);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // PATCH /admin/startups/:id/approve
    router.patch("/startups/:id/approve", async (req, res) => {
        try {
            await startupCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { status: "active", approved: true } }
            );
            res.json({ message: "Startup approved" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // DELETE /admin/startups/:id — remove startup
    router.delete("/startups/:id", async (req, res) => {
        try {
            await startupCollection.deleteOne({ _id: new ObjectId(req.params.id) });
            res.json({ message: "Startup removed" });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    // GET /admin/transactions — all payments
    router.get("/transactions", async (req, res) => {
        try {
            const payments = await paymentCollection
                .find({})
                .sort({ paid_at: -1 })
                .toArray();
            res.json(payments);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    });

    return router;
};
