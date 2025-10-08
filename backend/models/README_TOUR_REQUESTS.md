# Tour Request System

This document explains the tour request system for DaycareAlert, including the recent fixes for foreign key issues.

## Overview

The tour request system allows users to schedule tours at daycare facilities. Tour requests are stored in the `tour_requests` table.

## Database Tables Involved

The system works with two main daycare-related tables:

1. `daycare_operations` - Contains operation data imported from Texas HHS API
   - Uses `OPERATION_ID` and `OPERATION_NUMBER` as identifiers
   
2. `daycares` - Contains additional application-specific daycare data
   - Uses `operation_number` as the primary identifier

## Foreign Key Issue

Originally, the `tour_requests` table had a foreign key constraint that required each `daycare_id` to exist in the `daycares.operation_number` column:

```sql
CONSTRAINT `tour_requests_ibfk_1` FOREIGN KEY (`daycare_id`) REFERENCES `daycares` (`operation_number`) ON DELETE CASCADE
```

This caused issues when:
- A daycare existed in `daycare_operations` but not in `daycares`
- The operation ID format differed between tables

## Implemented Fixes

### 1. Foreign Key Constraint Removal

The script `scripts/fix_tour_table.js` removes the foreign key constraint, allowing tour requests to be created even if the daycare ID only exists in the `daycare_operations` table.

### 2. Table Synchronization

The script `scripts/sync_daycare_tables.js` copies missing records from `daycare_operations` to `daycares`, ensuring that all daycare IDs are available in both tables.

### 3. Improved ID Verification

The tour request creation logic now checks for the daycare ID in both tables and in multiple ways:
- Checks `daycare_operations.OPERATION_ID`
- Checks `daycare_operations.OPERATION_NUMBER`
- Checks `daycares.operation_number`

Even if not found, the tour request will still be created with appropriate warnings in the logs.

## Startup Process

The `start-backend.sh` script now runs the maintenance scripts before starting the server:
1. Fixes the tour request table (removing foreign key constraints)
2. Synchronizes the daycare tables

## Troubleshooting

If you encounter issues with tour requests:

1. Check logs for errors or warnings (in `backend/logs/`)
2. Verify the daycare ID exists in either `daycare_operations` or `daycares` tables
3. Run the maintenance scripts manually:
   ```
   node backend/scripts/fix_tour_table.js
   node backend/scripts/sync_daycare_tables.js
   ```

## Future Improvements

- Consider adding a service to regularly sync data between the tables
- Add data validation to ensure daycare IDs are properly formatted
- Implement notifications for tour requests that reference unknown daycares