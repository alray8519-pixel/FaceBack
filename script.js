// إعدادات الفايربيس الخصوصية
const firebaseConfig = {
  apiKey: "AIzaSyBxcRmA8oqUp8g0P4d6UWts-T1UxTan3gE",
  authDomain: "faceback-67d62.firebaseapp.com",
  projectId: "faceback-67d62",
  storageBucket: "faceback-67d62.firebasestorage.app",
  messagingSenderId: "611604127766",
  appId: "1:611604127766:web:b29c6a0f98aa225249d537"
};

// تهيئة التكتل
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let activeChatUser = null;
let authMode = 'login';
let selectedAvatarBase64 = null;

// توليد كود عشوائي مكون من 4 أرقام يختلف تماماً عن 0000 و0001
function generateUniqueCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (code === '0000' || code === '0001');
  return code;
}

// إنشاء حساب الآدمين تلقائياً إذا لم يكن موجوداً
function ensureAdminAccount() {
  const adminEmail = "admen01@faceback.com";
  const adminPass = "000000";

  auth.signInWithEmailAndPassword(adminEmail, adminPass)
    .then(cred => {
      // إعداد بيانات الآدمين في Firestore
      return db.collection('users').doc(cred.user.uid).set({
        name: 'admen01 (المطور)',
        email: adminEmail,
        code: '0001',
        avatar: 'https://via.placeholder.com/100/2ecc71/ffffff?text=Admin'
      }, { merge: true });
    })
    .catch(error => {
      // إذا لم يكن الحساب موجوداً، يتم إنشاؤه
      if (error.code === 'auth/user-not-found') {
        auth.createUserWithEmailAndPassword(adminEmail, adminPass).then(cred => {
          return db.collection('users').doc(cred.user.uid).set({
            name: 'admen01 (المطور)',
            email: adminEmail,
            code: '0001',
            avatar: 'https://via.placeholder.com/100/2ecc71/ffffff?text=Admin'
          });
        });
      }
    });
}
ensureAdminAccount();

// متابعة حالة التسجيل
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'flex';
    loadUserData();
    loadChats();
  } else {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
  }
});

// التبديل بين نماذج الدخول
function switchAuthTab(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  if (mode === 'login') {
    document.querySelectorAll('.auth-tabs .tab-btn')[0].classList.add('active');
    document.getElementById('nameGroup').style.display = 'none';
    document.getElementById('authSubmitBtn').innerText = 'تسجيل الدخول';
  } else {
    document.querySelectorAll('.auth-tabs .tab-btn')[1].classList.add('active');
    document.getElementById('nameGroup').style.display = 'flex';
    document.getElementById('authSubmitBtn').innerText = 'إنشاء حساب';
  }
}

// تنفيذ أمان الدخول
function handleAuth(e) {
  e.preventDefault();
  let email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  // تسهيل إدخال اسم الحساب admen01 فقط بدون تكملة البريد
  if (email.toLowerCase() === 'admen01') {
    email = 'admen01@faceback.com';
  }

  if (authMode === 'signup') {
    const name = document.getElementById('authName').value.trim();
    auth.createUserWithEmailAndPassword(email, password).then(cred => {
      const generatedCode = generateUniqueCode();
      const defaultAvatar = 'https://via.placeholder.com/100';
      return db.collection('users').doc(cred.user.uid).set({
        name: name,
        email: email,
        code: generatedCode,
        avatar: defaultAvatar
      });
    }).catch(err => alert(err.message));
  } else {
    auth.signInWithEmailAndPassword(email, password).catch(err => alert('خطأ في التسجيل: ' + err.message));
  }
}

// تحميل بيانات الملف الشخصي
function loadUserData() {
  if (!currentUser) return;

  document.getElementById('profileEmailInput').value = currentUser.email || '';

  db.collection('users').doc(currentUser.uid).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      const userCode = data.code || generateUniqueCode();
      const userAvatar = data.avatar || 'https://via.placeholder.com/100';
      const userName = data.name || currentUser.email.split('@')[0];

      document.getElementById('myCode').innerText = userCode;
      document.getElementById('myAvatar').src = userAvatar;
      document.getElementById('profileImage').src = userAvatar;
      document.getElementById('profileNameInput').value = userName;
      document.getElementById('profileEmailInput').value = data.email || currentUser.email;
      document.getElementById('profileCodeInput').value = userCode;

      if (!data.code) {
        db.collection('users').doc(currentUser.uid).set({ code: userCode }, { merge: true });
      }
    } else {
      const newCode = (currentUser.email === 'admen01@faceback.com') ? '0001' : generateUniqueCode();
      const defaultData = {
        name: currentUser.email.split('@')[0],
        email: currentUser.email,
        code: newCode,
        avatar: 'https://via.placeholder.com/100'
      };
      db.collection('users').doc(currentUser.uid).set(defaultData).then(() => loadUserData());
    }
  }).catch(err => console.error("Error loading user data:", err));
}

// رفع ومعاينة صورة الملف الشخصي الجديدة
function uploadAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    selectedAvatarBase64 = event.target.result;
    document.getElementById('profileImage').src = selectedAvatarBase64;
    document.getElementById('myAvatar').src = selectedAvatarBase64;
  };
  reader.readAsDataURL(file);
}

// حفظ الملف الشخصي وتفعيله
function saveProfile() {
  if (!currentUser) return;

  const newName = document.getElementById('profileNameInput').value.trim();
  const avatarToSave = selectedAvatarBase64 || document.getElementById('profileImage').src;

  if (!newName) {
    alert('يرجى إدخال اسم المستخدم');
    return;
  }

  db.collection('users').doc(currentUser.uid).set({
    name: newName,
    avatar: avatarToSave
  }, { merge: true }).then(() => {
    alert('تم حفظ التغييرات بنجاح!');
    loadUserData();
  }).catch(err => {
    alert('حدث خطأ أثناء الحفظ: ' + err.message);
  });
}

// التبديل بين التبويبات SideBar
function switchTab(tabName) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  
  if(tabName === 'chats') {
    document.getElementById('btnChats').classList.add('active');
    document.getElementById('chatsTab').style.display = 'block';
  } else if(tabName === 'friends') {
    document.getElementById('btnFriends').classList.add('active');
    document.getElementById('friendsTab').style.display = 'block';
  } else if(tabName === 'profile') {
    document.getElementById('btnProfile').classList.add('active');
    document.getElementById('profileTab').style.display = 'block';
  } else if(tabName === 'settings') {
    document.getElementById('btnSettings').classList.add('active');
    document.getElementById('settingsTab').style.display = 'block';
  }
}

// البحث الصحيح عن الأصدقاء بواسطة الكود وإضافتهم
function searchAndAddFriend() {
  const inputEl = document.getElementById('friendCodeInput');
  const code = inputEl.value.trim();
  
  if(code.length !== 4) {
    alert('الكود يجب أن يتكون من 4 أرقام بالضبط');
    return;
  }

  // الاستعلام من قاعدة البيانات عن المستخدم صاحب الكود
  db.collection('users').where('code', '==', code).get()
    .then(snap => {
      if(snap.empty) {
        alert('لم يتم العثور على أي مستخدم بهذا الكود (' + code + ')');
      } else {
        let found = false;
        snap.forEach(doc => {
          if(doc.id === currentUser.uid) {
            alert('هذا الكود ينتمي لملفك الشخصي الحالي!');
            found = true;
            return;
          }
          const friend = doc.data();
          found = true;
          alert('تم العثور على الصديق: ' + (friend.name || 'مستخدم'));
          openChatWithUser(doc.id, friend.name || 'مستخدم', friend.avatar || 'https://via.placeholder.com/40');
        });
        inputEl.value = '';
      }
    })
    .catch(err => {
      alert('حدث خطأ في عملية البحث: ' + err.message);
    });
}

// فتح المحادثة المباشرة مع الصديق
function openChatWithUser(userId, name, avatar) {
  activeChatUser = { id: userId, name: name, avatar: avatar || 'https://via.placeholder.com/40' };
  document.getElementById('noChatSelected').style.display = 'none';
  document.getElementById('activeChat').style.display = 'flex';
  document.querySelector('.chat-area').classList.add('active');

  document.getElementById('activeChatName').innerText = name;
  document.getElementById('activeChatAvatar').src = activeChatUser.avatar;

  loadMessages();
}

// إغلاق المحادثة في الجوال
function closeChat() {
  document.querySelector('.chat-area').classList.remove('active');
}

// إرسال رسالة
function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if(!text || !activeChatUser) return;

  const msgData = {
    sender: currentUser.uid,
    receiver: activeChatUser.id,
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection('messages').add(msgData);
  input.value = '';
}

function handleKeyPress(e) {
  if(e.key === 'Enter') sendMessage();
}

// قراءة الرسائل فورياً
function loadMessages() {
  const container = document.getElementById('messagesContainer');
  if (!activeChatUser) return;

  db.collection('messages')
    .orderBy('timestamp', 'asc')
    .onSnapshot(snap => {
      container.innerHTML = '';
      snap.forEach(doc => {
        const msg = doc.data();
        if((msg.sender === currentUser.uid && msg.receiver === activeChatUser.id) ||
           (msg.sender === activeChatUser.id && msg.receiver === currentUser.uid)) {
          
          const bubble = document.createElement('div');
          bubble.className = `message-bubble ${msg.sender === currentUser.uid ? 'sent' : 'received'}`;
          bubble.innerHTML = `<div>${msg.text}</div>`;
          container.appendChild(bubble);
        }
      });
      container.scrollTop = container.scrollHeight;
    });
}

// تحميل قوائم المحادثات
function loadChats() {
  const chatsList = document.getElementById('chatsList');
  if(!chatsList) return;
  chatsList.innerHTML = '<p style="text-align:center; padding:10px; color:var(--text-muted)">يمكنك إضافة أصدقاء للبدء عبر الكود الخاص بهم</p>';
}

// نسخ الكود الخاص
function copyCode() {
  const code = document.getElementById('myCode').innerText;
  navigator.clipboard.writeText(code);
  alert('تم نسخ الكود الخاص بك: ' + code);
}

// تغيير المظهر Dark Mode
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
}

// تغيير خلفيات المحادثة
function openBgModal() { document.getElementById('bgModal').style.display = 'flex'; }
function closeBgModal() { document.getElementById('bgModal').style.display = 'none'; }
function setChatBg(bgType) {
  const chatArea = document.querySelector('.chat-area');
  if(bgType === 'preset-1') chatArea.style.background = '#e3f2fd';
  else if(bgType === 'preset-2') chatArea.style.background = '#fbe9e7';
  else chatArea.style.background = 'var(--chat-bg)';
  closeBgModal();
}

function uploadCustomBg(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    document.querySelector('.chat-area').style.background = `url(${event.target.result}) center/cover no-repeat`;
    closeBgModal();
  };
  reader.readAsDataURL(file);
}

// المكالمات
function startCall(type) {
  if(!activeChatUser) return;
  document.getElementById('callTargetName').innerText = activeChatUser.name;
  document.getElementById('callAvatar').src = activeChatUser.avatar;
  document.getElementById('callModal').style.display = 'flex';
}

function endCall() {
  document.getElementById('callModal').style.display = 'none';
}

function logout() {
  auth.signOut();
}
