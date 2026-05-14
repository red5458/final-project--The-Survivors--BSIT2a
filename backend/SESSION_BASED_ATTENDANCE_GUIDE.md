# Session-Based Attendance System Documentation

## Overview

The attendance system has been upgraded to support:

1. **Session-based attendance** - attendance tied to specific class sessions on specific dates
2. **Class rosters** - student enrollment in classes with validation
3. **Automatic absence marking** - students not checked in by session end are marked absent
4. **Per-class attendance** - separate attendance tracking for each class

---

## New Concepts

### AttendanceSession

A session represents a specific class at a specific date/time. Teachers create sessions before class starts.

**Fields:**

- `sessionDate` - The date of the session
- `className` - Name of the class (e.g., "Biology 101")
- `startTime` - Class start time (HH:MM format)
- `endTime` - Class end time (HH:MM format)
- `allowanceMinutes` - Grace period for "On-Time" status (default: 5 min)
- `status` - 'open' or 'closed'

### ClassRoster

A roster entry links a student to a class. Students can only check in to sessions for classes they're enrolled in.

**Fields:**

- `className` - The class name
- `student` - Reference to User
- `studentId` - Student ID string
- `isActive` - Whether the enrollment is active

### Attendance (Updated)

Attendance records now reference a session instead of being a continuous stream.

**New Fields:**

- `session` - Reference to AttendanceSession
- `markedByAdmin` - `true` if marked absent automatically, `false` if student checked in

---

## Workflow

### Step 1: Teacher/Admin Sets Up Class Roster

Enroll students in a class:

```
POST /api/roster/enroll
Headers: Authorization: Bearer {token}
Body: {
  "studentId": "2026-1234-56789",
  "className": "Biology 101"
}
```

### Step 2: Teacher Creates Attendance Session

Before class, create a session:

```
POST /api/sessions
Headers: Authorization: Bearer {token}
Body: {
  "sessionDate": "2026-05-14T09:00:00Z",
  "className": "Biology 101",
  "startTime": "09:00",
  "endTime": "10:30",
  "allowanceMinutes": 5,
  "notes": "Regular lecture"
}
```

Response includes `sessionId`.

### Step 3: Students Check In to Session

Students check in during class using the session ID:

```
POST /api/attendance/checkin-session
Headers: Authorization: Bearer {token}
Body: {
  "sessionId": "{sessionId}",
  "subject": "Biology 101",
  "notes": "Present"
}
```

**Status Classification:**

- `Early` - check-in before class start time
- `On-Time` - check-in up to `allowanceMinutes` after start
- `Late` - check-in after allowance but before end time
- `Absent` - check-in after end time

### Step 4: Teacher Closes Session

After class, close the session to auto-mark absences:

```
POST /api/sessions/{sessionId}/close
Headers: Authorization: Bearer {token}
```

**What happens:**

- Students with no check-in are marked `Absent`
- A record is created for each missing student with `markedByAdmin: true`

---

## API Endpoints

### Sessions

| Method | Endpoint                   | Role           | Purpose                                             |
| ------ | -------------------------- | -------------- | --------------------------------------------------- |
| POST   | `/api/sessions`            | teacher, admin | Create session                                      |
| GET    | `/api/sessions`            | any            | Get sessions (query: className, startDate, endDate) |
| GET    | `/api/sessions/{id}`       | any            | Get session details + attendance                    |
| POST   | `/api/sessions/{id}/close` | teacher, admin | Close session, mark absences                        |

### Roster

| Method | Endpoint                        | Role           | Purpose                 |
| ------ | ------------------------------- | -------------- | ----------------------- |
| POST   | `/api/roster/enroll`            | admin          | Enroll student in class |
| GET    | `/api/roster/class/{className}` | teacher, admin | Get class roster        |
| DELETE | `/api/roster/{rosterEntryId}`   | admin          | Unenroll student        |
| GET    | `/api/roster`                   | teacher, admin | Get all classes         |

### Attendance

| Method | Endpoint                          | Role           | Purpose                           |
| ------ | --------------------------------- | -------------- | --------------------------------- |
| POST   | `/api/attendance/checkin-session` | student        | Check in to session (NEW)         |
| POST   | `/api/attendance/checkin`         | student        | Legacy check-in (backward compat) |
| GET    | `/api/attendance/my-attendance`   | student        | Get your records                  |
| GET    | `/api/attendance`                 | teacher, admin | Get all attendance                |
| GET    | `/api/attendance/stats`           | teacher, admin | Get today's stats                 |
| GET    | `/api/attendance/student-summary` | teacher, admin | Summary per student               |

---

## Example: Complete Daily Flow

### 8:45 AM - Teacher creates session

```json
POST /api/sessions
{
  "sessionDate": "2026-05-14",
  "className": "Biology 101",
  "startTime": "09:00",
  "endTime": "10:30",
  "allowanceMinutes": 5
}
→ Returns sessionId: "60d5ec49c1234567890abcde"
```

### 9:02 AM - Student (Mary) checks in (On-Time)

```json
POST /api/attendance/checkin-session
{
  "sessionId": "60d5ec49c1234567890abcde",
  "subject": "Biology 101"
}
→ Returns status: "On-Time"
```

### 9:25 AM - Student (John) checks in (Late)

```json
POST /api/attendance/checkin-session
{
  "sessionId": "60d5ec49c1234567890abcde",
  "subject": "Biology 101"
}
→ Returns status: "Late"
```

### 10:35 AM - Teacher closes session

```
POST /api/sessions/60d5ec49c1234567890abcde/close
→ Marks any non-checked-in students as "Absent"
→ Returns absencesCreated: 18 (e.g., if 20 total roster, 2 checked in)
```

---

## Backward Compatibility

The old `/api/attendance/checkin` endpoint still works for legacy check-ins (single daily check-in, global schedule). Use this if you're not ready to transition to sessions.

---

## Status Codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 201  | Success - record created                |
| 400  | Bad request - validation error          |
| 403  | Forbidden - not enrolled or wrong role  |
| 404  | Not found - session or record not found |

---

## Key Business Rules

1. **One check-in per session per student** - duplicate check-ins to same session rejected
2. **Roster validation** - student must be enrolled to check in
3. **Session must be open** - can't check in to closed session
4. **Auto-absence on close** - all non-checked-in roster students get marked absent
5. **Status is time-based** - depends on check-in time vs. session start/end times

---

## Migration Notes

- **Old attendance records**: Not tied to sessions. Still queryable via `/api/attendance`.
- **New records**: Use session-based flow for accurate per-class tracking.
- **Gradual adoption**: Use both legacy and session-based methods during transition.
