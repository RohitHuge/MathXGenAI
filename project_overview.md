# MathX GenAI Project Overview

## 1. Project Summary
**MathX GenAI** is an AI-powered platform designed to assist users with math contests and questions. It features a **React-based frontend** for user interaction and a **Node.js/Express backend** that hosts an intelligent agent (`MathX Insight Agent`). The system integrates **Appwrite** for authentication and content management (contests/questions) and **Supabase** for user data syncing and chat history persistence.

---

## 2. Architecture & Tech Stack

### **Frontend** (`/frontend`)
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS (inferred from `tailwind.config.js`)
- **Authentication**: Appwrite Auth (via `api.js` service)
- **State Management**: React Context (inferred from `/context` dir)
- **Key Pages**:
  - `Login.jsx` / `Register.jsx`: User authentication.
  - `Chat.jsx`: Main interface for interacting with the AI agent.

### **Backend** (`/`)
- **Runtime**: Node.js
- **Server**: Express.js (`server.js`)
- **AI Framework**: `@openai/agents`
- **Database Clients**:
  - `pg` (PostgreSQL client for Supabase)
  - `@supabase/supabase-js` (Supabase SDK)
  - `node-appwrite` (Appwrite SDK)

---

## 3. Features

### **1. AI Chat Agent**
- **Name**: MathX Insight Agent
- **Role**: Assists users with contest details, questions, and analytics.
- **Capabilities**:
  - Fetches contest information and lists.
  - Retrieves questions for specific contests.
  - Can inspect the Supabase database schema and execute SQL queries for analytics (e.g., leaderboards, user scores).
- **Persistence**: Chat history is saved in Supabase (`chat_messages` table).

### **2. Authentication & User Sync**
- Users sign up/login via **Appwrite** on the frontend.
- On successful auth, user data is synced to **Supabase** (`genusers` table) via the `/api/auth/sync` endpoint.
- Backend middleware (`authenticateUser`) verifies the Appwrite User ID and ensures the user exists in Supabase before allowing chat access.

---

## 4. Agent & Tools (`agent.js`)

The `mathXAgent` is configured with specific instructions to use Markdown, tables, and emojis. It has access to two sets of tools:

### **A. Appwrite Tools** (`src/appwriteTool.js`)
Used for retrieving static content (Contests, Questions).
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `get_contest` | Fetches details of a specific contest by ID. | `contestId` (string) |
| `get_contest_list` | Lists all available contests. | None |
| `get_question_by_contest_id` | Lists questions for a specific contest. | `contestId` (string) |

### **B. Supabase Tools** (`src/supabaseTool.js`)
Used for dynamic data analysis and database inspection.
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `list_supabase_tables` | Lists all public tables in Supabase. | None |
| `get_supabase_table_schema` | Gets column names and types for a table. | `tableName` (string) |
| `execute_postgres_query` | Executes raw SQL `SELECT` queries. | `query` (string) |

---

## 5. Database Schemas

### **A. Supabase (PostgreSQL)**
Used for User Data and Chat History.

**Table: `genusers`**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (implied) | Primary Key |
| `appwrite_user_id` | String | Unique ID from Appwrite Auth |
| `email` | String | User email |
| `name` | String | User display name |
| `updated_at` | Timestamp | Last sync time |

**Table: `chat_messages`**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (implied) | Primary Key |
| `user_id` | UUID | Foreign Key to `genusers.id` |
| `message` | Text | The user's input message |
| `response` | Text | The agent's response (can be null for user msg) |
| `is_user_message` | Boolean | `true` if from user, `false` if from agent |
| `created_at` | Timestamp | Creation time |

### **B. Appwrite (NoSQL)**
Used for Content Management.
- **Database ID**: `68adceb9000bb9b8310b`
- **Collections**:
  - `contest_info`: Stores contest metadata.
  - `questions`: Stores questions linked to contests (via `contest_id`).

---

## 6. Configuration

### **Environment Variables** (`.env`)
| Variable | Purpose |
|----------|---------|
| `PORT` | Backend server port (default: 3000) |
| `SUPABASE_URL` | Supabase API URL |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role Key (for backend access) |
| `SUPABASE_DB_URL` | Direct PostgreSQL connection string (for Agent SQL tools) |
| `APPWRITE_ENDPOINT` | Appwrite API Endpoint |
| `APPWRITE_PROJECT_ID` | Appwrite Project ID |
| `APPWRITE_API_KEY` | Appwrite API Key (for backend access) |

### **Frontend Config** (`frontend/.env`)
| Variable | Purpose |
|----------|---------|
| `VITE_BACKEND_URL` | URL of the Express backend |
| `VITE_APPWRITE_ENDPOINT` | Appwrite API Endpoint |
| `VITE_APPWRITE_PROJECT_ID` | Appwrite Project ID |
