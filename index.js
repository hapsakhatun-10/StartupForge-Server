const express = require('express')
const dotenv = require('dotenv')
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');

dotenv.config()

const uri = process.env.MONGODB_URI
const app = express()
const PORT = process.env.PORT

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let startupCollection;

async function startServer() {
    await client.connect();
    const db = client.db("StartupForge");
    startupCollection = db.collection("startups");
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const startupRoutes = require('./routes/startups')(startupCollection);
    app.use("/startup", startupRoutes);

    app.listen(PORT, () => {
        console.log(`Server is Running on port ${PORT}`)
    });
}

app.get('/', (req, res) => {
    res.send("Server is running fine!")
});

startServer().catch(console.dir);
