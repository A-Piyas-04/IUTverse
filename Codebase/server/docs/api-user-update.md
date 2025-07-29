# User Update API Documentation

## PUT /api/user

Updates the authenticated user's name in the user table.

### Authentication

- **Required**: Yes
- **Type**: Bearer Token (JWT)
- **Header**: `Authorization: Bearer <token>`

### Request Body

```json
{
  "name": "string"
}
```

### Request Body Parameters

| Parameter | Type   | Required | Description               | Constraints                |
| --------- | ------ | -------- | ------------------------- | -------------------------- |
| `name`    | string | Yes      | The new name for the user | 2-50 characters, non-empty |

### Success Response

**Status Code**: `200 OK`

```json
{
  "message": "Name updated successfully",
  "user": {
    "id": 1,
    "email": "user@iut-dhaka.edu",
    "name": "John Doe",
    "department": "CSE",
    "batch": 2023,
    "studentId": "210123456",
    "updatedAt": "2025-01-28T12:00:00.000Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Input

```json
{
  "message": "Name is required and must be a non-empty string"
}
```

```json
{
  "message": "Name must be at least 2 characters long"
}
```

```json
{
  "message": "Name must not exceed 50 characters"
}
```

#### 401 Unauthorized - Missing Token

```json
{
  "message": "Access token required"
}
```

#### 403 Forbidden - Invalid/Expired Token

```json
{
  "message": "Invalid token"
}
```

```json
{
  "message": "Token has expired"
}
```

#### 404 Not Found - User Not Found

```json
{
  "message": "User not found"
}
```

#### 500 Internal Server Error

```json
{
  "message": "Internal server error. Please try again."
}
```

### Example Usage

#### Using cURL

```bash
curl -X PUT http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{"name": "John Doe"}'
```

#### Using JavaScript (Fetch API)

```javascript
const response = await fetch("http://localhost:3000/api/user", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    name: "John Doe",
  }),
});

const result = await response.json();
console.log(result);
```

#### Using Axios

```javascript
const response = await axios.put(
  "http://localhost:3000/api/user",
  { name: "John Doe" },
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

### Notes

- The name field in the User table will be updated directly
- The API validates that the name is between 2-50 characters
- Leading and trailing whitespace is automatically trimmed
- Only authenticated users can update their own name
- The user ID is extracted from the JWT token, so users can only update their own information

### Testing

You can test this API using the provided test script:

```bash
node tests/server/test-user-update.js
```

Make sure to update the test credentials in the script before running.
