# Nexaie Chat App

A beautiful, space-themed chat application with Google authentication.

## Features

- 🌌 Stunning space-themed UI with animations
- 🔐 Secure Google authentication
- ✨ Unique username setup for new users
- 🔍 Search functionality to find other users
- 💬 Real-time chat with other users
- 📱 Responsive design for all devices
- 🌓 Dark mode for comfortable night-time use

## Technologies Used

- Firebase Authentication
- Firebase Firestore
- HTML5, CSS3, JavaScript
- Animate.css for animations

## Setup

1. Clone this repository
2. Set up a Firebase project and update the configuration in `js/firebase-config.js`
3. Enable Google authentication in Firebase Console
4. Open `index.html` in a browser

## Firebase Rules

Make sure to set up appropriate security rules in Firebase:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /usernames/{username} {
      allow read: if true;
      allow create: if request.auth != null;
    }
    
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid in chatId.split('_'));
    }
  }
}
```

## License

MIT License
