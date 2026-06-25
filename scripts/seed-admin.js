/**
 * Seed script for the admin user.
 *
 * NOTE: This script no longer inserts directly into MongoDB (Better Auth
 * manages the user collection and uses its own password hashing). Instead,
 * it makes an HTTP request to the Next.js setup endpoint, which creates
 * the admin via Better Auth's API with proper password hashing.
 *
 * Usage:
 *   1. Start the client dev server: npm run dev (in startup-forge-client)
 *   2. Run this script:          node scripts/seed-admin.js
 */

const http = require("http");

async function seed() {
    const res = await new Promise((resolve, reject) => {
        http.get("http://localhost:3000/api/setup/seed", (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve({ status: res.statusCode, body: data }));
        }).on("error", reject);
    });

    const json = JSON.parse(res.body);
    console.log(`[${res.status}] ${json.message || json.error}`);

    if (json.message) {
        console.log("\nLog in at http://localhost:3000/login");
    }
}

seed().catch((err) => {
    console.error("Failed to seed admin. Is the client dev server running on port 3000?");
    console.error(err);
    process.exit(1);
});
