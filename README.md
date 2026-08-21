# CrisisSync

CrisisSync is a mobile-first emergency management application for citizens and operators to report incidents, view crisis alerts, and coordinate response workflows using Supabase-backed realtime data.

## Project overview

The system supports:
- citizen incident reporting
- live emergency alerts
- admin review of incident reports
- structured incident workflow states
- location-aware alert relevance logic

## Architectural summary

### Phase 4.3: Command & Control (C2) Operations Dashboard
- **Admin Overhaul:** Upgraded the Admin tab from a basic CRUD list into a professional Operations Dashboard.
- **Triage & Category Distributions:** Provides at-a-glance visibility into crisis escalation (e.g., number of active CRITICAL incidents) and primary incident types.
- **Verification Latency:** Calculates the average response time taken to verify incidents using the immutable `incident_audit_logs`.
- **Operational Health:** A deterministic assessment that evaluates the system state (`NORMAL`, `WATCH`, `WARNING`, `CRITICAL`) based on verification backlogs and response latencies.
- **Algorithmic Triage Queue:** Sorts pending incidents by Escalation Level first, ensuring operators automatically focus on the most severe threats.

### Presentation layer
- React Native screens for authentication, incident reporting, alerts, admin review, and profile flows

### Application state
- Context-based app store for shared data such as alerts and incidents

### Business logic
- Shared services for incident submission and verification
- Shared workflow utilities for validation, alert formatting, and relevance logic

### Data layer
- Supabase authentication
- Supabase database tables for incidents and alerts
- Realtime subscriptions for live updates

## Current implementation status

The application now includes:
- a clearer incident-reporting workflow with validation
- a more structured alert presentation layer
- reusable business-logic utilities for incident handling
- regression tests for core workflow rules
- a location-aware crisis intelligence layer for distance, relevance, prioritization, and duplicate detection

## Key technical improvements applied

1. Shared validation and incident workflow logic
   - Centralised incident validation in a reusable utility
   - Prevents ad hoc validation scattered across UI components

2. Service-layer incident handling
   - Incident submission and verification are now handled through a dedicated service layer
   - This improves maintainability and supports academic explanation of the architecture

3. Professional alert presentation
   - Alerts now use clearer severity labels and relevance metadata
   - The UI is more suitable for a crisis-management system demonstration

4. Testing foundation
   - Added automated regression tests for incident validation and alert relevance logic

## Development and testing

Run the app:
```bash
cd mobile
npm start
```

Run tests:
```bash
cd mobile
npx jest --runInBand --watch=false
```

## Crisis Intelligence & Decision-Support Models

CrisisSync implements advanced, deterministic intelligence models rather than opaque AI to ensure that emergency response actions are transparent, explainable, and academically defensible.

### Confidence vs Priority vs Escalation

To model crisis responses correctly, the system deliberately separates three distinct concepts:
- **Confidence:** How trustworthy the information is (e.g., supported by visual evidence or verified by an administrator).
- **Priority:** How urgently the incident should be considered, based on threat vectors (e.g., high severity, extreme proximity, recent occurrence).
- **Escalation:** Whether the incident reaches the threshold to be moved to a higher operational response level or dispatched to emergency personnel.

### Crisis Priority Model
The `calculateCrisisPriority` function assigns a score out of 100 based on:
- **Severity** (up to 40 pts)
- **Distance** (up to 25 pts)
- **Recency** (up to 15 pts)
- **Verification/Context** (up to 20 pts, considering evidence and duplicate corroborations)

**Explainability:** The system translates this score into a tier (`Critical`, `High`, `Medium`, `Low`) and generates a dynamic human-readable explanation, ensuring that every prioritisation decision can be immediately audited by an operator.

### Escalation Engine
The `determineEscalation` utility uses the computed Priority Score alongside specific context rules to produce an actionable recommendation.

**Inputs:** Priority level/score, severity, verification status, proximity, and duplicate reports.
**Escalation Levels:** `CRITICAL`, `URGENT`, `REVIEW`, `MONITOR`, `NONE`.
**Rules Examples:**
- Unverified but highly prioritized incidents are capped at `REVIEW` to prevent automatic false-positive emergency dispatches.
- A verified `High` severity incident immediately triggers an `URGENT` escalation if close to the operator.

*Note: These are "decision-support operator recommendations" and system-generated prompts, NOT automated authoritative emergency dispatch commands.*

## Academic Significance (Master's Level)
CrisisSync demonstrates advanced software engineering concepts suitable for Master's-level evaluation:
1. **Separation of Concerns:** The application cleanly separates UI components from robust, testable business logic (Service and Intelligence layers).
2. **Deterministic Decision-Support Architecture:** Instead of building a basic CRUD app, CrisisSync implements multi-variate, rule-based algorithms capable of processing geospatial and temporal data to generate explainable crisis intelligence.
3. **Auditability & Integrity:** Through an append-only audit log architecture and explicit evidence tracking, the system models real-world compliance and accountability requirements found in enterprise emergency platforms.
4. **Security & RLS:** Granular Row-Level Security ensures that citizens, operators, and intelligence algorithms interact with the exact subset of data they are authorized to access.
5. **Comprehensive Testing:** Critical algorithmic decision paths (Confidence, Priority, Escalation) are covered by robust unit tests, demonstrating the reliability of the underlying mathematical models.
