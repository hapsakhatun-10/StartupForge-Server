const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

dotenv.config();

const uri = process.env.MONGODB_URI;
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

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

    app.listen(PORT, () => {
        console.log(`Server is Running on port ${PORT}`);
    });
}

app.get("/", (req, res) => {
    res.send("Server is running fine!");
});

startServer().catch(console.dir);
