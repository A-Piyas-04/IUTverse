// Chat API Usage Examples
// Make sure to include the JWT token in the Authorization header for all requests

// 1. Get all conversations for the current user
GET /api/chat/conversations
Headers: {
"Authorization": "Bearer <your_jwt_token>"
}
Response: {
"success": true,
"data": [
{
"id": 1,
"otherUser": {
"id": 2,
"name": "John Doe",
"email": "john@iut-dhaka.edu",
"department": "CSE",
"profile": {
"profilePicture": "url_to_profile_pic"
}
},
"lastMessage": {
"content": "Hey, how are you?",
"createdAt": "2025-01-15T10:30:00Z",
"senderId": 2,
"isRead": false
},
"unreadCount": 3,
"updatedAt": "2025-01-15T10:30:00Z"
}
]
}

// 2. Create or get existing conversation with another user
POST /api/chat/conversations
Headers: {
"Authorization": "Bearer <your_jwt_token>",
"Content-Type": "application/json"
}
Body: {
"otherUserId": 2
}
Response: {
"success": true,
"data": {
"id": 1,
"otherUser": {
"id": 2,
"name": "John Doe",
"email": "john@iut-dhaka.edu",
"department": "CSE",
"profile": {
"profilePicture": "url_to_profile_pic"
}
},
"createdAt": "2025-01-15T09:00:00Z"
}
}

// 3. Get messages in a conversation
GET /api/chat/conversations/1/messages?page=1&limit=50
Headers: {
"Authorization": "Bearer <your_jwt_token>"
}
Response: {
"success": true,
"data": [
{
"id": 1,
"conversationId": 1,
"senderId": 2,
"receiverId": 1,
"content": "Hey, how are you?",
"isRead": false,
"createdAt": "2025-01-15T10:30:00Z",
"sender": {
"id": 2,
"name": "John Doe",
"profile": {
"profilePicture": "url_to_profile_pic"
}
}
}
],
"pagination": {
"page": 1,
"limit": 50,
"hasMore": false
}
}

// 4. Send a new message
POST /api/chat/messages
Headers: {
"Authorization": "Bearer <your_jwt_token>",
"Content-Type": "application/json"
}
Body: {
"conversationId": 1,
"content": "I'm doing great! How about you?"
}
Response: {
"success": true,
"data": {
"id": 2,
"conversationId": 1,
"senderId": 1,
"receiverId": 2,
"content": "I'm doing great! How about you?",
"isRead": false,
"createdAt": "2025-01-15T10:35:00Z",
"sender": {
"id": 1,
"name": "Your Name",
"profile": {
"profilePicture": "your_profile_pic_url"
}
}
}
}

// 5. Mark a specific message as read
PUT /api/chat/messages/1/read
Headers: {
"Authorization": "Bearer <your_jwt_token>"
}
Response: {
"success": true,
"message": "Message marked as read"
}

// 6. Mark all messages in a conversation as read
PUT /api/chat/conversations/1/read
Headers: {
"Authorization": "Bearer <your_jwt_token>"
}
Response: {
"success": true,
"message": "All messages marked as read"
}

// 7. Delete a message (only your own messages)
DELETE /api/chat/messages/2
Headers: {
"Authorization": "Bearer <your_jwt_token>"
}
Response: {
"success": true,
"message": "Message deleted successfully"
}

// 8. Get unread message count
GET /api/chat/unread-count
Headers: {
"Authorization": "Bearer <your_jwt_token>"
}
Response: {
"success": true,
"data": {
"unreadCount": 5
}
}

// Error responses will have this format:
{
"success": false,
"message": "Error description here"
}
