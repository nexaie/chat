// DOM Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const googleSignInBtn = document.getElementById('google-signin');
const emailSignInBtn = document.getElementById('email-signin');
const emailSignUpBtn = document.getElementById('email-signup');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const userSearch = document.getElementById('user-search');
const chatList = document.getElementById('chat-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const userAvatar = document.getElementById('user-avatar');
const usernameDisplay = document.getElementById('username-display');
const chatAvatar = document.getElementById('chat-avatar');
const chatName = document.getElementById('chat-name');
const chatStatus = document.getElementById('chat-status');

// Global variables
let currentUser = null;
let currentChat = null;
let users = [];
let chats = [];

// Initialize the app
function init() {
    // Check auth state
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            setupUser(user);
            showAppScreen();
    
            // Load user data with error handling
            loadUserData().catch(error => {
                console.error("Error loading user data:", error);
            });
    
            // Listen for chats with error handling
            listenForChats();
        } else {
            // No user is signed in
            showAuthScreen();
        }
    }, (error) => {
        console.error("Auth state change error:", error);
});
    
    // Event listeners
    googleSignInBtn.addEventListener('click', signInWithGoogle);
    emailSignInBtn.addEventListener('click', signInWithEmail);
    emailSignUpBtn.addEventListener('click', signUpWithEmail);
    logoutBtn.addEventListener('click', signOut);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    userSearch.addEventListener('input', searchUsers);
}

// Show auth screen
function showAuthScreen() {
    authScreen.classList.add('active');
    appScreen.classList.remove('active');
    authError.textContent = '';
    emailInput.value = '';
    passwordInput.value = '';
}

// Show app screen
function showAppScreen() {
    authScreen.classList.remove('active');
    appScreen.classList.add('active');
}

// Setup user profile
function setupUser(user) {
    // Set user avatar
    const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`;
    userAvatar.src = photoURL;
    
    // Set username
    usernameDisplay.textContent = user.displayName || user.email.split('@')[0];
    
    // Update user data in Firestore
    db.collection('users').doc(user.uid).set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: photoURL,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

// Load user data
function loadUserData() {
    // Load all users except current user
    db.collection('users').where('uid', '!=', currentUser.uid)
        .get()
        .then((querySnapshot) => {
            users = [];
            querySnapshot.forEach((doc) => {
                users.push(doc.data());
            });
        })
        .catch((error) => {
            console.log("Error getting users: ", error);
        });
}

function listenForChats() {
    db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .orderBy('lastMessage.timestamp', 'desc')
        .onSnapshot((querySnapshot) => {
            chats = [];
            chatList.innerHTML = '';
            
            querySnapshot.forEach((doc) => {
                if (!doc.exists) return;
                
                const chat = doc.data();
                chat.id = doc.id;
                chats.push(chat);
                
                // Get the other participant's info
                const otherUserId = chat.participants.find(id => id !== currentUser.uid);
                
                // Check if we already have this user's data
                const otherUser = users.find(u => u.uid === otherUserId);
                
                if (otherUser) {
                    createChatListItem(chat, otherUser);
                } else {
                    // Fetch user data if we don't have it
                    db.collection('users').doc(otherUserId).get()
                        .then((userDoc) => {
                            if (userDoc.exists) {
                                const userData = userDoc.data();
                                users.push(userData);
                                createChatListItem(chat, userData);
                            }
                        })
                        .catch((error) => {
                            console.error("Error fetching user data:", error);
                        });
                }
            });
        }, (error) => {
            console.error("Error listening to chats:", error);
        });
}

// Create chat list item
function createChatListItem(chat, otherUser) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.chatId = chat.id;
    chatItem.dataset.userId = otherUser.uid;
    
    if (currentChat && currentChat.id === chat.id) {
        chatItem.classList.add('active');
    }
    
    chatItem.innerHTML = `
        <img src="${otherUser.photoURL}" alt="${otherUser.displayName}">
        <div class="chat-item-info">
            <h3>${otherUser.displayName}</h3>
            <p>${chat.lastMessage?.text || 'No messages yet'}</p>
        </div>
        <div class="chat-item-time">${formatTime(chat.lastMessage?.timestamp)}</div>
    `;
    
    chatItem.addEventListener('click', () => openChat(chat, otherUser));
    chatList.appendChild(chatItem);
}

// Open chat
function openChat(chat, otherUser) {
    currentChat = chat;
    
    // Update chat header
    chatAvatar.src = otherUser.photoURL;
    chatName.textContent = otherUser.displayName;
    
    // Mark chat as active in the list
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === chat.id) {
            item.classList.add('active');
        }
    });
    
    // Load messages
    loadMessages(chat.id);
    
    // Mark messages as read
    markMessagesAsRead(chat.id);
}

// Load messages
function loadMessages(chatId) {
    messagesContainer.innerHTML = '';
    
    db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((querySnapshot) => {
            messagesContainer.innerHTML = '';
            
            querySnapshot.forEach((doc) => {
                if (!doc.exists) return;
                
                const message = doc.data();
                displayMessage(message);
            });
            
            // Scroll to bottom
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }, (error) => {
            console.error("Error loading messages:", error);
        });
}

// Display message
function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    
    messageDiv.innerHTML = `
        <p>${message.text}</p>
        <div class="message-info">
            <span>${formatTime(message.timestamp)}</span>
            ${message.senderId === currentUser.uid ? 
                `<span class="message-status ${message.read ? 'read' : ''}">
                    ${message.read ? '✓✓' : '✓'}
                </span>` : ''}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
}

// Send message
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;
    
    const message = {
        text: text,
        senderId: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
    };
    
    // Add message to chat
    db.collection('chats').doc(currentChat.id).collection('messages').add(message)
        .then(() => {
            // Update last message in chat
            db.collection('chats').doc(currentChat.id).update({
                lastMessage: message
            });
            
            // Clear input
            messageInput.value = '';
        })
        .catch((error) => {
            console.error("Error sending message: ", error);
        });
}

// Mark messages as read
function markMessagesAsRead(chatId) {
    db.collection('chats').doc(chatId).collection('messages')
        .where('senderId', '!=', currentUser.uid)
        .where('read', '==', false)
        .get()
        .then((querySnapshot) => {
            const batch = db.batch();
            
            querySnapshot.forEach((doc) => {
                const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(doc.id);
                batch.update(messageRef, { read: true });
            });
            
            return batch.commit();
        })
        .then(() => {
            // Update last message read status
            if (currentChat.lastMessage && currentChat.lastMessage.senderId !== currentUser.uid) {
                db.collection('chats').doc(chatId).update({
                    'lastMessage.read': true
                });
            }
        })
        .catch((error) => {
            console.error("Error marking messages as read: ", error);
        });
}

// Search users
function searchUsers() {
    const searchTerm = userSearch.value.toLowerCase();
    
    if (!searchTerm) {
        // Show all chats when search is empty
        document.querySelectorAll('.chat-item').forEach(item => {
            item.style.display = 'flex';
        });
        return;
    }
    
    // Search in existing users
    const filteredUsers = users.filter(user => 
        user.displayName.toLowerCase().includes(searchTerm) || 
        user.email.toLowerCase().includes(searchTerm)
    );
    
    // Show only chats with matching users
    document.querySelectorAll('.chat-item').forEach(item => {
        const userId = item.dataset.userId;
        const isMatch = filteredUsers.some(user => user.uid === userId);
        item.style.display = isMatch ? 'flex' : 'none';
    });
    
    // If no matches, show option to start new chat
    if (filteredUsers.length > 0 && !document.getElementById('new-chat-options')) {
        showNewChatOptions(filteredUsers);
    } else if (filteredUsers.length === 0) {
        removeNewChatOptions();
    }
}

// Show new chat options
function showNewChatOptions(filteredUsers) {
    removeNewChatOptions();
    
    const optionsDiv = document.createElement('div');
    optionsDiv.id = 'new-chat-options';
    optionsDiv.className = 'new-chat-options';
    
    const heading = document.createElement('h3');
    heading.textContent = 'Start new chat with:';
    optionsDiv.appendChild(heading);
    
    filteredUsers.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-option';
        userDiv.innerHTML = `
            <img src="${user.photoURL}" alt="${user.displayName}">
            <span>${user.displayName}</span>
        `;
        
        userDiv.addEventListener('click', () => createNewChat(user));
        optionsDiv.appendChild(userDiv);
    });
    
    chatList.insertBefore(optionsDiv, chatList.firstChild);
}

// Remove new chat options
function removeNewChatOptions() {
    const existingOptions = document.getElementById('new-chat-options');
    if (existingOptions) {
        existingOptions.remove();
    }
}

// Create new chat
function createNewChat(user) {
    // Check if chat already exists
    const existingChat = chats.find(chat => 
        chat.participants.includes(user.uid) && 
        chat.participants.includes(currentUser.uid)
    );
    
    if (existingChat) {
        openChat(existingChat, user);
        userSearch.value = '';
        removeNewChatOptions();
        return;
    }
    
    // Create new chat
    const newChat = {
        participants: [currentUser.uid, user.uid],
        lastMessage: {
            text: 'Chat started',
            senderId: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        }
    };
    
    db.collection('chats').add(newChat)
        .then((docRef) => {
            newChat.id = docRef.id;
            openChat(newChat, user);
            userSearch.value = '';
            removeNewChatOptions();
        })
        .catch((error) => {
            console.error("Error creating new chat: ", error);
        });
}

// Auth functions
function signInWithGoogle() {
    auth.signInWithPopup(googleProvider)
        .catch((error) => {
            authError.textContent = error.message;
        });
}

function signInWithEmail() {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        authError.textContent = 'Please enter both email and password';
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            authError.textContent = error.message;
        });
}

function signUpWithEmail() {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        authError.textContent = 'Please enter both email and password';
        return;
    }
    
    if (password.length < 6) {
        authError.textContent = 'Password should be at least 6 characters';
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Update user profile with email as display name
            return userCredential.user.updateProfile({
                displayName: email.split('@')[0],
                photoURL: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=random`
            });
        })
        .catch((error) => {
            authError.textContent = error.message;
        });
}

function signOut() {
    auth.signOut()
        .catch((error) => {
            console.error("Error signing out: ", error);
        });
}

// Helper functions
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
        return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    }
}

// Initialize the app
init();
