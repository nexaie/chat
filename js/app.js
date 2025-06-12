// DOM Elements
const authContainer = document.getElementById('auth-container');
const googleAuth = document.getElementById('google-auth');
const usernameSetup = document.getElementById('username-setup');
const appContainer = document.getElementById('app-container');
const userListContainer = document.querySelector('.user-list-container');
const chatContainer = document.getElementById('chat-container');
const googleSignin = document.getElementById('google-signin');
const setUsernameBtn = document.getElementById('set-username');
const newUsernameInput = document.getElementById('new-username');
const usernameError = document.getElementById('username-error');
const userSearch = document.getElementById('user-search');
const usersList = document.getElementById('users-list');
const backToList = document.getElementById('back-to-list');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const userProfile = document.getElementById('user-profile');
const toast = document.getElementById('toast');

// App State
let currentUser = null;
let currentChatWith = null;
let users = {};
let unsubscribeUsers = null;
let unsubscribeChat = null;

// Initialize the app
init();

function init() {
  // Event Listeners
  googleSignin.addEventListener('click', signInWithGoogle);
  setUsernameBtn.addEventListener('click', setUsername);
  newUsernameInput.addEventListener('input', validateUsername);
  userSearch.addEventListener('input', searchUsers);
  backToList.addEventListener('click', closeChat);
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Auth State Listener
  auth.onAuthStateChanged(handleAuthStateChange);
}

// Auth Functions
function signInWithGoogle() {
  auth.signInWithPopup(provider)
    .then((result) => {
      // Check if user exists in Firestore
      checkUserExists(result.user.uid);
    })
    .catch((error) => {
      showToast(error.message, 'error');
      console.error('Google Sign-In Error:', error);
    });
}

function checkUserExists(uid) {
  db.collection('users').doc(uid).get()
    .then((doc) => {
      if (doc.exists) {
        // User exists, proceed to app
        currentUser = {
          uid: uid,
          email: doc.data().email,
          username: doc.data().username,
          name: doc.data().name,
          photoURL: doc.data().photoURL
        };
        showApp();
      } else {
        // New user, show username setup
        showUsernameSetup();
      }
    })
    .catch((error) => {
      showToast('Error checking user existence', 'error');
      console.error('Error checking user:', error);
    });
}

function setUsername() {
  const username = newUsernameInput.value.trim().toLowerCase();
  
  if (!username || username.length < 3) {
    showToast('Username must be at least 3 characters', 'error');
    return;
  }

  // Check if username is available
  db.collection('usernames').doc(username).get()
    .then((doc) => {
      if (doc.exists) {
        showToast('Username already taken', 'error');
      } else {
        // Get current Google user
        const user = auth.currentUser;
        
        // Create user document
        const userData = {
          uid: user.uid,
          email: user.email,
          username: username,
          name: user.displayName || 'Anonymous',
          photoURL: user.photoURL || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastActive: firebase.firestore.FieldValue.serverTimestamp(),
          online: true
        };
        
        // Create username reference
        const usernameRef = {
          uid: user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Batch write to ensure both succeed or fail together
        const batch = db.batch();
        batch.set(db.collection('users').doc(user.uid), userData);
        batch.set(db.collection('usernames').doc(username), usernameRef);
        
        batch.commit()
          .then(() => {
            currentUser = userData;
            showApp();
            showToast('Welcome to Nexaie Chat!', 'success');
          })
          .catch((error) => {
            showToast('Error creating user', 'error');
            console.error('Error creating user:', error);
          });
      }
    })
    .catch((error) => {
      showToast('Error checking username', 'error');
      console.error('Error checking username:', error);
    });
}

function validateUsername() {
  const username = newUsernameInput.value.trim();
  const regex = /^[a-z0-9_.-]+$/;
  
  if (!regex.test(username)) {
    usernameError.textContent = 'Only lowercase letters, numbers, _ . - allowed';
    usernameError.style.display = 'block';
    return false;
  } else if (username.length < 3) {
    usernameError.textContent = 'Username must be at least 3 characters';
    usernameError.style.display = 'block';
    return false;
  } else {
    usernameError.style.display = 'none';
    return true;
  }
}

// UI Functions
function showUsernameSetup() {
  googleAuth.style.display = 'none';
  usernameSetup.style.display = 'block';
}

function showApp() {
  authContainer.style.display = 'none';
  appContainer.style.display = 'block';
  
  // Update user profile
  if (currentUser.photoURL) {
    userProfile.style.backgroundImage = `url(${currentUser.photoURL})`;
    userProfile.style.backgroundSize = 'cover';
    userProfile.textContent = '';
  } else {
    userProfile.textContent = currentUser.name.charAt(0).toUpperCase();
  }
  
  // Load users
  setupUsersListener();
}

function showChat(userId) {
  currentChatWith = userId;
  const user = users[userId];
  
  // Update chat header
  const chatAvatar = document.querySelector('.chat-avatar');
  const chatUsername = document.querySelector('.chat-username');
  const chatStatus = document.querySelector('.chat-status');
  
  if (user.photoURL) {
    chatAvatar.style.backgroundImage = `url(${user.photoURL})`;
    chatAvatar.style.backgroundSize = 'cover';
    chatAvatar.textContent = '';
  } else {
    chatAvatar.textContent = user.name.charAt(0).toUpperCase();
  }
  
  chatUsername.textContent = `${user.name} (@${user.username})`;
  chatStatus.textContent = user.online ? 'Online' : 'Offline';
  
  // Show chat container
  chatContainer.classList.add('show');
  
  // Load messages
  loadChatMessages(userId);
}

function closeChat() {
  chatContainer.classList.remove('show');
  currentChatWith = null;
  
  // Unsubscribe from chat listener
  if (unsubscribeChat) {
    unsubscribeChat();
    unsubscribeChat = null;
  }
}

function showToast(message, type = '') {
  toast.textContent = message;
  toast.className = 'toast';
  
  if (type) {
    toast.classList.add(type);
  }
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// User List Functions
function setupUsersListener() {
  if (unsubscribeUsers) unsubscribeUsers();
  
  unsubscribeUsers = db.collection('users')
    .where('uid', '!=', currentUser.uid)
    .onSnapshot((snapshot) => {
      usersList.innerHTML = '';
      users = {};
      
      snapshot.forEach((doc) => {
        const user = doc.data();
        users[doc.id] = user;
        
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.addEventListener('click', () => showChat(doc.id));
        
        // Check if user is online (active in last 5 minutes)
        const lastActive = user.lastActive?.toDate();
        const isOnline = lastActive && (new Date() - lastActive) < 5 * 60 * 1000;
        
        userItem.innerHTML = `
          <div class="user-avatar-list" style="${user.photoURL ? `background-image: url(${user.photoURL})` : ''}">
            ${user.photoURL ? '' : user.name.charAt(0).toUpperCase()}
          </div>
          <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-username">@${user.username}</div>
          </div>
          <div class="user-status ${isOnline ? 'online' : ''}"></div>
        `;
        
        usersList.appendChild(userItem);
      });
    }, (error) => {
      showToast('Error loading users', 'error');
      console.error('Users listener error:', error);
    });
}

function searchUsers() {
  const searchTerm = userSearch.value.trim().toLowerCase();
  
  if (!searchTerm) {
    // If search is empty, show all users
    const userItems = document.querySelectorAll('.user-item');
    userItems.forEach(item => item.style.display = 'flex');
    return;
  }
  
  // Filter users based on search term
  const userItems = document.querySelectorAll('.user-item');
  userItems.forEach(item => {
    const username = item.querySelector('.user-username').textContent.toLowerCase();
    const name = item.querySelector('.user-name').textContent.toLowerCase();
    
    if (username.includes(searchTerm)) {
      item.style.display = 'flex';
    } else if (name.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// Chat Functions
function loadChatMessages(userId) {
  if (unsubscribeChat) unsubscribeChat();
  
  chatMessages.innerHTML = '';
  
  // Create a unique chat ID by combining user IDs in alphabetical order
  const chatId = [currentUser.uid, userId].sort().join('_');
  
  unsubscribeChat = db.collection('chats').doc(chatId)
    .collection('messages')
    .orderBy('timestamp')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          addMessageToChat(change.doc.data());
        }
      });
      
      // Scroll to bottom
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, (error) => {
      showToast('Error loading messages', 'error');
      console.error('Chat listener error:', error);
    });
}

function addMessageToChat(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.senderId === currentUser.uid ? 'message-outgoing' : 'message-incoming'}`;
  
  const senderName = message.senderId === currentUser.uid ? 'You' : users[currentChatWith].name;
  const time = message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageDiv.innerHTML = `
    <div class="message-sender">${senderName}</div>
    <div class="message-text">${message.text}</div>
    <div class="message-time">${time}</div>
  `;
  
  chatMessages.appendChild(messageDiv);
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChatWith) return;
  
  // Create a unique chat ID by combining user IDs in alphabetical order
  const chatId = [currentUser.uid, currentChatWith].sort().join('_');
  
  // Add message to chat
  db.collection('chats').doc(chatId).collection('messages').add({
    text: text,
    senderId: currentUser.uid,
    senderName: currentUser.name,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    messageInput.value = '';
  })
  .catch((error) => {
    showToast('Failed to send message', 'error');
    console.error('Error sending message:', error);
  });
}

// Auth State Change Handler
function handleAuthStateChange(user) {
  if (user) {
    // User is signed in
    checkUserExists(user.uid);
    
    // Update user status when window is closed or inactive
    window.addEventListener('beforeunload', () => {
      db.collection('users').doc(user.uid).update({
        online: false,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    
    // Update user status when window is active
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        db.collection('users').doc(user.uid).update({
          online: true,
          lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        db.collection('users').doc(user.uid).update({
          online: false,
          lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  } else {
    // User is signed out
    if (currentUser) {
      // Update user status to offline
      db.collection('users').doc(currentUser.uid).update({
        online: false,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(error => console.error('Error updating offline status:', error));
    }
    
    currentUser = null;
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    googleAuth.style.display = 'block';
    usernameSetup.style.display = 'none';
    
    // Clean up listeners
    if (unsubscribeUsers) {
      unsubscribeUsers();
      unsubscribeUsers = null;
    }
    
    if (unsubscribeChat) {
      unsubscribeChat();
      unsubscribeChat = null;
    }
  }
}
