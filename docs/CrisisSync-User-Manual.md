# CrisisSync User Manual

## 1. Project Overview

CrisisSync is a mobile-first emergency management application designed to help citizens report incidents, view emergency alerts, and let operators or administrators manage crisis situations efficiently. The platform combines mobile reporting, role-based access, location awareness, event tracking, and operational triage into a single real-time system.

The system is built with:
- React Native + Expo for mobile frontend
- Supabase for authentication, database, and real-time data
- Role-based access control
- Incident workflow logic and audit logging
- Alerting, dispatch, and crisis intelligence features

The main goal of the application is to improve emergency response speed, transparency, and coordination.

---

## 2. Purpose of the Project

The project solves a real-world problem: emergency information is often delayed, unstructured, or scattered across different sources.

CrisisSync addresses this by providing:
- a quick way for users to report incidents
- live crisis alerts for nearby users
- a structured workflow for admin review
- intelligent priority scoring for emergencies
- operator dispatch support and audit tracking

This makes the system useful for emergency response coordination, citizen awareness, and operational decision support.

---

## 3. Target Users

The application supports multiple user types:

### 3.1 Citizen / Reporter
A citizen can register, log in, and submit crisis incidents from the mobile app. They may also view alerts and monitor nearby emergency information.

### 3.2 Operator
An operator receives assigned response tasks and acts on dispatched incidents. They may view assigned missions and update response states depending on the workflow.

### 3.3 Administrator / Admin
An admin monitors all incidents, filters and prioritizes them, verifies reports, rejects false alarms, escalates critical cases, and dispatches response teams.

### 3.4 System / Intelligence Layer
The system uses rule-based intelligence to score incident risk, detect duplicates, determine escalation thresholds, and recommend response actions.

---

## 4. System Features

CrisisSync contains a wide range of features. The following sections explain them in detail.

---

## 5. User Authentication Features

### 5.1 Login
Users can log in with their account credentials.

Features include:
- session check on app start
- redirect to authenticated dashboard if valid session exists
- loading state while authentication is restored

### 5.2 Registration
New users can create an account using email and password-based registration.

### 5.3 Forgot Password
Users can request password recovery if they forget their password.

### 5.4 Session Management
At startup, the app checks whether the user is already logged in. If yes, the app loads the main dashboard directly. If not, the app redirects the user to the authentication flow.

### 5.5 Role Access Control
The app uses role-based access to determine whether a user can access admin functionality. This is controlled through the app store and database profiles.

---

## 6. Home and General User Features

### 6.1 Main Dashboard
After login, users access the main tabbed interface:
- Home
- Map
- Report
- Alerts
- Profile
- Admin (if authorized)

### 6.2 Home Screen
The Home screen gives a summarized view of active incidents, alerts, and recent activity. It acts as the main landing page for users and operators.

### 6.3 Profile Management
Users can manage their profile information and preferences, including:
- name
- email
- notification radius
- alert preferences
- SMS backup settings

This helps users personalize the emergency updates they receive.

---

## 7. Incident Reporting Features

### 7.1 Report an Incident
The Report screen allows users to submit new incidents. Fields usually include:
- title
- description
- category
- severity
- location
- latitude and longitude
- distance from the user (if available)
- status

### 7.2 Incident Validation
Before an incident is saved, the system validates the input. This prevents incomplete or invalid reports from being added to the database.

The validation checks may include:
- required fields
- proper length of title/description
- valid severity/category values
- valid status transition logic

### 7.3 Incident Status Workflow
The project supports a workflow for incident lifecycle management, such as:
- Pending
- Verified
- Active
- Rejected
- Resolved

The logic ensures incidents cannot be advanced incorrectly. For example, a report cannot be directly marked “Resolved” without first being validated.

### 7.4 Distance and Location Handling
The app records location coordinates and calculates distance from the user or reporting area. This is important for relevance and risk analysis.

### 7.5 User-owned Incidents
The app can load incidents created by the logged-in user. This is useful for personal tracking and incident history.

---

## 8. Alert Features

### 8.1 Live Emergency Alerts
The alerts system loads crisis-related alerts from the backend and shows them in the app.

### 8.2 Alert Loading and Error States
The app tracks:
- alerts loading state
- alert errors
- success update state

This ensures users get a clear experience when data is unavailable or delayed.

### 8.3 Real-time Updates
The app subscribes to alert updates in real time using Supabase channels. This allows the app to receive new alerts without manual refresh.

### 8.4 Alert Relevance Logic
The app can determine whether an alert is relevant to a user based on:
- distance
- locality
- severity
- category
- personal notification radius

This makes the system more useful during actual emergencies, as only relevant alerts may be surfaced to the user.

---

## 9. Map Features

### 9.1 Map Screen
The app includes a Map tab for location-based incident display.

### 9.2 Incident Markers
Incident locations can be visualized on the map. This helps users and administrators understand where incidents are happening geographically.

### 9.3 Location-Aware Crisis Intelligence
By using coordinates and distances, the system can:
- prioritize nearby incidents
- detect duplicates
- assess incident urgency
- identify relevant crisis zones

### 9.4 Incident Bottom Sheet / Detail Access
On the map, users may tap incident markers or summaries and access more details about each incident.

---

## 10. Incident Detail Screen Features

This is one of the most important and feature-rich screens in the app.

### 10.1 Incident Overview Section
Displays:
- title
- description
- incident type/category
- severity
- status
- location

### 10.2 Operational Priority Overview
Shows:
- priority level
- score
- explanation

This helps explain why an incident is considered high-priority or low-priority.

### 10.3 Confidence Assessment
The system evaluates how reliable the incident is based on:
- evidence availability
- verification state
- source information

The confidence result explains whether a report is trustworthy.

### 10.4 Escalation Recommendation
The app estimates whether the incident should be escalated to a higher operational concern.

Examples of escalation logic include:
- high severity with serious risk
- verified incident near the user
- repeated similar reports
- incident age and urgency patterns

### 10.5 Response Recommendation
This section suggests the most suitable action for the incident, such as:
- immediate response
- urgent response
- routine review
- monitoring only

### 10.6 Evidence Upload
Users and administrators may attach supporting files:
- images
- videos
- PDFs

This strengthens the evidence trail and improves decision quality.

### 10.7 Response Assignment Details
If a response has been dispatched, the screen shows:
- assigned operator
- response status
- notes
- dispatch information

### 10.8 Audit Log History
All important actions are displayed here, such as:
- incident reported
- verified
- changed status
- escalated
- rejected
- response dispatched

This keeps the record transparent and accountable.

---

## 11. Admin Features

### 11.1 Admin Dashboard
Admin users access a dedicated operations dashboard that shows a centralized overview of crisis activity.

It includes:
- active incidents
- pending review incidents
- escalation distribution
- category distribution
- operational health
- verification latency metrics
- sorting queue

### 11.2 Incident Search and Filters
Admin users can filter incidents by:
- search text
- status
- severity
- category

This makes triage faster and more organized.

### 11.3 Operational Health Monitoring
The admin dashboard calculates the system’s health using metrics such as:
- number of active incidents
- number of pending items
- backlog size
- time taken to verify incidents

Health states can be:
- NORMAL
- WATCH
- WARNING
- CRITICAL

### 11.4 Incident Triage Queue
Incidents are prioritized using escalation logic. More serious incidents appear first in the queue so operators can act faster.

### 11.5 Incident Verification
Administrators can verify valid incidents after checking details and supporting evidence.

When a report is verified:
- status changes to Verified
- audit record is written
- the system may update priority and operational status

### 11.6 Rejecting False or Invalid Reports
Admin users can reject false or low-quality reports with a reason. This helps reduce noise and keeps the system clean and trustworthy.

### 11.7 Escalation to Active Status
If an incident is urgent, the admin can escalate it to an active status. This signals operational attention and can trigger response coordination.

### 11.8 Resolution of Incidents
When a crisis is handled or deemed resolved, the admin can mark the report as Resolved.

---

## 12. Dispatch Features

### 12.1 Dispatch Response Modal
Admin users can open a dispatch dialog for an incident and choose an operator.

The modal includes:
- incident title and details
- list of eligible operators
- selection of assigned operator
- optional dispatch notes
- confirm dispatch button

### 12.2 Operator Selection
Admins pick the most suitable operator from a list of eligible users. The system may filter based on access permissions or role.

### 12.3 Dispatch Notes
Admin can add additional instructions such as:
- what to check
- which route to use
- support request details
- urgency information

### 12.4 Response Record Creation
A response record is created in the backend when a dispatch is confirmed.

This record stores:
- incident ID
- assigned operator
- response status
- notes
- timestamps

### 12.5 Notification Support
The system can send a response notification to the assigned operator after dispatch.

This improves real-time coordination and ensures the worker receives the assignment.

---

## 13. Operator Features

### 13.1 Assigned Response View
Operators can access their assigned incidents and response records.

### 13.2 Response Workflow States
The response lifecycle supports states such as:
- Dispatched
- Acknowledged
- On Scene
- Completed
- Cancelled

### 13.3 Operator Response Screen
This screen allows operators to check their active assignments and manage them according to current status.

### 13.4 Authorization Rules
Only authorized users can take certain actions:
- admins can dispatch responses
- operators can acknowledge and update assigned work
- citizens can report and view their own incidents

---

## 14. Crisis Intelligence and Decision Support Features

This is one of the most advanced parts of the project.

### 14.1 Priority Calculation
The system calculates a priority score for each incident based on:
- severity
- distance from affected area
- recency of report
- verification quality
- evidence and duplicates

This score is used to prioritize incidents in the triage queue.

### 14.2 Escalation Engine
A deterministic logic engine decides whether an incident should escalate. It evaluates:
- priority score
- severity
- verification status
- proximity to danger
- duplicate report count
- current incident status

### 14.3 Confidence Model
The confidence model estimates how trustworthy a report is. It may use factors like:
- available evidence
- whether the report is verified
- duplication patterns
- context information

### 14.4 Duplicate Detection
The app can look for similar reports and identify potential duplicates. This is useful in crisis scenarios when multiple reporters submit the same incident.

### 14.5 Explainable Recommendations
The system does not simply “guess.” It provides explanations for:
- priority level
- escalation decision
- recommended response

This makes the application more transparent and academically useful.

---

## 15. Audit and Accountability Features

### 15.1 Incident Audit Logs
Every major change is tracked and logged. This includes:
- report created
- status updated
- escalated
- verified
- rejected
- response assigned

### 15.2 Usefulness of Audit Logs
Audit logs are useful for:
- accountability
- legal and compliance review
- operational tracking
- debugging issues
- explaining decisions to administrators

### 15.3 Append-Only Recording Pattern
The system is designed to keep an append-only history rather than overwrite critical event information. This is important for trustworthy system records.

---

## 16. Data and Backend Features

### 16.1 Supabase Integration
The application connects to Supabase for:
- authentication
- database storage
- real-time subscriptions
- role-based access controls

### 16.2 Row-Level Security (RLS)
The database uses row-level security policies so that users only access data relevant to their role and account scope.

This improves:
- privacy
- access control
- security

### 16.3 Realtime Data Subscription
The app listens to changes in incidents and alerts so users see updates without refreshing manually.

---

## 17. App Navigation and User Flow

### 17.1 Navigation Structure
The app includes the following route flow:
- Login / Register / Forgot Password
- Main tabs after authentication
- Incident Detail screen
- Alert Detail screen
- Operator Response screen
- Admin area

### 17.2 User Journey
Typical user journey:
1. Open app
2. Login or register
3. View alerts and home info
4. Navigate to report screen
5. Create incident
6. Receive or view crisis info
7. View incident detail and evidence
8. Admin verifies or dispatches response
9. Incident resolves or remains active

---

## 18. Technical Architecture Summary

### Frontend Layer
- React Native screens
- Expo
- Navigation containers
- UI components

### State Layer
- App store with session, incidents, alerts, profile, and roles

### Business Logic Layer
- validation utilities
- escalation logic
- crisis intelligence logic
- response logic

### Data Layer
- Supabase tables
- incident records
- response records
- audit logs
- profiles

---

## 19. Key Project Strengths

The project is strong because it provides:
- proper separation of concerns
- user and admin role structure
- operational workflow for emergency processing
- real-time updates
- evidence-based decisions
- audit trail and accountability
- explainable risk and escalation logic

This makes it more than a simple demo project; it behaves similarly to a real emergency response platform.

---

## 20. Best Way to Demonstrate the Project in Class

When presenting the project, explain it in this order:

1. Problem description
2. Project objective
3. Main user roles
4. Incident reporting flow
5. Alerts and map capabilities
6. Admin dashboard and triage
7. Dispatch workflow
8. Intelligence and escalation logic
9. Audit tracking and security
10. Final outcomes and value

This flow makes the application easy to understand for classmates and teachers.

---

## 21. Example Presentation Summary

“CrisisSync is a mobile emergency management application that helps citizens report incidents, receive relevant alerts, and lets admins verify and coordinate crisis responses. It includes incident reporting, map integration, alerting, audit tracking, operator dispatch, and rule-based crisis intelligence. The app is designed to improve speed, transparency, and decision-making during emergency situations.”

---

## 22. Conclusion

CrisisSync is a complete crisis management system that combines emergency reporting, monitoring, intelligence, and response coordination. It is useful for demonstrating practical mobile app development, backend integration, authentication, real-time data, workflow engineering, and decision-support design.

This project is valuable not only as a student project but also as a working model of how emergency systems can be organized in a digital environment.

---

## 23. Quick Feature Summary

Key features at a glance:
- user registration and login
- incident reporting
- data validation
- alert system
- map visualization
- incident detail analysis
- evidence upload
- priority scoring
- escalation logic
- admin dashboard
- incident verification
- reject and resolve actions
- operator dispatch
- response tracking
- audit logging
- real-time updates
- role-based authorization

---

## 24. Final Note

This manual should be used as a guide for understanding the full lifecycle of the application, from user reporting to admin response and final resolution. It highlights both the practical functionality and the engineering logic behind the project.
