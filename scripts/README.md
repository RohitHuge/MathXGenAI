# Migration Scripts

Scripts to help sync existing Appwrite users to Supabase genusers table.

## 🚨 Important: Update Appwrite API Key First!

Your Appwrite API key has expired. Before running these scripts:

1. Go to your Appwrite Console
2. Navigate to your project settings
3. Generate a new API key with appropriate permissions
4. Update `.env` file with the new key

## 📋 Preview User Data

See what data is available for a specific user:

```bash
node scripts/preview-user.js <appwrite_user_id>
```

**Example:**
```bash
node scripts/preview-user.js 68e67bfb003d1d074828
```

## 🔄 Migration Script

Sync existing Appwrite users to Supabase genusers table:

```bash
# Single user
node scripts/migrate-user.js 68e67bfb003d1d074828

# Multiple users
node scripts/migrate-user.js 68e67bfb003d1d074828 507f1f77bcf86cd799439011 abc123def456
```

### What Gets Synced:

The migration script syncs the following data:
- ✅ **Basic Info**: User ID, email, name
- ✅ **Contact**: Phone number (if available)
- ✅ **Verification**: Email and phone verification status
- ✅ **Labels**: User labels from Appwrite
- ✅ **Preferences**: Custom preferences stored in Appwrite
- ✅ **Status**: Account active/inactive status
- ✅ **Dates**: Registration date

### Features:

- **Upsert Logic**: Creates new records or updates existing ones
- **Batch Processing**: Sync multiple users at once
- **Error Handling**: Continues even if some users fail
- **Summary Report**: Shows success/failure count

## 📊 Database Schema Update

Before running the migration, update your Supabase genusers table:

```bash
# Run this in Supabase SQL Editor
# Copy contents from: database/schema-extended.sql
```

This adds optional columns for:
- `phone`
- `labels` (JSONB)
- `preferences` (JSONB)
- `email_verified`
- `phone_verified`
- `registration_date`
- `status`

## 🎯 Workflow

1. **Update API Key** in `.env`
2. **Run Schema Extension** in Supabase SQL Editor
3. **Preview a User** to see data structure
4. **Run Migration** for one or all users
5. **Verify** data in Supabase

## 💡 Tips

- Start with one user to test
- Check Supabase table after migration
- Review error messages if any users fail
- You can re-run the script (it uses upsert, so safe to run multiple times)
