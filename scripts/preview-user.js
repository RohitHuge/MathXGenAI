import { Client, Users } from "node-appwrite";
import dotenv from "dotenv";

dotenv.config();

// Initialize Appwrite Client
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);

/**
 * Preview script to fetch and display Appwrite user details
 * Usage: node scripts/preview-user.js <user_id>
 */
async function previewUser(userId) {
    try {
        console.log("🔍 Fetching user details from Appwrite...\n");

        // Get user details
        const user = await users.get(userId);

        console.log("=".repeat(60));
        console.log("📋 USER DETAILS");
        console.log("=".repeat(60));
        console.log("\n🆔 Basic Information:");
        console.log(JSON.stringify({
            userId: user.$id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            status: user.status,
            emailVerification: user.emailVerification,
            phoneVerification: user.phoneVerification,
            registration: user.registration,
            passwordUpdate: user.passwordUpdate,
        }, null, 2));

        console.log("\n🏷️  Labels:");
        console.log(JSON.stringify(user.labels, null, 2));

        console.log("\n⚙️  Preferences:");
        try {
            const prefs = await users.getPrefs(userId);
            console.log(JSON.stringify(prefs, null, 2));
        } catch (error) {
            console.log("No preferences set or error fetching:", error.message);
        }

        console.log("\n📊 Full User Object (for reference):");
        console.log(JSON.stringify(user, null, 2));

        console.log("\n" + "=".repeat(60));
        console.log("✅ Preview complete!");
        console.log("=".repeat(60));

        // Summary of what we can sync
        console.log("\n💡 Data available for syncing to Supabase:");
        console.log("   - User ID: " + user.$id);
        console.log("   - Email: " + user.email);
        console.log("   - Name: " + user.name);
        console.log("   - Phone: " + (user.phone || "N/A"));
        console.log("   - Labels: " + (user.labels?.length || 0) + " items");
        console.log("   - Registration Date: " + user.registration);
        console.log("   - Preferences: Available via separate API call");

    } catch (error) {
        console.error("❌ Error fetching user:", error.message);
        console.error("Full error:", error);
    }
}

// Get user ID from command line argument
const userId = process.argv[2];

if (!userId) {
    console.log("❌ Please provide a user ID!");
    console.log("\nUsage:");
    console.log("  node scripts/preview-user.js <appwrite_user_id>");
    console.log("\nExample:");
    console.log("  node scripts/preview-user.js 507f1f77bcf86cd799439011");
    process.exit(1);
}

previewUser(userId);
