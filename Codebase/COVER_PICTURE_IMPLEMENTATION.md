# Cover Picture Feature Implementation

## Overview

Added cover picture functionality to the IUTverse application, following the same pattern as the existing profile picture feature.

## Changes Made

### 1. Database Schema (Prisma)

- **File**: `server/prisma/schema.prisma`
- **Change**: Added `coverPicture String?` field to the Profile model
- **Migration**: Applied migration `20250802132108_add_cover_picture`

### 2. Backend Middleware

- **File**: `server/src/middleware/coverPictureUpload.js` (NEW)
- **Purpose**: Multer configuration for cover picture uploads
- **Features**:
  - Uploads stored in `/uploads/covers/` directory
  - Unique filename generation with user ID prefix
  - File size limit: 5MB (larger than profile pictures)
  - Image-only file filter
  - Auto-creates upload directory if it doesn't exist

### 3. Backend Controller

- **File**: `server/src/controllers/profileController.js`
- **New Methods**:
  - `uploadCoverPicture`: Handles cover picture upload
  - `getCoverPicture`: Serves cover picture files
  - `deleteCoverPicture`: Removes cover pictures
- **Features**:
  - Automatic old file cleanup when uploading new cover
  - File existence validation
  - Proper error handling and responses

### 4. Backend Routes

- **File**: `server/src/routes/userRoutes.js`
- **New Routes**:
  - `POST /api/profile/upload-cover` (Protected) - Upload cover picture
  - `GET /api/profile/cover/:userId` (Public) - Get cover picture
  - `DELETE /api/profile/cover` (Protected) - Delete cover picture

### 5. Frontend API Service

- **File**: `client/src/services/api.js`
- **New Methods**:
  - `uploadCoverPicture(file)`: Upload cover picture
  - `getCoverPictureUrl(userId)`: Get cover picture URL
  - `deleteCoverPicture()`: Delete cover picture

## API Endpoints

### Upload Cover Picture

```
POST /api/profile/upload-cover
Headers: Authorization: Bearer <token>
Body: FormData with "coverPicture" file
Response: { message, coverPicture, profile }
```

### Get Cover Picture

```
GET /api/profile/cover/:userId
Response: Image file or 404 if not found
```

### Delete Cover Picture

```
DELETE /api/profile/cover
Headers: Authorization: Bearer <token>
Response: { message: "Cover picture deleted successfully" }
```

## File Structure

```
server/
├── src/
│   ├── controllers/
│   │   └── profileController.js (updated)
│   ├── middleware/
│   │   └── coverPictureUpload.js (new)
│   └── routes/
│       └── userRoutes.js (updated)
├── uploads/
│   └── covers/ (new directory, auto-created)
└── prisma/
    └── schema.prisma (updated)

client/
└── src/
    └── services/
        └── api.js (updated)
```

## Usage Examples

### Frontend Usage

```javascript
import ApiService from "./services/api.js";

// Upload cover picture
const result = await ApiService.uploadCoverPicture(file);

// Get cover picture URL
const coverUrl = ApiService.getCoverPictureUrl(userId);

// Delete cover picture
await ApiService.deleteCoverPicture();
```

### Profile Data Structure

```javascript
{
  userId: 1,
  bio: "User bio",
  profilePicture: "/uploads/profiles/user_1_12345.jpg", // existing
  coverPicture: "/uploads/covers/user_1_cover_67890.jpg", // new
  interests: ["coding", "music"],
  // ... other profile fields
}
```

## Security Features

- Authentication required for upload/delete operations
- File type validation (images only)
- File size limits (5MB for covers)
- Automatic cleanup of old files
- Protected file paths with user ID prefixes

## Static File Serving

Cover pictures are served through the existing static file middleware:

- URL Pattern: `http://localhost:3000/uploads/covers/filename.jpg`
- Configured in `server/src/app.js` with `express.static`

## Testing

- Test file created: `server/test-cover-picture.js`
- Contains example functions for testing all endpoints
- Manual testing recommended with actual image files

## Notes

- Cover pictures have a 5MB limit (vs 2MB for profile pictures)
- Files are stored with `cover` identifier in filename for easy identification
- The user service automatically handles the new `coverPicture` field through its generic update methods
- No changes needed to existing profile picture functionality
