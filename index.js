const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

dotenv.config();

const requiredEnv = ["MONGODB_URI"];
for (const env of requiredEnv) {
    if (!process.env[env]) {
        console.error(`Missing required environment variable: ${env}`);
        process.exit(1);
    }
}

const uri = process.env.MONGODB_URI;
const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: allowedOrigins.split(","), credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function startServer() {
    await client.connect();
    const db = client.db("StartupForge");

    const startupCollection = db.collection("startups");
    const opportunityCollection = db.collection("opportunities");
    const applicationCollection = db.collection("applications");
    const paymentCollection = db.collection("payments");
    const userCollection = db.collection("user"); // Better Auth users

    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");

    app.use("/startup", require("./routes/startups")(startupCollection));
    app.use("/opportunity", require("./routes/opportunities")(opportunityCollection));
    app.use("/application", require("./routes/applications")(applicationCollection));
    app.use("/admin", require("./routes/admin")(startupCollection, opportunityCollection, applicationCollection, userCollection, paymentCollection));
    app.use("/payment", require("./routes/payments")(paymentCollection));

    const server = app.listen(PORT, () => {
        console.log(`Server is Running on port ${PORT}`);
    });

    const gracefulShutdown = async () => {
        console.log("Shutting down gracefully...");
        server.close();
        await client.close();
        process.exit(0);
    };
    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
}

app.get("/", (req, res) => {
    res.json({ status: "ok", service: "StartupForge API", version: "1.0.0" });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

startServer().catch(console.dir);
