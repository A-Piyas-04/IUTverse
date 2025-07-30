# Database Migration Commands

## After making schema changes, run these commands:

1. **Install new dependency (uuid):**

```bash
cd server
npm install uuid@^10.0.0
```

2. **Generate and run migration:**

```bash
npx prisma migrate dev --name add-cover-picture-field
```

3. **Generate Prisma client:**

```bash
npx prisma generate
```

4. **Restart your server to apply changes**

## Directory Structure Created

The following directories will be created automatically when the first image is uploaded:

- `server/uploads/`
- `server/uploads/profile-pictures/`
- `server/uploads/cover-pictures/`

## Testing the APIs

You can test the new APIs using tools like Postman or curl:

### Example curl commands:

**Upload profile picture:**

```bash
curl -X POST \
  http://localhost:3000/api/profile/upload-profile-picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "profilePicture=@/path/to/your/image.jpg"
```

**Upload cover picture:**

```bash
curl -X POST \
  http://localhost:3000/api/profile/upload-cover-picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "coverPicture=@/path/to/your/image.jpg"
```

**Get profile pictures:**

```bash
curl -X GET \
  http://localhost:3000/api/profile/pictures \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Delete profile picture:**

```bash
curl -X DELETE \
  http://localhost:3000/api/profile/profile-picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
