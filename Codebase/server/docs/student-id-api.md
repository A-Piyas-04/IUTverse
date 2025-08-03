# Student ID CRUD Operations - API Documentation

This document describes the complete CRUD (Create, Read, Update, Delete) operations for managing student IDs in the IUTverse backend.

## Overview

The student ID is stored in the `User` model as an optional, unique field. These endpoints allow users to manage their student ID information with proper validation and security.

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Update/Create Student ID

**Endpoint:** `PUT /api/user/student-id`
**Method:** PUT
**Auth:** Required

Updates or sets the student ID for the authenticated user.

**Request Body:**

```json
{
  "studentId": "string"
}
```

**Validation Rules:**

- Student ID is required and must be a non-empty string
- Only letters, numbers, and hyphens are allowed
- Length must be between 3 and 20 characters
- Must be unique across all users

**Success Response (200):**

```json
{
  "message": "Student ID updated successfully",
  "user": {
    "id": 1,
    "email": "user@iut-dhaka.edu",
    "name": "John Doe",
    "department": "CSE",
    "batch": 2024,
    "studentId": "CSE-2024-001",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- `400`: Invalid input (validation errors)
- `409`: Student ID already exists
- `404`: User not found
- `500`: Internal server error

---

### 2. Get Current User's Student ID

**Endpoint:** `GET /api/user/student-id`
**Method:** GET
**Auth:** Required

Retrieves the student ID of the authenticated user.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "studentId": "CSE-2024-001"
  }
}
```

**Note:** `studentId` will be `null` if not set.

---

### 3. Delete Student ID

**Endpoint:** `DELETE /api/user/student-id`
**Method:** DELETE
**Auth:** Required

Removes/clears the student ID for the authenticated user.

**Success Response (200):**

```json
{
  "message": "Student ID removed successfully",
  "user": {
    "id": 1,
    "email": "user@iut-dhaka.edu",
    "name": "John Doe",
    "department": "CSE",
    "batch": 2024,
    "studentId": null,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 4. Check Student ID Availability

**Endpoint:** `GET /api/user/student-id/check/:studentId`
**Method:** GET
**Auth:** Required

Checks if a student ID is available (not taken by another user).

**URL Parameters:**

- `studentId`: The student ID to check

**Success Response (200):**

```json
{
  "success": true,
  "available": true,
  "studentId": "CSE-2024-002"
}
```

**Use Case:** Form validation on frontend to show real-time availability.

---

### 5. Get User by Student ID

**Endpoint:** `GET /api/user/by-student-id/:studentId`
**Method:** GET
**Auth:** Required

Finds a user by their student ID.

**URL Parameters:**

- `studentId`: The student ID to search for

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 2,
    "email": "jane@iut-dhaka.edu",
    "name": "Jane Smith",
    "department": "EEE",
    "batch": 2023,
    "studentId": "EEE-2023-015",
    "createdAt": "2024-01-10T08:20:00.000Z"
  }
}
```

**Error Response (404):**

```json
{
  "message": "User not found with this student ID"
}
```

## Frontend Integration

### Example Usage in React/JavaScript

```javascript
// API service functions
const studentIdAPI = {
  // Update student ID
  update: async (studentId) => {
    const response = await fetch("/api/user/student-id", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ studentId }),
    });
    return response.json();
  },

  // Get current user's student ID
  get: async () => {
    const response = await fetch("/api/user/student-id", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return response.json();
  },

  // Delete student ID
  delete: async () => {
    const response = await fetch("/api/user/student-id", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return response.json();
  },

  // Check availability
  checkAvailability: async (studentId) => {
    const response = await fetch(`/api/user/student-id/check/${studentId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return response.json();
  },

  // Find user by student ID
  findUser: async (studentId) => {
    const response = await fetch(`/api/user/by-student-id/${studentId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return response.json();
  },
};
```

### Form Validation Example

```javascript
const validateStudentId = (studentId) => {
  const errors = [];

  if (!studentId || studentId.trim().length === 0) {
    errors.push("Student ID is required");
  }

  const trimmed = studentId.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    errors.push("Student ID must be between 3 and 20 characters");
  }

  if (!/^[A-Za-z0-9-]+$/.test(trimmed)) {
    errors.push("Student ID can only contain letters, numbers, and hyphens");
  }

  return errors;
};
```

## Database Schema

The student ID is stored in the `User` table:

```prisma
model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  studentId String? @unique  // Optional and unique
  // ... other fields
}
```

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT token
2. **User Isolation**: Users can only manage their own student ID
3. **Uniqueness Enforced**: Database constraint prevents duplicate student IDs
4. **Input Validation**: Server-side validation prevents malicious input
5. **Rate Limiting**: Consider implementing rate limiting for availability checks

## Error Handling

All endpoints return consistent error formats:

```json
{
  "message": "Descriptive error message",
  "error": "Additional error details (in development)"
}
```

Common HTTP status codes:

- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `404`: Not Found
- `409`: Conflict (duplicate student ID)
- `500`: Internal Server Error

## Testing

Use the provided test file to verify functionality:

```bash
cd server/test
node student-id-routes-test.js
```

Make sure to:

1. Start your server
2. Update the BASE_URL in the test file
3. Get a valid JWT token from login
4. Update the authToken variable in the test file
