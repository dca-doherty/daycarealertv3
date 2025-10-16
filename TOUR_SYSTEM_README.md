# Daycare Tour Scheduling System

## Overview
A complete referral and tour scheduling system that allows parents to:
- Select up to 5 daycares for tours
- Submit tour requests with their information
- Automatically notify daycares via email
- Download daycare profiles as PDF
- Track request status

## Architecture

### Frontend Components
- `TourSelectionCart`: Floating cart showing selected daycares
- `TourRequestModal`: Form for parent information
- `TourSuccessModal`: Confirmation after submission
- `useTourSelection`: React hook for managing selections

### Backend Services
- `tourRequestService`: Handles tour request creation
- `emailService`: Sends emails using nodemailer
- `pdfService`: Generates PDF profiles

### Database Tables
- `tour_requests`: Main request data
- `tour_request_daycares`: Selected daycares (many-to-many)
- `tour_request_emails`: Email tracking

## API Endpoints

### POST /api/tour-requests
Create new tour request
```json
{
  "parentInfo": {
    "parentName": "John Doe",
    "parentEmail": "john@example.com",
    "parentPhone": "(555) 123-4567",
    "numberOfChildren": 2,
    "childrenAges": [3, 5],
    "availableDays": ["Monday", "Tuesday"],
    "preferredTimeSlots": ["Morning"]
  },
  "selectedDaycares": [
    {
      "operation_id": "123456",
      "operation_name": "ABC Daycare",
      "city": "Austin"
    }
  ]
}
```

### GET /api/tour-requests/:id
Get tour request details

### GET /api/tour-requests/:id/profiles-pdf
Download PDF profiles for all selected daycares

### GET /api/tour-requests
List all tour requests (admin)

## Email Templates

### To Daycares
- Professional email from info@daycarealert.com
- Parent contact information
- Child details and preferences
- Availability schedule
- "Respond to Request" button

### To Parents
- Confirmation of submission
- List of contacted daycares
- Timeline expectations
- Link to download PDF profiles

## Future Enhancements (Phase 2)

### Daycare Response System
- [ ] Unique response links for daycares
- [ ] Accept/Reject tour request
- [ ] Propose alternative times
- [ ] Send calendar invites to parents

### Analytics Dashboard
- [ ] Conversion rates by daycare
- [ ] Response time tracking
- [ ] Popular time slots
- [ ] Geographic demand heatmap

### Automation
- [ ] Automated reminder emails
- [ ] Follow-up after 48 hours
- [ ] Post-tour feedback requests
- [ ] Lead scoring

## Configuration

### Environment Variables
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@daycarealert.com
SMTP_PASS=your_password_here
MAX_TOUR_SELECTIONS=5
```

### Email Service Options
- Gmail (requires app password)
- SendGrid (recommended for production)
- AWS SES
- Mailgun

## Monitoring

### Key Metrics to Track
1. Tour requests per day
2. Average daycares per request
3. Email delivery rate
4. Daycare response rate (Phase 2)
5. Tour completion rate (Phase 2)

### Database Queries
```sql
-- Daily tour requests
SELECT DATE(created_at) as date, COUNT(*) as requests
FROM tour_requests
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Most requested daycares
SELECT operation_name, COUNT(*) as requests
FROM tour_request_daycares
GROUP BY operation_id, operation_name
ORDER BY requests DESC
LIMIT 20;

-- Email success rate
SELECT 
  email_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM tour_request_emails
GROUP BY email_status;
```

## Support
For issues or questions:
- Email: support@daycarealert.com
- Check logs: `pm2 logs daycarealert-api-primary`
- Database: `mysql -u root -p daycare_data`

