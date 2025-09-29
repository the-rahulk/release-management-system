# 🚀 Release Master

A comprehensive release management system built with React, TypeScript, Node.js, and PostgreSQL. Manage your software releases with step-by-step workflows, real-time notifications, and role-based access control.

## ✨ Features

### 📋 Release Management
- **Release Plans**: Create and manage release plans with versions and schedules
- **Step Organization**: Organize steps into categories (Before Release, Actual Release, Post Release)
- **Timeline Tracking**: Visual timeline view of release progress
- **Real-time Updates**: Live updates using WebSocket connections

### 👥 Role-Based Access Control
- **Release Manager**: Full system access, can create releases and assign team leads
- **Team Lead**: Can assign POCs, manage team steps, and trigger releases
- **POC (Point of Contact)**: Can update step status and execute assigned tasks

### 📧 Email Notifications
- **Step Assignment**: Notifications when team leads or POCs are assigned
- **Step Triggering**: Alerts when steps are ready for execution
- **Status Changes**: Updates when step status changes
- **Release Completion**: Notifications when entire releases are completed
- **Global CC/BCC**: Configurable recipients for all notifications

### 🔄 Step Management
- **Multiple Scheduling Types**:
  - Manual trigger
  - Fixed time scheduling
  - Dependency-based (after previous step)
  - Simultaneous execution
- **Status Tracking**: Not Started → Started → In Progress → Completed/Failed
- **History Logging**: Complete audit trail of all step changes

### ⚙️ Advanced Features
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Dashboard**: Live updates without page refresh
- **Search and Filtering**: Find steps by category, status, or team
- **Global Settings**: Configurable email settings and system preferences

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Shadcn/ui** for UI components
- **TanStack Query** for data fetching and caching
- **React Hook Form** for form management

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Drizzle ORM** for database operations
- **PostgreSQL** as the database
- **Passport.js** for authentication
- **WebSocket** for real-time updates
- **Nodemailer** for email notifications

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software
- **Node.js**: Version 18.0 or higher
  - Download from: https://nodejs.org/
  - Check version: `node --version`
- **npm**: Usually comes with Node.js
  - Check version: `npm --version`
- **PostgreSQL**: Version 12 or higher
  - Download from: https://www.postgresql.org/download/
  - Check version: `psql --version`

### Recommended Tools
- **Git**: For version control
- **VS Code**: Recommended IDE with TypeScript support
- **Postman**: For API testing (optional)

## 🚀 Installation and Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ReleaseMaster
```

### 2. Install Dependencies
```bash
npm install
```

If you encounter dependency errors, use the quick fix script:

**Windows:**
```cmd
quick-fix.bat
```

**Linux/macOS:**
```bash
chmod +x quick-fix.sh
./quick-fix.sh
```

### 3. PostgreSQL Installation

If you don't have PostgreSQL installed:

**Windows:**
- Download from [PostgreSQL.org](https://www.postgresql.org/download/windows/)
- Install with default settings
- Remember the password you set for the `postgres` user

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 4. Database Setup

#### Option A: Automated Setup (Recommended)

**Windows:**
```cmd
setup-db.bat
```

**Linux/macOS:**
```bash
chmod +x setup-db.sh
./setup-db.sh
```

#### Option B: Manual Setup
1. **Start PostgreSQL service**
2. **Create database and user**:
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE rms_master_db;

-- Create user
CREATE USER rms_user WITH ENCRYPTED PASSWORD 'release123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE rms_master_db TO rms_user;
GRANT ALL ON SCHEMA public TO rms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rms_user;

-- Exit psql
\q
```

### 5. Environment Configuration
Copy the example environment file and configure it:
```bash
cp .env.example .env
```

Edit the `.env` file with your settings:
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

# Gmail Configuration for Email Notifications
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password

# Server Configuration
PORT=5000
```

### 6. Gmail Email Setup (Optional but Recommended)
To enable email notifications:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other" (custom name: "Release Master")
   - Copy the 16-character password
3. **Update .env file** with your Gmail credentials

### 7. Database Migration
Run the database migration to create all required tables:
```bash
npm run db:push
```

This command will create the following tables:
- `users` - User accounts and roles
- `release_plans` - Release plan information
- `release_steps` - Individual release steps
- `step_history` - Audit trail of step changes
- `global_settings` - System configuration
- `sessions` - User session data
- `shareable_links` - Public dashboard links

### 8. Start the Application
```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

The application will be available at: http://localhost:5000

## 🗃️ Database Schema

### Key Tables Structure

#### Users Table
```sql
- id (UUID, Primary Key)
- email (Unique)
- firstName, lastName
- role (release_manager, team_lead, poc)
- createdAt, updatedAt
```

#### Release Plans Table
```sql
- id (UUID, Primary Key)
- name, version, description
- scheduledDate
- status (planning, active, completed, cancelled)
- createdBy (User ID)
- createdAt, updatedAt
```

#### Release Steps Table
```sql
- id (UUID, Primary Key)
- releasePlanId (Foreign Key)
- name, description, category
- teamLeadId, primaryPocId, backupPocId (User IDs)
- schedulingType, scheduledTime, timezone
- status, order
- dependsOnStepId, simultaneousWithStepId
- timestamps (startedAt, completedAt, etc.)
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | rms_master_db | Database name |
| `DB_USER` | rms_user | Database user |
| `DB_PASSWORD` | release123 | Database password |
| `DB_MAX_CONNECTIONS` | 20 | Maximum database connections |
| `SESSION_SECRET` | (required) | Session encryption key |
| `NODE_ENV` | development | Application environment |
| `PORT` | 5000 | Server port |
| `GMAIL_USER` | (optional) | Gmail address for notifications |
| `GMAIL_APP_PASSWORD` | (optional) | Gmail App Password |

**⚠️ Security Note:** Change the default password in production!

## 🎯 Usage Guide

### First Time Setup
1. **Access the application** at http://localhost:5000
2. **Create your first user account** (first user becomes Release Manager)
3. **Configure global settings** (email preferences, CC/BCC recipients)
4. **Create team leads and POC users**

### Creating Your First User

When you first access the application at `http://localhost:5000`, you'll see the authentication form. Click "Create Account" and register with:

- **Email:** Your email address
- **Password:** At least 6 characters
- **First Name & Last Name:** Your details
- **Role:** Choose based on your needs:
  - `Release Manager`: Full system access
  - `Team Lead`: Can manage assigned steps
  - `POC`: Can execute assigned tasks

### Creating a Release
1. **Click "New Release Plan"**
2. **Fill in release details** (name, version, description, schedule)
3. **Add steps** in different categories:
   - Before Release (preparation tasks)
   - Actual Release (deployment tasks)
   - Post Release (verification tasks)

### Managing Steps
1. **Assign team leads** to steps (Release Managers only)
2. **Team leads assign POCs** from their team
3. **Configure scheduling** (manual, fixed time, or dependency-based)
4. **Set step order** and dependencies

### Executing Releases
1. **Trigger steps** when ready (Team Leads only)
2. **POCs update status** as work progresses
3. **Monitor progress** on the dashboard
4. **Receive email notifications** at each stage

## User Roles & Permissions

### Release Manager
- Create and modify release plans
- Manage global settings
- Access all system features
- Trigger any release step

### Team Lead
- Manage assigned release steps
- Assign points of contact
- Trigger steps they're responsible for
- Update step statuses

### POC (Point of Contact)
- Execute assigned tasks
- Update status of their assigned steps
- View release progress

### Viewer
- Read-only access to dashboards
- View release progress
- Access shared dashboard links

## Key Features

### Real-time Collaboration
- WebSocket-powered live updates
- See changes as they happen across all users
- Real-time dashboard synchronization

### Automated Workflows
- Schedule steps to run at specific times
- Dependency-based step triggering
- Automatic status propagation
- Release completion detection

### Notification System
- Email notifications for step assignments
- Status change alerts
- Release completion notifications
- Configurable recipient lists

### Audit Trail
- Complete history of all changes
- User attribution for every action
- Notes and comments support

### Shareable Dashboards
- Generate secure links for external stakeholders
- Read-only access for external viewers
- Time-limited access tokens

## 🔧 Development

### Available Scripts
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npm run db:push        # Apply schema changes
npm run db:studio      # Open Drizzle Studio (database GUI)

# Code quality
npm run lint           # ESLint
npm run type-check     # TypeScript checking
```

### Project Structure
```
ReleaseMaster/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Main application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility libraries
├── server/                 # Backend Node.js application
│   ├── routes.ts           # API endpoints
│   ├── db.ts              # Database connection
│   ├── storage.ts         # Data access layer
│   ├── emailService.ts    # Email notification service
│   └── schedulerService.ts # Background task scheduler
├── shared/                 # Shared TypeScript types
│   └── schema.ts          # Database schema definitions
└── package.json           # Dependencies and scripts
```

### Database Migration File
The `npm run db:push` command creates these essential tables:

- **users** - User accounts and role management
- **release_plans** - High-level release definitions
- **release_steps** - Individual tasks within releases
- **step_history** - Complete audit trail
- **global_settings** - System configuration
- **sessions** - User session data
- **shareable_links** - Public dashboard access

## Production Deployment

### Environment Setup

1. Set strong passwords and secrets:
   ```bash
   DB_PASSWORD=your-strong-password
   SESSION_SECRET=your-long-random-secret-key
   ```

2. Configure email service:
   ```bash
   SENDGRID_API_KEY=your-sendgrid-api-key
   DEFAULT_FROM_EMAIL=noreply@yourdomain.com
   ```

3. Set production environment:
   ```bash
   NODE_ENV=production
   ```

### Database Security

- Change default database password
- Use connection pooling
- Enable SSL connections
- Regular backups

### Application Security

- Use HTTPS in production
- Set secure session cookies
- Implement rate limiting
- Regular security updates

## 🚨 Troubleshooting

### Common Issues

#### "Failed to fetch" errors
- **Check if server is running**: `npm run dev` should show "serving on port 5000"
- **Verify database connection**: Ensure PostgreSQL is running
- **Check network issues**: Try accessing http://localhost:5000 directly

#### Database connection errors
- **PostgreSQL not running**: Start the PostgreSQL service
- **Wrong credentials**: Verify DB_USER, DB_PASSWORD in .env
- **Database doesn't exist**: Run the setup script again

#### Email notifications not working
- **Gmail App Password**: Ensure you're using the 16-character app password, not your regular password
- **2FA not enabled**: Enable 2-Factor Authentication on Gmail
- **Network/Firewall**: Check if SMTP ports (587) are blocked

#### Permission errors
- **Clear browser cache**: Hard refresh (Ctrl+F5)
- **Check user roles**: Verify users have correct roles assigned
- **Session issues**: Try logging out and back in

### Debug Mode
Enable verbose logging by setting in `.env`:
```env
NODE_ENV=development
```

### Database Reset
To completely reset the database:
```bash
# Drop and recreate database
dropdb -U postgres rms_master_db
createdb -U postgres rms_master_db
npm run db:push
```

### Database Connection Verification

1. **Check PostgreSQL is running:**
   ```bash
   # Linux/macOS
   sudo systemctl status postgresql
   
   # Windows (in Services app)
   Look for "PostgreSQL" service
   ```

2. **Verify database credentials:**
   ```bash
   psql -h localhost -U rms_user -d rms_master_db
   ```

3. **Check environment variables:**
   Ensure `.env` file has correct database settings

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

### Release Management
- `GET /api/release-plans` - List release plans
- `POST /api/release-plans` - Create release plan
- `GET /api/release-plans/:id/steps` - Get steps for release
- `POST /api/steps` - Create new step
- `PATCH /api/steps/:id` - Update step
- `POST /api/steps/:id/trigger` - Trigger step execution

### User Management
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PATCH /api/users/:id` - Update user

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

For support, please:
1. Check the troubleshooting section above
2. Search existing issues in the repository
3. Create a new issue with detailed description
4. Include logs and error messages

## 🔮 Roadmap

- [ ] LDAP/Active Directory integration
- [ ] Advanced reporting and analytics
- [ ] Mobile application
- [ ] Slack/Teams integration
- [ ] API webhooks
- [ ] Multi-tenant support
- [ ] Advanced scheduling (cron expressions)
- [ ] Rollback capabilities

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Release Master** - Streamline your software releases with confidence! 🚀