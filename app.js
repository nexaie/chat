// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCwJSfAGzFc28lUpLhQCG25ybwEwyMyBP0",
  authDomain: "chat-dc33d.firebaseapp.com",
  projectId: "chat-dc33d",
  storageBucket: "chat-dc33d.firebasestorage.app",
  messagingSenderId: "463651786662",
  appId: "1:463651786662:web:13f496299367af73da8967"
};

// Debugging Mode
const DEBUG_MODE = true;

// Utility Functions
function debugLog(message, data = null) {
  if (DEBUG_MODE) {
    console.log(`[DEBUG] ${message}`, data || '');
  }
}

function showError(message, isFatal = false) {
  // Remove any existing error messages
  const existingError = document.getElementById('error-message');
  if (existingError) {
    existingError.remove();
  }

  // Create new error element
  const errorEl = document.createElement('div');
  errorEl.id = 'error-message';
  errorEl.className = 'error-message';
  errorEl.innerHTML = `
    <div>${message}</div>
    ${isFatal ? '<button onclick="window.location.reload()">Reload Page</button>' : ''}
  `;

  document.body.appendChild(errorEl);

  // Auto-hide after 5 seconds if not fatal
  if (!isFatal) {
    setTimeout(() => {
      errorEl.style.opacity = '0';
      setTimeout(() => errorEl.remove(), 300);
    }, 5000);
  }

  debugLog(`Error displayed: ${message}`, { isFatal });
}

// Initialize Firebase
let db, auth;
try {
  const firebaseApp = firebase.initializeApp(firebaseConfig);
  db = firebaseApp.firestore();
  auth = firebaseApp.auth();
  
  // Enable offline persistence
  db.enablePersistence()
    .then(() => debugLog("Firestore persistence enabled"))
    .catch(err => {
      console.error("Persistence error:", err);
      showError("Offline mode not available");
    });
  
  debugLog("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  showError("Failed to initialize chat service. Please refresh.", true);
  throw error;
}

// DOM Elements
const elements = {
  usernameInput: document.getElementById('username-input'),
  signInBtn: document.getElementById('sign-in-btn'),
  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  messagesContainer: document.getElementById('messages'),
  typingIndicator: document.getElementById('typing-indicator'),
  userCount: document.getElementById('user-count'),
  authContainer: document.getElementById('auth-container'),
  connectionStatus: document.getElementById('connection-status')
};

// App State
let currentUser = null;
let typingTimeout;
let isOnline = navigator.onLine;

// Connection Monitoring
function updateConnectionStatus() {
  const status = isOnline ? "Connected" : "Offline - reconnecting...";
  elements.connectionStatus.textContent = status;
  elements.connectionStatus.style.color = isOnline ? "green" : "orange";
}

window.addEventListener('online', () => {
  isOnline = true;
  updateConnectionStatus();
  debugLog("Online - reconnecting...");
});

window.addEventListener('offline', () => {
  isOnline = false;
  updateConnectionStatus();
  showError("You're offline. Messages will send when you reconnect.");
});

updateConnectionStatus();

// Authentication
elements.signInBtn.addEventListener('click', signIn);

async function signIn() {
  const username = elements.usernameInput.value.trim();
  
  if (!username) {
    showError("Please enter a username");
    return;
  }

  if (username.length > 20) {
    showError("Username must be 20 characters or less");
    return;
  }

  debugLog("Attempting sign in...", { username });
  
  try {
    // Disable UI during sign-in
    elements.signInBtn.disabled = true;
    elements.signInBtn.textContent = "Signing in...";
    
    // Sign in anonymously
    const userCredential = await auth.signInAnonymously();
    debugLog("Anonymous auth success", { uid: userCredential.user.uid });
    
    currentUser = {
      uid: userCredential.user.uid,
      username: username
    };
    
    // Add user to Firestore
    await db.collection('users').doc(currentUser.uid).set({
      username: username,
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      online: true,
      typing: false
    });
    
    debugLog("User data stored");
    
    // Update UI
    elements.authContainer.style.display = 'none';
    elements.messageInput.disabled = false;
    elements.sendBtn.disabled = false;
    elements.messageInput.focus();
    
    // Setup listeners
    setupMessageListener();
    setupUserStatusListener();
    
  } catch (error) {
    console.error("Sign in error:", error);
    showError("Failed to sign in. Please try again.");
    
    // Reset UI
    elements.signInBtn.disabled = false;
    elements.signInBtn.textContent = "Join Chat";
  }
}

// Message Handling
function setupMessageListener() {
  debugLog("Setting up message listener...");
  
  db.collection('messages')
    .orderBy('timestamp')
    .onSnapshot(
      (snapshot) => {
        debugLog("New messages snapshot", { changes: snapshot.docChanges().length });
        
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            try {
              displayMessage(change.doc.data());
            } catch (error) {
              console.error("Message display error:", error);
            }
          }
        });
        
        scrollToBottom();
      },
      (error) => {
        console.error("Message listener error:", error);
        showError("Connection to messages lost. Reconnecting...");
        
        // Reconnect after delay
        setTimeout(setupMessageListener, 3000);
      }
    );
}

function displayMessage(message) {
  try {
    debugLog("Displaying message", message);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    // Determine message type
    if (message.userId === currentUser?.uid) {
      messageDiv.classList.add('outgoing');
    } else if (message.username === 'System') {
      messageDiv.classList.add('system');
    } else {
      messageDiv.classList.add('incoming');
    }
    
    // Create message content
    messageDiv.innerHTML = `
      <div class="message-header">
        <span class="username">${message.username}</span>
        <span class="timestamp">${formatTime(message.timestamp?.toDate())}</span>
      </div>
      <div class="message-text">${message.text}</div>
    `;
    
    elements.messagesContainer.appendChild(messageDiv);
    
  } catch (error) {
    console.error("Error displaying message:", error);
  }
}

// User Status
function setupUserStatusListener() {
  debugLog("Setting up user status listener...");
  
  db.collection('users')
    .where('online', '==', true)
    .onSnapshot(
      (snapshot) => {
        debugLog("User status update", { count: snapshot.size });
        
        let typingUsers = [];
        let onlineCount = 0;
        
        snapshot.forEach((doc) => {
          const user = doc.data();
          if (user.typing && user.username !== currentUser?.username) {
            typingUsers.push(user.username);
          }
          if (user.online) {
            onlineCount++;
          }
        });
        
        // Update typing indicator
        if (typingUsers.length > 0) {
          elements.typingIndicator.textContent = 
            `${typingUsers.join(', ')} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`;
        } else {
          elements.typingIndicator.textContent = '';
        }
        
        // Update user count
        elements.userCount.textContent = 
          `${onlineCount} user${onlineCount !== 1 ? 's' : ''} online`;
      },
      (error) => {
        console.error("User status error:", error);
        showError("User status updates paused. Reconnecting...");
        
        // Reconnect after delay
        setTimeout(setupUserStatusListener, 3000);
      }
    );
}

// Message Sending
elements.sendBtn.addEventListener('click', sendMessage);
elements.messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Typing indicator
elements.messageInput.addEventListener('input', updateTypingStatus);

function updateTypingStatus() {
  if (!currentUser) return;
  
  debugLog("User typing detected");
  
  try {
    db.collection('users').doc(currentUser.uid).update({
      typing: true,
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      db.collection('users').doc(currentUser.uid).update({
        typing: false
      });
      debugLog("Typing status cleared");
    }, 2000);
  } catch (error) {
    console.error("Typing update error:", error);
  }
}

async function sendMessage() {
  const messageText = elements.messageInput.value.trim();
  
  if (!messageText) {
    debugLog("Empty message blocked");
    return;
  }
  
  if (!currentUser) {
    showError("You need to sign in first");
    return;
  }

  debugLog("Sending message...", { text: messageText });
  
  try {
    // Disable UI during send
    elements.sendBtn.disabled = true;
    elements.sendBtn.textContent = "Sending...";
    
    await db.collection('messages').add({
      text: messageText,
      username: currentUser.username,
      userId: currentUser.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    debugLog("Message sent");
    elements.messageInput.value = '';
    
  } catch (error) {
    console.error("Message send error:", error);
    showError("Failed to send message. Please try again.");
  } finally {
    elements.sendBtn.disabled = false;
    elements.sendBtn.textContent = "Send";
  }
}

// Helper Functions
function formatTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// Cleanup on exit
window.addEventListener('beforeunload', () => {
  if (currentUser) {
    debugLog("Cleaning up user status on exit");
    db.collection('users').doc(currentUser.uid).update({
      online: false,
      typing: false
    }).catch(error => {
      console.error("Cleanup error:", error);
    });
  }
});

// Initial debug
debugLog("App initialized");
