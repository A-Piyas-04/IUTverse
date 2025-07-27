const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../data/users.json');

class UserStorage {
  constructor() {
    this.users = new Map();
    this.loadUsers();
  }

  // Load users from file on startup
  loadUsers() {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.dirname(USERS_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Load existing users if file exists
      if (fs.existsSync(USERS_FILE)) {
        const userData = fs.readFileSync(USERS_FILE, 'utf8');
        const usersArray = JSON.parse(userData);
        usersArray.forEach(user => {
          this.users.set(user.email, user);
        });
        console.log(`Loaded ${this.users.size} users from storage`);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  // Save users to file
  saveUsers() {
    try {
      const usersArray = Array.from(this.users.values());
      fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  // Add or update user
  set(email, userData) {
    this.users.set(email, userData);
    this.saveUsers();
  }

  // Get user
  get(email) {
    return this.users.get(email);
  }

  // Check if user exists
  has(email) {
    return this.users.has(email);
  }

  // Get all users
  values() {
    return this.users.values();
  }
}

module.exports = new UserStorage();
