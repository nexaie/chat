# Nexa Chat - Real-time Messaging App

A WhatsApp-like real-time chat application with Firebase backend and dark UI.

## Features

- Google authentication
- Email/password authentication
- Real-time messaging
- User search
- Chat history persistence
- Responsive design
- Dark mode UI

## Setup Instructions

1. Clone this repository or create these files in your GitHub Pages project.
2. Make sure you have Firebase project set up with:
   - Authentication enabled (Google and Email/Password providers)
   - Firestore database with rules allowing read/write for authenticated users
3. Deploy to GitHub Pages by pushing to your repository.


## Notes

- All chats and messages are stored in Firestore and persist until deleted.
- Users are identified by unique usernames (from Google or email).
- The app uses Firebase's real-time listeners for instant updates.
