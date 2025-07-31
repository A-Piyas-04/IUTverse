const fs = require("fs");
const path = require("path");

// API Testing Guide for Academic Resource Hub

console.log(`
🎯 Academic Resource Hub API Testing Guide
==========================================

The backend is now running with the following endpoints:

📍 Base URL: http://localhost:3000/api/academic

🔓 Public Endpoints (No Authentication Required):
-------------------------------------------------

1. GET /departments
   - Fetch all departments
   - Example: curl http://localhost:3000/api/academic/departments

2. GET /resources
   - Fetch all academic resources (with optional filtering)
   - Query params: ?departmentId=1&type=QUESTION
   - Example: curl http://localhost:3000/api/academic/resources

3. GET /resources/:id
   - Fetch specific resource by ID
   - Example: curl http://localhost:3000/api/academic/resources/1

🔐 Protected Endpoints (Authentication Required):
-------------------------------------------------

4. POST /departments
   - Create a new department
   - Headers: Authorization: Bearer <token>
   - Body: {"name": "New Department"}

5. POST /resources
   - Upload a new academic resource
   - Headers: Authorization: Bearer <token>
   - Content-Type: multipart/form-data
   - Fields:
     * title (required): "Digital Logic Midterm"
     * type (required): "QUESTION" | "NOTE" | "BOOK" | "OTHER"
     * departmentId (required): 1
     * pdf (optional): [PDF File]
     * externalLink (optional): "https://drive.google.com/..."

6. PUT /resources/:id
   - Update an existing resource
   - Headers: Authorization: Bearer <token>
   - Same fields as POST

7. DELETE /resources/:id
   - Delete a resource
   - Headers: Authorization: Bearer <token>

📁 File Access:
---------------
Uploaded files are accessible at: http://localhost:3000/files/<filename>

🧪 Sample API Request (with curl):
----------------------------------

# Get all departments
curl http://localhost:3000/api/academic/departments

# Get all resources
curl http://localhost:3000/api/academic/resources

# Upload a resource (requires authentication)
curl -X POST http://localhost:3000/api/academic/resources \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "title=Digital Logic Midterm" \\
  -F "type=QUESTION" \\
  -F "departmentId=1" \\
  -F "pdf=@/path/to/your/file.pdf"

# Upload a resource with external link
curl -X POST http://localhost:3000/api/academic/resources \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Advanced Algorithms Notes",
    "type": "NOTE",
    "departmentId": 1,
    "externalLink": "https://drive.google.com/file/d/abc123/view"
  }'

🔄 Response Format:
-------------------
All responses follow this format:
{
  "success": true/false,
  "message": "Description of the result",
  "data": { ... } // Present on successful requests
}

📝 Available Resource Types:
----------------------------
- QUESTION (for question papers)
- NOTE (for class notes)
- BOOK (for textbooks/references)
- OTHER (for miscellaneous resources)

🏛️ Pre-seeded Departments:
---------------------------
CSE, EEE, CE, ME, IPE, TE, EnvE, ChE, MPE, BBA, Economics, English, Mathematics, Physics, Chemistry, Statistics

🎉 Your Academic Resource Hub backend is ready to use!
`);

// Check if uploads directory exists and show its status
const uploadsDir = path.join(__dirname, "../uploads");
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  console.log(`📁 Uploads directory exists with ${files.length} files`);
} else {
  console.log(
    "📁 Uploads directory will be created automatically on first upload"
  );
}

console.log(`
💡 Pro Tips:
- Files are automatically saved with unique names to prevent conflicts
- File size limit is 10MB for PDFs
- Both PDF upload and external links are supported
- Use Postman or similar tools for easier API testing
- Check the server logs for detailed debugging information
`);
