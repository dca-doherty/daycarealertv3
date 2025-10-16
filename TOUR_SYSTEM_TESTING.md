# Tour Scheduling System - Testing Guide

## Pre-Testing Checklist

1. ✅ Database tables created
2. ✅ Dependencies installed
3. ✅ Email credentials configured
4. ✅ Frontend rebuilt
5. ✅ Backend restarted

## Test Scenarios

### 1. Tour Selection Flow
- [ ] Go to homepage
- [ ] Click the "+" button on 1-5 daycares
- [ ] Verify floating cart appears and updates
- [ ] Try to select more than 5 daycares (should show limit message)
- [ ] Remove a daycare from cart
- [ ] Click "Schedule Tour" button

### 2. Tour Request Form
- [ ] Fill out all required fields
- [ ] Try submitting with missing fields (should show errors)
- [ ] Enter invalid email format (should show error)
- [ ] Select available days and time slots
- [ ] Add optional notes
- [ ] Submit form successfully

### 3. Success Flow
- [ ] Verify success modal appears
- [ ] Check that confirmation email was sent to parent
- [ ] Check that request emails were sent to all daycares
- [ ] Click "Download Profiles" button
- [ ] Verify PDF downloads with all daycare profiles

### 4. Admin Dashboard
- [ ] Access /admin/tour-requests
- [ ] Verify all requests are listed
- [ ] Filter by status (pending/completed/cancelled)
- [ ] View request details
- [ ] Check stats are accurate

### 5. Database Verification
```sql
-- Check tour requests
SELECT * FROM tour_requests ORDER BY created_at DESC LIMIT 10;

-- Check daycare selections
SELECT * FROM tour_request_daycares ORDER BY created_at DESC LIMIT 10;

-- Check email logs
SELECT * FROM tour_request_emails ORDER BY sent_at DESC LIMIT 10;
```

## Common Issues

### Emails Not Sending
- Check SMTP credentials in .env
- Verify email service allows SMTP access
- Check backend logs: `pm2 logs daycarealert-api-primary`

### PDF Generation Fails
- Ensure pdfkit is installed
- Check file permissions on /tmp directory
- Verify daycare data exists in database

### Cart Not Appearing
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors
- Verify TourSelectionCart component is imported

## Success Criteria
- ✅ Parent can select up to 5 daycares
- ✅ Tour request form validates properly
- ✅ Emails sent to all selected daycares
- ✅ Confirmation email sent to parent
- ✅ PDF profiles generate successfully
- ✅ Request tracked in database
- ✅ Admin can view all requests

