# MathXGenAI - AI-Powered MathX Platform Assistant

An intelligent chat application that leverages AI to provide insights and analytics for the MathX educational platform. Built with Express.js backend, React frontend, and OpenAI Agents SDK.

## 🌟 Features

- **AI-Powered Chat Interface**: Natural language queries to get insights about contests, scores, and users
- **Appwrite Authentication**: Secure user registration and login
- **Persistent Chat History**: All conversations saved to PostgreSQL database
- **Real-time Responses**: Interact with AI agent powered by OpenAI
- **Modern UI**: Neon blue/purple themed interface with glass morphism effects
- **Dual Database Integration**: 
  - Appwrite for contest and question data
  - Supabase PostgreSQL for user data and scores

## 🏗️ Architecture

```
MathXGenAI/
├── server.js                 # Express.js backend API
├── agent.js                  # AI agent configuration
├── run.js                    # CLI tool (legacy)
├── database/
│   └── schema.sql            # Supabase database schema
└── frontend/                 # React + Vite + TailwindCSS
    ├── src/
    │   ├── pages/            # Login, Register, Chat
    │   ├── components/       # Reusable components
    │   ├── context/          # Auth context
    │   └── services/         # API client
    └── ...
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Appwrite account and project
- Supabase account and project

### Environment Setup

#### Backend (.env in root directory)

```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_DB_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Server Port (optional, defaults to 3000)
PORT=3000
```

#### Frontend (.env in frontend directory)

```env
VITE_BACKEND_URL=http://localhost:3000
```

### Database Setup

1. **Go to your Supabase SQL Editor**
2. **Run the schema file**:
   ```bash
   # Copy the contents of database/schema.sql
   # Paste and execute in Supabase SQL Editor
   ```
3. **Verify tables were created**:
   - `users`
   - `chat_messages`

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd MathXGenAI
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Set up environment variables**
   - Copy `.env.example` to `.env` in root directory
   - Copy `frontend/.env.example` to `frontend/.env`
   - Fill in your actual credentials

### Running the Application

#### Development Mode (Both servers)

```bash
npm run dev:all
```

This runs:
- Backend server on `http://localhost:3000`
- Frontend dev server on `http://localhost:5173`

#### Separate Servers

**Backend only:**
```bash
npm run dev:backend
```

**Frontend only:**
```bash
cd frontend
npm run dev
```

**Production backend:**
```bash
npm run server
```

### First Time Setup

1. Start both servers (backend and frontend)
2. Open browser to `http://localhost:5173`
3. Click "Create one" to register a new account
4. Fill in your details and create account
5. You'll be automatically logged in and redirected to chat
6. Start asking questions!

## 💬 Sample Queries

Try these queries in the chat:

- "List all available contests"
- "Show top 10 scorers for contest Clash of Coders"
- "What tables are available in the database?"
- "Get me the schema for the scores table"
- "Show questions for contest ID [contest-id]"

## 🗄️ Database Schema

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  appwrite_user_id TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Chat Messages Table
```sql
chat_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  message TEXT,
  response TEXT,
  is_user_message BOOLEAN,
  created_at TIMESTAMP
)
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Chat
- `POST /api/chat` - Send message to AI agent (requires auth)
- `GET /api/chat/history` - Get chat history (requires auth)

### Health
- `GET /api/health` - Server health check

## 🎨 Design System

The UI uses a modern neon blue/purple color scheme:

- **Neon Blue**: `#00D4FF`
- **Neon Purple**: `#B537FF`
- **Dark Background**: `#0A0E27`
- **Darker Background**: `#050816`

Custom TailwindCSS utilities:
- `.gradient-neon` - Blue to purple gradient
- `.glass-effect` - Glass morphism effect
- `.text-gradient` - Gradient text

## 🛠️ Technologies Used

### Backend
- Express.js - Web server
- OpenAI Agents SDK - AI agent framework
- Appwrite - Authentication service
- Supabase - PostgreSQL database
- node-appwrite - Appwrite Node SDK
- pg - PostgreSQL client

### Frontend
- React 18 - UI library
- Vite - Build tool
- TailwindCSS - Styling
- React Router - Routing
- React Markdown - Markdown rendering
- Lucide React - Icons

## 📝 Notes

- Chat history is automatically loaded when you open the chat page
- All messages are persisted to the database
- The AI agent has access to both Appwrite and Supabase databases
- Row Level Security (RLS) ensures users can only see their own data

## 🐛 Troubleshooting

**Backend won't start:**
- Check that all environment variables are set correctly
- Verify Appwrite and Supabase credentials
- Ensure port 3000 is not already in use

**Frontend can't connect to backend:**
- Verify `VITE_BACKEND_URL` is set to `http://localhost:3000`
- Check that backend server is running
- Clear browser cache and reload

**Authentication errors:**
- Verify Appwrite project ID and API key are correct
- Check that you're using the correct Appwrite endpoint

**Database errors:**
- Run the schema.sql file in Supabase SQL Editor
- Verify Supabase connection string is correct
- Check that RLS policies are enabled

## 📄 License

ISC

## 👨‍💻 Development

For legacy CLI usage:
```bash
npm run dev "Your query here"
```

---

**Built with ❤️ for the MathX Platform**
