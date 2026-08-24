# Fine Management System - Integration Guide

## Files Added

1. **backend/routes/fines.js** - Complete fine management routes
2. **frontend/src/components/StudentFines.tsx** - Student fine view/payment interface
3. **frontend/src/components/UncollectedFinesAdmin.tsx** - Admin view for pending approvals

## Backend Setup

### In your main server file (server.js or app.js), add:

```javascript
const finesRouter = require('./routes/fines');
app.use('/api/fines', finesRouter);
```

Make sure this is added **after** your MongoDB connection and before your error handlers.

## API Endpoints Created

### For Students:
- `GET /api/fines/student/:studentId` - Get student's fines (active, pending, collected)
- `PUT /api/fines/:studentId/:fineIndex/mark-paid` - Student marks fine as paid (active → pending)

### For Admin:
- `GET /api/fines/summary` - Get summary stats (total collected, uncollected, by org)
- `GET /api/fines/collections` - Get all collected fines (final view)
- `GET /api/fines/uncollected/all` - Get all uncollected fines (awaiting payment or admin approval)
- `PUT /api/fines/:studentId/:fineIndex/approve-payment` - Admin approves payment (pending → collected)
- `POST /api/fines/apply` - Apply fines to absent students

## Frontend Integration

### Add components to your navigation/sidebar:

In your main app routing, add:

```jsx
import StudentFines from './components/StudentFines';
import UncollectedFinesAdmin from './components/UncollectedFinesAdmin';
import FinesCollections from './components/FinesCollections';

// In your router:
<Route path="/student/fines" element={<StudentFines studentId={userId} />} />
<Route path="/admin/fines/uncollected" element={<UncollectedFinesAdmin />} />
<Route path="/admin/fines/collections" element={<FinesCollections />} />
```

### Update frontend/src/api.ts:
Already updated with new methods:
- `getStudentFines(studentId)` 
- `markFinePaid(studentId, fineIndex)`
- `approveFinePaid(studentId, fineIndex)`
- `getUncollectedFines()`
- `getFinesCollections()`
- `getFinesSummary()`
- `applyFines(...)`

## Fine Lifecycle

1. **Event Finishes** → Admin applies fines to absent students (status: `active`)
2. **Student Views Fine** → Student marks fine as paid (status: `pending`)
3. **Admin Approves** → Admin reviews and approves payment (status: `collected`)
4. **Fine Appears in Collections** → Moved to "Total Collections" on Clearance Page

## Data Flow

```
Student Model (MongoDB):
├── finesActive: [
│   ├── eventName
│   ├── organization
│   ├── amount
│   ├── status (active → pending → collected)
│   ├── dateIssued
│   ├── studentMarkedPaidAt
│   └── adminApprovedAt
├── totalUncollectedFines: Number
└── totalCollectedFines: Number
```

## Fine Statuses

- **active** - Fine recorded, student hasn't marked as paid yet
- **pending** - Student marked as paid, awaiting admin approval
- **collected** - Admin approved, moved to collections
- **approved** - (alternative for collected)
