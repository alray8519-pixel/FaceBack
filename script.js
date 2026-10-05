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

// توليد كود عشوائي مكون من 4 أرقام يختلف تماماً عن 0000
function generateUniqueCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (code === '0000');
  return code;
}

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
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  if (authMode === 'signup') {
    const name = document.getElementById('authName').value;
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
    auth.signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
  }
}

// تحميل بيانات الملف الشخصي وعرضها بشكل صحيح
function loadUserData() {
  if (!currentUser) return;

  // إدراج البريد الإلكتروني الافتراضي المأخوذ من Firebase Auth
  document.getElementById('profileEmailInput').value = currentUser.email || '';

  db.collection('users').doc(currentUser.uid).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      const userCode = data.code || generateUniqueCode();
      const userAvatar = data.avatar || 'https://via.placeholder.com/100';
      const userName = data.name || currentUser.email.split('@')[0];

      // تعبئة عناصر الواجهة بالبيانات الصحيحة
      document.getElementById('myCode').innerText = userCode;
      document.getElementById('myAvatar').src = userAvatar;
      document.getElementById('profileImage').src = userAvatar;
      document.getElementById('profileNameInput').value = userName;
      document.getElementById('profileEmailInput').value = data.email || currentUser.email;
      document.getElementById('profileCodeInput').value = userCode;

      // تحديث البيانات إذا كان الكود غير مسجل من قبل
      if (!data.code) {
        db.collection('users').doc(currentUser.uid).set({ code: userCode }, { merge: true });
      }
    } else {
      // إنشاء مستند المستخدم فورياً إذا لم يوجد
      const newCode = generateUniqueCode();
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

// تحميل المحادثات السابقة
function loadChats() {
  const chatsList = document.getElementById('chatsList');
  if(!chatsList) return;
  chatsList.innerHTML = '<p style="text-align:center; padding:10px; color:var(--text-muted)">لا توجد محادثات نشطة</p>';
}

// البحث عن أصدقاء بواسطة الكود
function searchAndAddFriend() {
  const code = document.getElementById('friendCodeInput').value.trim();
  if(code.length !== 4) return alert('الكود يجب أن يتكون من 4 أرقام');

  db.collection('users').where('code', '==', code).get().then(snap => {
    if(snap.empty) {
      alert('لم يتم العثور على مستخدم بهذا الكود');
    } else {
      snap.forEach(doc => {
        if(doc.id === currentUser.uid) {
          alert('هذا الكود خاص بحسابك الحالي!');
          return;
        }
        const friend = doc.data();
        openChatWithUser(doc.id, friend.name, friend.avatar);
      });
    }
  });
}

// فتح محادثة
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

// التعامل مع رفع الملفات في الشات
function handleFileUpload(e) {
  const file = e.target.files[0];
  if(!file || !activeChatUser) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const msgData = {
      sender: currentUser.uid,
      receiver: activeChatUser.id,
      text: `<img src="${event.target.result}" style="max-width:200px; border-radius:8px;">`,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    db.collection('messages').add(msgData);
  };
  reader.readAsDataURL(file);
}

// نسخ الكود
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