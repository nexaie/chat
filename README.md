# Nexaier Group Chat

A real-time group chat application hosted on GitHub Pages.

## Features

- Real-time messaging
- Online user count
- Typing indicators
- Offline detection
- Responsive design

## Setup

1. Clone this repository
2. No build step required - just deploy to GitHub Pages

## Deployment

1. Create a new repository named `chat`
2. Push these files to the `main` branch
3. Enable GitHub Pages in repository settings

The app will be available at: `https://nexaier.github.io/chat`

## Firebase Configuration

The app uses Firebase Firestore for real-time functionality. Make sure to:

1. Enable Anonymous Authentication
2. Set up Firestore with these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{message} {
      allow read, write: if request.auth != null;
    }
    match /users/{user} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == user;
    }
  }
}
