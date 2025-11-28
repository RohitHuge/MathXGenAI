import { Client, Users } from "node-appwrite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Initialize Appwrite Client
const appwriteClient = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(appwriteClient);

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Sync a single user from Appwrite to Supabase genusers table
 */
async function syncUserToSupabase(userId) {
    try {
        console.log(`\n🔍 Fetching user ${userId} from Appwrite...`);

        // Get user details from Appwrite
        const user = await users.get(userId);

        console.log(`✅ Found user: ${user.name} (${user.email})`);

        // Get user preferences
        let preferences = {};
        try {
            preferences = await users.getPrefs(userId);
            console.log(`📋 Preferences found:`, Object.keys(preferences).length, "items");
        } catch (error) {
            console.log(`⚠️  No preferences or error fetching: ${error.message}`);
        }

        // Prepare data for Supabase - extract phone and rollno from preferences
        const supabaseData = {
            appwrite_user_id: user.$id,
            email: user.email,
            name: user.name,
            phone: preferences.phone || user.phone || null,
            rollno: preferences.rollno || null,
            labels: user.labels || [],
            preferences: preferences,
            email_verified: user.emailVerification,
            phone_verified: user.phoneVerification,
            registration_date: user.registration,
            status: user.status,
            updated_at: new Date().toISOString(),
        };

        console.log(`💾 Syncing to Supabase genusers table...`);

        // Upsert to Supabase (insert or update if exists)
        const { data, error } = await supabase
            .from("genusers")
            .upsert(supabaseData, {
                onConflict: "appwrite_user_id",
            })
            .select()
            .single();

        if (error) {
            console.error(`❌ Error syncing to Supabase:`, error);
            throw error;
        }

        console.log(`✅ Successfully synced user to Supabase!`);
        console.log(`   - Supabase ID: ${data.id}`);
        console.log(`   - Email: ${data.email}`);
        console.log(`   - Name: ${data.name}`);
        if (data.phone) console.log(`   - Phone: ${data.phone}`);
        if (data.rollno) console.log(`   - Roll No: ${data.rollno}`);

        return data;

    } catch (error) {
        console.error(`❌ Error syncing user ${userId}:`, error.message);
        throw error;
    }
}

/**
 * Sync multiple users by providing their IDs
 */
async function syncMultipleUsers(userIds) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🚀 Starting migration of ${userIds.length} users`);
    console.log(`${"=".repeat(60)}`);

    const results = {
        success: [],
        failed: [],
    };

    for (const userId of userIds) {
        try {
            await syncUserToSupabase(userId);
            results.success.push(userId);
        } catch (error) {
            results.failed.push({ userId, error: error.message });
        }
    }

    // Summary
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📊 MIGRATION SUMMARY`);
    console.log(`${"=".repeat(60)}`);
    console.log(`✅ Successfully synced: ${results.success.length} users`);
    console.log(`❌ Failed: ${results.failed.length} users`);

    if (results.failed.length > 0) {
        console.log(`\n❌ Failed users:`);
        results.failed.forEach(({ userId, error }) => {
            console.log(`   - ${userId}: ${error}`);
        });
    }

    console.log(`\n✅ Migration complete!`);
    return results;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║         Appwrite to Supabase User Migration Script        ║
╚════════════════════════════════════════════════════════════╝

Usage:
  node scripts/migrate-user.js <user_id> [user_id2] [user_id3] ...

Examples:
  # Sync single user
  node scripts/migrate-user.js 68e67bfb003d1d074828

  # Sync multiple users
  node scripts/migrate-user.js 68e67bfb003d1d074828 507f1f77bcf86cd799439011

What this script does:
  1. Fetches user data from Appwrite (including preferences)
  2. Extracts phone and rollno from preferences
  3. Syncs to Supabase genusers table
  4. Handles upsert (creates or updates existing records)

Data synced:
  ✓ Basic info (email, name)
  ✓ Phone (from preferences or user object)
  ✓ Roll number (from preferences)
  ✓ Labels
  ✓ Full preferences JSON
  ✓ Verification status
  ✓ Registration date

Before running:
  ✓ Ensure your .env file has valid credentials
  ✓ Run database/schema-extended.sql in Supabase
  ✓ Appwrite API key must have 'users.read' scope
`);
    process.exit(0);
}

// Run migration
syncMultipleUsers(args)
    .then(() => {
        console.log("\n🎉 All done!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Fatal error:", error);
        process.exit(1);
    });
