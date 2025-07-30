# Profile Picture APIs

## Overview

These APIs handle profile and cover picture operations for user profiles.

## Endpoints

### Upload Profile Picture

**POST** `/api/profile/upload-profile-picture`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body:**

- `profilePicture`: Image file (jpeg, jpg, png, gif, webp)
- Max file size: 5MB

**Response:**

```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "profilePicture": "/uploads/profile-pictures/uuid-filename.jpg"
  }
}
```

### Upload Cover Picture

**POST** `/api/profile/upload-cover-picture`

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body:**

- `coverPicture`: Image file (jpeg, jpg, png, gif, webp)
- Max file size: 5MB

**Response:**

```json
{
  "success": true,
  "message": "Cover picture uploaded successfully",
  "data": {
    "coverPicture": "/uploads/cover-pictures/uuid-filename.jpg"
  }
}
```

### Delete Profile Picture

**DELETE** `/api/profile/profile-picture`

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "message": "Profile picture deleted successfully",
  "data": {
    "userId": 1,
    "profilePicture": null
    // ... other profile fields
  }
}
```

### Delete Cover Picture

**DELETE** `/api/profile/cover-picture`

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "message": "Cover picture deleted successfully",
  "data": {
    "userId": 1,
    "coverPicture": null
    // ... other profile fields
  }
}
```

### Get Profile Pictures

**GET** `/api/profile/pictures`

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "data": {
    "profilePicture": "/uploads/profile-pictures/uuid-filename.jpg",
    "coverPicture": "/uploads/cover-pictures/uuid-filename.jpg"
  }
}
```

## Error Responses

### File Too Large

```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB."
}
```

### Invalid File Type

```json
{
  "success": false,
  "message": "Only image files are allowed."
}
```

### No File Uploaded

```json
{
  "success": false,
  "message": "No file uploaded"
}
```

### Unauthorized

```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

## File Storage

- Profile pictures are stored in `/uploads/profile-pictures/`
- Cover pictures are stored in `/uploads/cover-pictures/`
- Files are given unique UUID-based names to prevent conflicts
- Old pictures are automatically deleted when new ones are uploaded
- Images are accessible via HTTP at `<server-url>/uploads/profile-pictures/<filename>`

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

## Frontend Usage Example (JavaScript)

```javascript
// Upload profile picture
const uploadProfilePicture = async (file, token) => {
  const formData = new FormData();
  formData.append("profilePicture", file);

  const response = await fetch("/api/profile/upload-profile-picture", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
};

// Upload cover picture
const uploadCoverPicture = async (file, token) => {
  const formData = new FormData();
  formData.append("coverPicture", file);

  const response = await fetch("/api/profile/upload-cover-picture", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
};

// Delete profile picture
const deleteProfilePicture = async (token) => {
  const response = await fetch("/api/profile/profile-picture", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};
```
