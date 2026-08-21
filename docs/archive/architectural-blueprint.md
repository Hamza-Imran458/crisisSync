# Phase 1 Architectural Blueprint

## 1. Project Scope for Phase 1

This phase focuses on system design and planning only. No production code is written yet. The goal is to finalize the architecture and requirements before implementation begins.

## 2. Target architecture

### High-level architecture

- Mobile app layer: React Native Expo client for citizens and responders
- Admin dashboard: React front-end for moderators and administrators
- Backend services: Node.js + Express API layer
- Data layer: Firebase Firestore for app data and metadata
- File layer: Firebase Storage for uploaded images
- Notification layer: Firebase Cloud Messaging for push alerts
- Location layer: Google Maps API and device geolocation
- Identity layer: Firebase Authentication

### Architectural style

Use a modular service-based architecture with a clear separation between:

- UI layer
- Domain logic
- Data access
- Firebase services
- Notification orchestration
- Map services
- Validation and security

This promotes maintainability and reduces coupling for future upgrades.

## 3. Folder structure

```text
crisisSync/
├─ app/                     # Mobile app code (Phase 2 onwards)
│  ├─ src/
│  │  ├─ app/
│  │  ├─ components/
│  │  ├─ features/
│  │  │  ├─ auth/
│  │  │  ├─ incidents/
│  │  │  ├─ map/
│  │  │  ├─ notifications/
│  │  │  ├─ profile/
│  │  │  └─ settings/
│  │  ├─ hooks/
│  │  ├─ lib/
│  │  ├─ navigation/
│  │  ├─ services/
│  │  ├─ store/
│  │  ├─ theme/
│  │  └─ utils/
│  └─ assets/
├─ admin/
│  ├─ src/
│  ├─ components/
│  ├─ pages/
│  └─ services/
├─ backend/
│  ├─ src/
│  │  ├─ config/
│  │  ├─ controllers/
│  │  ├─ middleware/
│  │  ├─ routes/
│  │  ├─ services/
│  │  ├─ repositories/
│  │  ├─ validators/
│  │  └─ utils/
│  └─ tests/
├─ docs/
│  ├─ phase1/
│  ├─ srs/
│  ├─ sdd/
│  └─ thesis/
├─ firebase/
│  ├─ firestore.rules
│  ├─ storage.rules
│  └─ functions/
├─ scripts/
├─ .env.example
├─ package.json
├─ README.md
└─ .gitignore
```

## 4. System architecture

### 4.1 Mobile application architecture

The mobile application is split into screens and feature modules. Each feature owns its own data fetching, validation, and state logic.

Core responsibilities:

- Authentication and onboarding
- Incident reporting and media upload
- Map and nearby incident discovery
- Alert feed and push subscription
- History and profile management
- Settings and notification preferences

### 4.2 Admin dashboard architecture

The dashboard is used by verified admins and moderators to:

- review incidents
- verify reports
- trigger alerts
- monitor hotspot activity
- manage users
- generate reports

### 4.3 Backend architecture

The backend exposes REST-style endpoints for:

- authentication hooks
- incident operations
- verification actions
- notification dispatch
- report generation
- user management

The backend should not directly manipulate all data outside validated service boundaries.

## 5. Database schema and Firestore collections

Firestore should use a normalized model with a mix of document-based collections and relational-style reference patterns.

### Collection: users

Purpose: store user account metadata, preferences, role, and profile data.

Fields:

- uid
- email
- displayName
- phoneNumber
- role: citizen | responder | admin | superAdmin
- createdAt
- updatedAt
- isVerified
- location: { lat, lng, updatedAt }
- preferences: { notificationsEnabled, radiusKm, emergencyAlerts }
- avatarUrl

### Collection: incidents

Purpose: store all incident reports.

Fields:

- incidentId
- reporterUid
- title
- description
- category
- severity
- status: pending | verified | rejected | resolved
- createdAt
- updatedAt
- location: { lat, lng, address }
- imageUrls[]
- verificationScore
- verifiedBy
- verificationNotes
- isAnonymous
- source: app | admin | import

### Collection: verification

Purpose: record validation decisions and reviewer actions.

Fields:

- verificationId
- incidentId
- reviewerUid
- action: approved | rejected | escalated
- rationale
- createdAt

### Collection: notifications

Purpose: store system-generated alerts and user device notifications.

Fields:

- notificationId
- type: info | warning | emergency | system
- title
- body
- targetScope: all | region | user
- targetRadiusKm
- location: { lat, lng }
- sentAt
- createdBy
- status: draft | sent | failed

### Collection: reports

Purpose: store generated analytical or operational reports.

Fields:

- reportId
- reportType: summary | hotspot | userActivity | incidentTrend
- generatedBy
- generatedAt
- filters
- data

### Collection: images

Purpose: store metadata about uploaded incident images.

Fields:

- imageId
- incidentId
- storagePath
- downloadUrl
- uploadedBy
- uploadedAt
- mimeType
- size

### Collection: deviceTokens

Purpose: map users to their push notification registration tokens.

Fields:

- tokenId
- uid
- deviceId
- platform: ios | android
- token
- lastSeenAt
- active

### Collection: admin

Purpose: store admin-level metadata and permissions.

Fields:

- uid
- role
- permissions[]
- assignedRegion
- createdAt

### Collection: logs

Purpose: store security, application, and admin action logs.

Fields:

- logId
- entityType
- entityId
- action
- actorUid
- details
- createdAt

### Collection: comments

Purpose: support discussion and collaboration around incidents.

Fields:

- commentId
- incidentId
- uid
- message
- createdAt
- editedAt

### Collection: regions

Purpose: define geographic boundaries for alert broadcasting and reporting.

Fields:

- regionId
- name
- polygonCoordinates[]
- center
- riskLevel

### Why these collections exist

Each collection maps to a distinct system concern. Separating them reduces query complexity and allows cleaner permissioning and auditing.

## 6. Authentication flow

### User sign-up flow

1. User opens app
2. User enters email + password + profile data
3. Firebase Auth creates account
4. A Firestore user document is created
5. User is redirected to onboarding or home screen

### Login flow

1. User enters credentials
2. Firebase Auth verifies identity
3. App loads user profile
4. App routes to correct dashboard based on role

### Session rules

- Use Firebase Auth session state for persistence
- Enforce role-based route guards in app and dashboard
- Refresh token if expired
- Restrict admin routes to admin-role users only

### Roles

- citizen: can report incidents and receive alerts
- responder: can view incidents and contribute to verification workflows
- admin: can manage content and broadcast alerts
- superAdmin: full access including settings and user administration

## 7. Navigation flow

### Mobile navigation structure

```text
App
├─ AuthStack
│  ├─ Onboarding
│  ├─ Login
│  ├─ Register
│  ├─ ForgotPassword
│  └─ SetupProfile
├─ MainTabs
│  ├─ Home
│  │  └─ NearbyIncidentsMap
│  ├─ ReportIncident
│  ├─ Alerts
│  ├─ History
│  ├─ Profile
│  └─ Settings
└─ IncidentDetailModal
```

### Flow logic

- Signed-out users go to auth flow
- Citizens route to Home and Report tabs
- Verified responders see enhanced incident detail views
- Admins are redirected to dashboard shell

## 8. App screens

### Citizen app screens

- Splash screen
- Onboarding
- Login
- Register
- Forgot password
- Home dashboard
- Nearby incidents map
- Create incident form
- Incident details
- Photo gallery/upload
- Alert feed
- Search and filters
- Incident history
- Profile
- Settings
- Logout

### Dashboard screens

- Admin login
- Dashboard overview
- Incident queue
- Verification detail
- User management
- Broadcast notification
- Heatmap analytics
- Reports
- Settings

## 9. Admin dashboard structure

```text
AdminApp
├─ Login
├─ Dashboard
│  ├─ OverviewStats
│  ├─ IncidentSummaryCards
│  ├─ HotspotMap
│  └─ NotificationStatus
├─ IncidentManagement
│  ├─ PendingQueue
│  ├─ VerifiedIncidents
│  ├─ RejectedIncidents
│  └─ IncidentDetails
├─ UserManagement
├─ VerificationQueue
├─ NotificationBroadcast
├─ Analytics
├─ Reports
├─ Settings
└─ AuditLogs
```

## 10. Notification flow

### User-side push notification flow

1. Admin or system creates notification payload
2. Backend validates target region or user group
3. Notification is stored in Firestore
4. Matching device tokens are queried
5. FCM sends push message to active devices
6. App receives notification and updates alert feed

### Notification types

- emergency alert
- safety advice
- incident update
- verification outcome
- region broadcast

### Radius logic

A notification should be sent only to users within the relevant radius of the affected location or designated region.

## 11. Image upload flow

1. User captures or selects image
2. App validates file type and size
3. File is uploaded to Firebase Storage under a unique incident path
4. Storage returns download URL
5. Incident document stores URL
6. UI displays thumbnail and detail image
7. If upload fails, user sees retry or safe fallback state

## 12. Incident verification flow

1. Citizen submits incident
2. Incident enters pending state
3. Admin reviews incident in dashboard
4. Admin checks location, images, description, severity
5. Admin approves, rejects, or escalates
6. Verification entry is created
7. User is notified of outcome
8. If approved, incident becomes visible to nearby users
9. If rejected, status is recorded and not published

## 13. API structure

### Core endpoints

- POST /auth/register
- POST /auth/login
- POST /auth/forgot-password
- GET /users/:id
- PATCH /users/:id
- POST /incidents
- GET /incidents
- GET /incidents/:id
- PATCH /incidents/:id
- POST /incidents/:id/verify
- GET /notifications
- POST /notifications/broadcast
- GET /reports/hotspots
- POST /alerts/radius

### API design principles

- Validate all requests
- Return structured JSON responses
- Use consistent status codes
- Log admin actions
- Secure routes with role checks
- Centralize error handling

## 14. Security and validation strategy

- Require Firebase Auth for protected endpoints
- Validate file sizes and MIME types
- Validate geolocation ranges
- Prevent spoofed submissions by checking user session
- Restrict dashboard access by role
- Store only needed metadata for analytics

## 15. Testing strategy for Phase 1

Even in design phase, testing considerations should be planned:

- Unit tests for validators and reducers
- Integration tests for auth and incident creation
- UI tests for critical flows
- Performance tests for map loading and list rendering
- Security checks for permission rules
- Usability tests for hazardous emergency interactions

## 16. Critical design decisions

### Why Firebase?

Firebase directly supports the project goals: auth, Firestore, storage, FCM, and simple integration with React Native apps.

### Why modular feature-based mobile code?

It keeps screens, state, and backend interactions isolated, reducing debugging and improving testability.

### Why dashboard separation?

Admin verification and monitoring require a distinct role with elevated permissions and a different user experience than the citizen app.

### Why geolocation-centered design?

The core research value of the project is location-based awareness and targeted alerting.

## 17. Phase 1 acceptance checklist

- Architecture understood and approved
- Folder structure defined
- Firestore model finalized
- Authentication flows defined
- Navigation flow mapped
- App screens identified
- Dashboard screens defined
- Notification flow planned
- Image upload flow planned
- Verification flow defined
- Risks acknowledged and mitigated
- 30-day roadmap created

This completes the design gate before Phase 2 begins.
