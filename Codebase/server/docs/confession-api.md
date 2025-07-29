# Confession API Documentation

This document describes the REST API endpoints for the confession feature.

## Base URL

All endpoints are relative to: `/api`

## Authentication

- 🔓 **Public**: No authentication required
- 🔐 **Protected**: Requires JWT token in Authorization header: `Bearer <token>`

---

## Endpoints

### 1. Get All Confessions

🔓 **GET** `/confessions`

Fetch all confessions with optional filtering and pagination.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `tag` (optional): Filter by tag (e.g., "Academic Stress", "Hall Life")
- `sortBy` (optional): Sort order ("recent", "mostReacted", "mostVoted")

**Example Request:**

```bash
GET /api/confessions?page=1&limit=10&tag=Academic%20Stress&sortBy=recent
```

**Response:**

```json
[
  {
    "id": 1,
    "content": "I've been pretending to understand quantum physics...",
    "tag": "Academic Stress",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "reactions": {
      "like": 45,
      "funny": 23,
      "relatable": 67,
      "angry": 2,
      "insightful": 12
    },
    "poll": {
      "id": 1,
      "question": "How many of you fake understanding complex topics?",
      "totalVotes": 346,
      "options": [
        {
          "id": 1,
          "text": "All the time",
          "votes": 156,
          "percentage": 45
        }
      ]
    }
  }
]
```

### 2. Get Single Confession

🔓 **GET** `/confessions/:id`

Fetch a specific confession by ID.

**Example Request:**

```bash
GET /api/confessions/123
```

**Response:** Same structure as single confession above.

### 3. Get Random Confession

🔓 **GET** `/confessions/random`

Fetch a random confession from the database.

**Response:** Same structure as single confession above.

### 4. Get Analytics

🔓 **GET** `/confessions/analytics`

Get confession statistics and analytics.

**Response:**

```json
{
  "totalConfessions": 150,
  "topTags": [
    { "tag": "Academic Stress", "count": 45 },
    { "tag": "Hall Life", "count": 38 },
    { "tag": "Funny", "count": 32 }
  ],
  "mostReacted": {
    "confession": {
      /* confession object */
    },
    "total": 234
  },
  "mostVotedPoll": {
    "poll": { "totalVotes": 500 }
  }
}
```

### 5. Create Confession

🔐 **POST** `/confessions`

Create a new confession (anonymous, but user must be authenticated).

**Request Body:**

```json
{
  "content": "This is my confession content...",
  "tag": "Academic Stress",
  "poll": {
    "question": "Do you agree with this?",
    "options": [
      { "text": "Yes, absolutely" },
      { "text": "No, disagree" },
      { "text": "Maybe" }
    ]
  }
}
```

**Notes:**

- `content` and `tag` are required
- `poll` is optional
- Poll options are automatically ordered by array index

**Response:** Returns the created confession object.

### 6. Add Reaction

🔐 **POST** `/confessions/:id/reactions`

Add a reaction to a confession.

**Request Body:**

```json
{
  "reactionType": "like"
}
```

**Valid Reaction Types:**

- `like`
- `funny`
- `relatable`
- `angry`
- `insightful`

**Response:** Returns updated confession object.

**Error Responses:**

- `409 Conflict`: User already reacted with this type
- `400 Bad Request`: Invalid reaction type

### 7. Remove Reaction

🔐 **DELETE** `/confessions/:id/reactions`

Remove a user's reaction from a confession.

**Request Body:**

```json
{
  "reactionType": "like"
}
```

**Response:** Returns updated confession object.

### 8. Get User Reactions

🔐 **GET** `/confessions/:id/user-reactions`

Get the current user's reactions to a specific confession.

**Response:**

```json
{
  "reactionTypes": ["like", "relatable"]
}
```

### 9. Vote on Poll

🔐 **POST** `/confessions/:id/polls/:pollId/vote`

Vote on a confession poll.

**Request Body:**

```json
{
  "optionId": 123
}
```

**Response:** Returns updated confession object with updated poll data.

**Error Responses:**

- `409 Conflict`: User already voted on this poll
- `400 Bad Request`: Missing optionId

### 10. Check User Vote Status

🔐 **GET** `/confessions/polls/:pollId/user-voted`

Check if the current user has voted on a specific poll.

**Response:**

```json
{
  "hasVoted": true
}
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "message": "Human-readable error message",
  "error": "Detailed error information"
}
```

**Common HTTP Status Codes:**

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Invalid/expired token
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate action (already reacted/voted)
- `500 Internal Server Error`: Server error

---

## Usage Examples

### Frontend Integration

```javascript
// Fetch confessions
const confessions = await fetch("/api/confessions?sortBy=recent&limit=10");

// Create confession
const newConfession = await fetch("/api/confessions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    content: "My confession...",
    tag: "Academic Stress",
  }),
});

// Add reaction
const reaction = await fetch(`/api/confessions/${id}/reactions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    reactionType: "like",
  }),
});

// Vote on poll
const vote = await fetch(
  `/api/confessions/${confessionId}/polls/${pollId}/vote`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      optionId: optionId,
    }),
  }
);
```

---

## Database Schema Reference

The API uses the following Prisma models:

- `Confession`: Main confession data
- `ConfessionReaction`: User reactions to confessions
- `ConfessionPoll`: Optional polls attached to confessions
- `ConfessionPollOption`: Poll options
- `ConfessionPollVote`: User votes on polls

The schema ensures:

- Users can only react once per reaction type per confession
- Users can only vote once per poll
- Proper cascade deletion when confessions are removed
- Anonymous confession authorship (no user relation to confession)
