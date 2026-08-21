# CrisisSync Project Brief

## 1. Project Aim

Develop, implement, and evaluate a cross-platform mobile application that facilitates real-time disaster reporting, live mapping visualization, and geo-localized emergency notifications using crowd-generated geolocation data.

## 2. Objectives

### Primary objective

Create a cross-platform mobile application for real-time disaster reporting, mapping, and emergency notification using crowdsourced geolocation.

### Supporting objectives

1. Establish theoretical foundations through a literature review on mobile emergency systems, GIS-based disaster management, and crowdsourced reporting.
2. Analyse existing platforms and elicit detailed system requirements.
3. Design system architecture, database schema, and UI/UX prototypes.
4. Build the complete system using the selected technologies.
5. Test the system for conformance to requirements.
6. Evaluate the results against project goals and learning outcomes.

## 3. Functional Requirements

### Mobile app functional requirements

1. User registration and login
2. Password recovery
3. User profile creation and editing
4. Incident creation with title, description, category, severity, geolocation, time, and media
5. Image upload for reported incidents
6. Nearest incidents and map-based discovery
7. Incident detail view
8. Search and filtering by category, date, severity, and radius
9. History of user-reported incidents
10. Emergency alert display and notification feed
11. Radius-based alerting for nearby users
12. Settings and notification preferences
13. Logout
14. Current location access
15. Map view with markers and incident clusters
16. Push notification subscription

### Admin dashboard functional requirements

1. Secure login for administrators
2. Incident management and review queue
3. Verification workflow for reported incidents
4. User management
5. Notification broadcasting
6. Heatmap and hotspot analysis
7. Analytics and report generation
8. Settings and role configuration

### Shared system capabilities

1. Real-time synchronization of incident data
2. Verified/unverified incident states
3. Location-based filtering and proximity search
4. Media storage
5. Role-based permissions
6. Audit logging of actions

## 4. Non-Functional Requirements

1. Performance: fast map rendering and quick report submission
2. Availability: reliable access during active incidents
3. Scalability: support for many concurrent users and reports
4. Security: secure authentication, authorization, validation, and input sanitization
5. Reliability: consistent updates and resilient error handling
6. Usability: clear information flow for stressed users
7. Accessibility: readable UI, contrast, touch targets, and inclusive usage
8. Maintainability: modular code and reusable patterns
9. Privacy: minimization of personal data and secure handling of location data
10. Data integrity: prevention of duplicate or misleading reports

## 5. Deliverables

- Project proposal
- Literature review
- SRS document
- SDD document
- Project blueprint
- Design prototypes
- Source code repository
- Executable app and backend deployment
- Test report
- Project evaluation report
- Final presentation
- Final thesis

## 6. Technologies

### Mobile

- React Native
- Expo
- TypeScript
- React Navigation

### Backend

- Node.js
- Express
- Firebase Firestore
- Firebase Auth
- Firebase Storage
- Firebase Cloud Messaging

### Maps and geolocation

- Google Maps API
- Geolocation API

### Frontend dashboard

- React
- Material UI

### Infrastructure and tooling

- Firebase
- Google Cloud Platform
- GitHub
- Jest
- React Native Testing Library
- Apache JMeter

## 7. Testing Requirements

### Required testing types

- Unit testing
- Integration testing
- Performance testing
- Usability testing
- Security review
- Bug fixing and optimization

### Acceptance focus

- Functional completeness
- Performance targets
- Usability above average SUS score
- Technical quality and defect control
- Documentation completeness

## 8. Dissertation Requirements

The final dissertation must include:

- Introduction
- Literature review
- Methodology
- Implementation
- Testing
- Evaluation
- Limitations
- Future work
- Conclusion
- References
- Presentation slides and demo preparation
- Viva preparation materials

The writing must be consistent with the implemented system and supported by evidence.

## 9. Risks

1. Time constraints under a 30-day schedule
2. Incomplete backend integration
3. Map API or Firebase configuration issues
4. Notification reliability problems
5. Data quality issues from crowdsourced reports
6. Verification bottlenecks
7. Privacy concerns around location tracking
8. Scope creep from overbuilding features beyond MVP

## 10. Evaluation Criteria

The project is considered successful if it demonstrates:

- Functional completeness
- System performance and scalability
- Usability and accessibility
- Technical quality
- Documentation completeness
- Achievement of learning outcomes

## 11. Summary

CrisisSync is designed to close the gap between official emergency alerts and real-time public information by combining crowdsourced incident reporting, live GIS mapping, verification, and targeted location-based notifications in one integrated system.
