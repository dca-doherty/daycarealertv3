# Final Integration Checklist

## 1. Database Setup ⚠️ REQUIRED
```bash
# Run all migrations
mysql -u root -p daycare_data < backend/migrations/create_tour_requests.sql
mysql -u root -p daycare_data < backend/migrations/add_enrollment_tracking.sql
```

## 2. Install Dependencies ⚠️ REQUIRED
```bash
cd backend
npm install nodemailer pdfkit --save

cd ..
npm install --save
```

## 3. Wire Up Backend Routes ⚠️ REQUIRED
Add to `backend/server.js`:
```javascript
const tourRoutes = require('./routes/tourScheduling/tourRoutes');
const enrollmentRoutes = require('./routes/tourScheduling/enrollmentRoutes');

app.use('/api/tour-requests', tourRoutes);
app.use('/api/enrollments', enrollmentRoutes);
```

## 4. Configure Email ⚠️ REQUIRED
Add to `backend/.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@daycarealert.com
SMTP_PASS=your_app_password
```

## 5. Add React Routes ⚠️ REQUIRED
Add to `src/App.js`:
```javascript
import EnrollmentConfirmation from './pages/EnrollmentConfirmation';

// Inside your Routes:
<Route path="/enrollment-confirm/:enrollmentId" element={<EnrollmentConfirmation />} />
<Route path="/admin/tour-requests" element={<TourRequestsDashboard />} />
```

## 6. Update DaycareDataView ⚠️ REQUIRED
Manually add the tour selection column to the columns array in:
`src/components/DaycareDataView.js`

## 7. Integrate Tour Components into Home.js ⚠️ REQUIRED
Replace current `src/pages/Home.js` with `src/pages/Home.integrated.js`

## 8. Create Missing CSS File
```bash
cat > src/pages/EnrollmentConfirmation.css << 'EOF'
/* Add the CSS I'll provide below */
