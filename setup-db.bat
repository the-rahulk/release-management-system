@echo off
REM ReleaseMaster Database Setup Script for Local PostgreSQL (Windows)

echo Setting up ReleaseMaster database...

REM Database configuration
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432
if "%DB_NAME%"=="" set DB_NAME=rms_master_db
if "%DB_USER%"=="" set DB_USER=rms_user
if "%DB_PASSWORD%"=="" set DB_PASSWORD=release123

echo Creating database and user...

REM Connect as postgres superuser to create database and user
psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "CREATE DATABASE %DB_NAME%;" 2>nul || echo Database %DB_NAME% already exists
psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%';" 2>nul || echo User %DB_USER% already exists
psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%;"
psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "ALTER USER %DB_USER% CREATEDB;"

echo Database setup completed!
echo.
echo Database Details:
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo   Database: %DB_NAME%
echo   User: %DB_USER%
echo   Password: %DB_PASSWORD%
echo.
echo Connection string: postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%
echo.
echo Next steps:
echo 1. Install dependencies: npm install
echo 2. Run database migrations: npm run db:push
echo 3. Start the application: npm run dev