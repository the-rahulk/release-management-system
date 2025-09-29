# ReleaseMaster Environment Setup Guide

## Step 1: Install Dependencies

First, make sure you have the correct dependencies installed:

```bash
npm install --save-dev @types/react @types/react-dom
npm install react react-dom
```

## Step 2: Update Package.json Dependencies

The package.json should have these key dependencies. Run these commands to ensure compatibility:

```bash
# Core database and authentication
npm install pg bcrypt passport passport-local
npm install drizzle-orm@^0.36.4 drizzle-kit@^0.28.1

# Development types
npm install --save-dev @types/pg @types/bcrypt @types/passport @types/passport-local @types/node

# Remove conflicting packages
npm uninstall @neondatabase/serverless openid-client
```

## Step 3: Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rms_master_db
DB_USER=rms_user
DB_PASSWORD=release123
DB_MAX_CONNECTIONS=20

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-in-production-please

# Node Environment
NODE_ENV=development

# Email Configuration (Optional)
SENDGRID_API_KEY=
DEFAULT_FROM_EMAIL=noreply@releasemaster.local

# Server Configuration
PORT=5000
```

## Step 4: Database Setup

### Option A: Using the setup script

**Windows:**
```cmd
setup-db.bat
```

**Linux/macOS:**
```bash
chmod +x setup-db.sh
./setup-db.sh
```

### Option B: Manual PostgreSQL Setup

1. Install PostgreSQL if not already installed
2. Connect as superuser and run:

```sql
CREATE DATABASE rms_master_db;
CREATE USER rms_user WITH PASSWORD 'release123';
GRANT ALL PRIVILEGES ON DATABASE rms_master_db TO rms_user;
ALTER USER rms_user CREATEDB;
```

## Step 5: Run Database Migrations

```bash
npm run db:push
```

## Step 6: Start the Application

```bash
npm run dev
```

## Common Issues and Solutions

### Issue 1: TypeScript Module Resolution Errors

If you see errors like "Cannot find module 'react'", run:

```bash
npm install react @types/react react-dom @types/react-dom
```

### Issue 2: Drizzle ORM Version Conflicts

If you see drizzle-related errors, ensure you have compatible versions:

```bash
npm install drizzle-orm@^0.36.4 drizzle-kit@^0.28.1
```

### Issue 3: Database Connection Issues

1. Check if PostgreSQL is running:
   ```bash
   # Windows (in Services)
   # Look for PostgreSQL service
   
   # Linux/macOS
   sudo systemctl status postgresql
   # or
   brew services list | grep postgresql
   ```

2. Test database connection:
   ```bash
   psql -h localhost -U rms_user -d rms_master_db
   ```

### Issue 4: Missing Dependencies

Run a clean install:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue 5: Port Already in Use

If port 5000 is in use, change it in `.env`:

```env
PORT=3000
```

## Verification Steps

1. **Database Connection**: The app should start without database connection errors
2. **Authentication**: You should see the login/register form at `http://localhost:5000`
3. **Registration**: You should be able to create a new account
4. **Login**: You should be able to log in with created credentials
5. **Dashboard**: After login, you should see the main dashboard

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run database migrations
npm run db:push

# Type checking
npm run check
```

## Project Structure After Setup

```
ReleaseMaster/
├── .env                     # Environment variables
├── package.json            # Dependencies
├── drizzle.config.ts       # Database configuration
├── client/                 # React frontend
│   └── src/
│       ├── App.tsx         # Main app component
│       ├── components/
│       │   └── auth/
│       │       └── auth-form.tsx  # Login/register form
│       └── pages/          # Application pages
├── server/                 # Express backend
│   ├── db.ts              # Database connection
│   ├── localAuth.ts       # Authentication system
│   ├── routes.ts          # API routes
│   └── storage.ts         # Database operations
└── shared/                # Shared types
    └── schema.ts          # Database schema
```

## Next Steps After Setup

1. **Create Your First User**: Register with your email and choose "Release Manager" role
2. **Create a Release Plan**: Add your first release plan from the dashboard
3. **Add Release Steps**: Create steps for your release process
4. **Explore Features**: Try the real-time updates, email notifications, and step management

If you encounter any issues not covered here, check the main README.md for additional troubleshooting steps.