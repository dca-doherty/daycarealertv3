# DaycareAlert Data Loading Guide

This guide explains how to load API data from the Texas daycare API into your MySQL database.

## Prerequisites

1. Make sure you have the MySQL database running
2. Ensure your `.env` file is configured with the correct database credentials:
   ```
   DB_HOST=localhost
   DB_USER=daycarealert_user
   DB_PASSWORD=Bd03021988!!
   DB_NAME=daycarealert
   SOCRATA_APP_TOKEN=XLZk8nhCZvuJ9UooaKbfng3ed
   DAYCARE_DATASET=bc5r-88dy
   VIOLATIONS_DATASET=cwsq-xwdj
   ```

## Options for Loading Data

### Option 1: Using the load_api_data.js Script (Recommended)

This script creates the necessary tables and loads data directly from the Texas API:

```bash
# Navigate to the backend directory
cd backend

# Run the data loader script
node scripts/load_api_data.js
```

The script will:
1. Create necessary database tables if they don't exist
2. Load daycare data from the Texas API
3. Load violation data for daycares
4. Update violation counts for each daycare

### Option 2: Using the sync-data.js Script

For ongoing synchronization of data:

```bash
# Navigate to the backend directory
cd backend

# Run the data synchronization script
node sync-data.js
```

### Option 3: Regular Automated Synchronization

To set up regular synchronization, you can use the scheduler service:

1. Ensure `ENABLE_SCHEDULER=true` is set in your `.env` file
2. Restart your server

## Database Schema Information

The data loader will create two main tables:

1. **daycare_operations** - Contains all daycare facilities
2. **non_compliance** - Contains violation/non-compliance records

Additional tables from the schema.sql file will also be created if they don't exist.

## Troubleshooting

- If you encounter connection issues, check that your MySQL service is running
- For permission errors, make sure your database user has the necessary privileges
- Log files are stored in the `backend/logs` directory

## Data Sources

The data is sourced from the Texas Health and Human Services Commission through their Socrata API:

- Daycare Dataset: bc5r-88dy
- Violations Dataset: tqgd-mf4x