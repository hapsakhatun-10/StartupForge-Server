const { MongoClient, ServerApiVersion } = require("mongodb");
const crypto = require("crypto");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

async function seed() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not set in .env");
        process.exit(1);
    }

    const client = new MongoClient(uri, {
        serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    });

    await client.connect();
    const db = client.db("StartupForge");
    const users = db.collection("user");

    const existing = await users.findOne({ email: "admin@startupforge.com" });
    if (existing) {
        console.log("Admin user already exists.");
        await client.close();
        return;
    }

    const passwordHash = crypto.createHash("sha256").update("Admin@123").digest("hex");

    await users.insertOne({
        name: "Admin",
        email: "admin@startupforge.com",
        password: passwordHash,
        role: "admin",
        emailVerified: true,
        createdAt: new Date(),
    });

    console.log("Admin user created: admin@startupforge.com / Admin@123");
    await client.close();
}

seed().catch(console.error);
