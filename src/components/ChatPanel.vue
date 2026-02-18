<template>
  <div class="chat-panel" :class="{ 'chat-open': isOpen, 'chat-mobile': isMobile }">
    <!-- Bouton toggle chat -->
    <button @click="toggleChat" class="chat-toggle-btn">
      <svg v-if="!isOpen" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
        <path fill-rule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.678 3.348-3.97z" clip-rule="evenodd" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
        <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
      </svg>
      <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
    </button>

    <!-- Panel de chat -->
    <div v-if="isOpen" class="chat-container" :class="{ 'with-pip': showPictureInPicture }">
      <!-- Mini vidéo flottante (Picture-in-Picture) -->
      <div v-if="showPictureInPicture" class="pip-video" @click="closeChatOnMobile">
        <div class="pip-content">
          <div class="pip-avatar" v-if="userRole === 'client'">
            <!-- Avatar miniature -->
            <div class="mini-avatar"></div>
          </div>
          <video v-else class="pip-video-element" :srcObject="remoteStream" autoplay muted></video>
          <div class="pip-controls">
            <button @click.stop="togglePipMute" class="pip-btn">
              <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18z" />
              </svg>
            </button>
            <span class="pip-timer">{{ callTimer }}</span>
          </div>
        </div>
      </div>
      <!-- Header -->
      <div class="chat-header">
        <h3 class="chat-title">Chat</h3>
        <button @click="toggleChat" class="close-btn">×</button>
      </div>

      <!-- Messages -->
      <div ref="messagesContainer" class="messages-container">
        <div v-for="message in messages" :key="message.id" 
             :class="['message', message.sender === currentUserId ? 'message-sent' : 'message-received']">
          
          <!-- Message texte -->
          <div v-if="message.type === 'text'" class="message-content">
            <p>{{ message.content }}</p>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>

          <!-- Message image -->
          <div v-else-if="message.type === 'image'" class="message-content">
            <img :src="message.content" @click="openImageModal(message.content)" class="message-image" />
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>

          <!-- Message fichier -->
          <div v-else-if="message.type === 'file'" class="message-content">
            <div class="file-message">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                <path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clip-rule="evenodd" />
              </svg>
              <a :href="message.content" :download="message.fileName" class="file-link">
                {{ message.fileName }}
              </a>
            </div>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
        </div>
      </div>

      <!-- Input zone -->
      <div class="chat-input-zone">
        <!-- Preview des fichiers -->
        <div v-if="filePreview" class="file-preview">
          <img v-if="filePreview.type.startsWith('image/')" :src="filePreview.url" class="preview-image" />
          <div v-else class="preview-file">
            <span>{{ filePreview.name }}</span>
            <button @click="cancelFile" class="cancel-file">×</button>
          </div>
        </div>

        <!-- Zone de saisie -->
        <div class="input-container">
          <input type="file" ref="fileInput" @change="handleFileSelect" accept="image/*,.pdf,.doc,.docx,.txt" style="display: none" />
          
          <button @click="$refs.fileInput.click()" class="attach-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
              <path fill-rule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.061l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z" clip-rule="evenodd" />
            </svg>
          </button>

          <input v-model="newMessage" @keyup.enter="sendMessage" 
                 placeholder="Tapez votre message..." class="message-input" />
          
          <button @click="sendMessage" :disabled="!canSend" class="send-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal image -->
    <div v-if="imageModal" @click="closeImageModal" class="image-modal">
      <img :src="imageModal" class="modal-image" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'

const props = defineProps({
  socket: Object,
  currentUserId: String,
  remoteUserId: String,
  isInCall: Boolean,
  userRole: String,
  remoteStream: MediaStream,
  isMuted: Boolean,
  callTimer: String
})

const emit = defineEmits(['toggle-mute', 'close-chat'])

const isOpen = ref(false)
const isMobile = ref(window.innerWidth < 768)
const messages = ref([])
const newMessage = ref('')
const unreadCount = ref(0)
const messagesContainer = ref(null)
const fileInput = ref(null)
const filePreview = ref(null)
const imageModal = ref(null)

const showPictureInPicture = computed(() => {
  return isMobile.value && isOpen.value && props.isInCall
})

const canSend = computed(() => {
  return (newMessage.value.trim() || filePreview.value) && props.isInCall
})

// Responsive
onMounted(() => {
  const handleResize = () => {
    isMobile.value = window.innerWidth < 768
  }
  window.addEventListener('resize', handleResize)
})

const toggleChat = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    unreadCount.value = 0
    nextTick(() => scrollToBottom())
  }
}

const sendMessage = async () => {
  if (!canSend.value) return

  if (filePreview.value) {
    await sendFile()
  } else if (newMessage.value.trim()) {
    const message = {
      id: Date.now(),
      type: 'text',
      content: newMessage.value.trim(),
      sender: props.currentUserId,
      timestamp: Date.now()
    }
    
    messages.value.push(message)
    props.socket.emit('chat-message', {
      to: props.remoteUserId,
      message
    })
    
    newMessage.value = ''
    nextTick(() => scrollToBottom())
  }
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Vérifier la taille (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('Fichier trop volumineux (max 10MB)')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    filePreview.value = {
      file,
      name: file.name,
      type: file.type,
      url: e.target.result
    }
  }
  reader.readAsDataURL(file)
}

const sendFile = async () => {
  if (!filePreview.value) return

  const message = {
    id: Date.now(),
    type: filePreview.value.type.startsWith('image/') ? 'image' : 'file',
    content: filePreview.value.url,
    fileName: filePreview.value.name,
    sender: props.currentUserId,
    timestamp: Date.now()
  }

  messages.value.push(message)
  props.socket.emit('chat-message', {
    to: props.remoteUserId,
    message
  })

  filePreview.value = null
  fileInput.value.value = ''
  nextTick(() => scrollToBottom())
}

const cancelFile = () => {
  filePreview.value = null
  fileInput.value.value = ''
}

const openImageModal = (src) => {
  imageModal.value = src
}

const closeImageModal = () => {
  imageModal.value = null
}

const togglePipMute = () => {
  emit('toggle-mute')
}

const closeChatOnMobile = () => {
  if (isMobile.value) {
    isOpen.value = false
    emit('close-chat')
  }
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Écouter les messages entrants
if (props.socket) {
  props.socket.on('chat-message', (data) => {
    messages.value.push(data.message)
    
    if (!isOpen.value) {
      unreadCount.value++
      
      // Notification sonore (optionnelle)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nouveau message', {
          body: data.message.type === 'text' ? data.message.content : 'Fichier reçu',
          icon: '/favicon.ico'
        })
      }
    }
    
    nextTick(() => scrollToBottom())
  })
  
  // Demander la permission pour les notifications
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// Auto-scroll sur nouveaux messages
watch(() => messages.value.length, () => {
  nextTick(() => scrollToBottom())
})
</script>

<style scoped>
.chat-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 200;
}

.chat-mobile {
  bottom: 0;
  right: 0;
  left: 0;
  top: 0;
}

.chat-toggle-btn {
  position: relative;
  width: 60px;
  height: 60px;
  background: #3b82f6;
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  transition: all 0.3s ease;
}

.chat-toggle-btn:hover {
  background: #2563eb;
  transform: scale(1.05);
}

.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.chat-container {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 350px;
  height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-mobile .chat-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.chat-header {
  background: #3b82f6;
  color: white;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-title {
  font-weight: 600;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  flex-direction: column;
}

.message-sent {
  align-items: flex-end;
}

.message-received {
  align-items: flex-start;
}

.message-content {
  max-width: 80%;
  background: #f3f4f6;
  padding: 12px;
  border-radius: 12px;
  position: relative;
}

.message-sent .message-content {
  background: #3b82f6;
  color: white;
}

.message-content p {
  margin: 0 0 8px 0;
  word-wrap: break-word;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  cursor: pointer;
  display: block;
  margin-bottom: 8px;
}

.file-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.file-link {
  color: inherit;
  text-decoration: none;
  font-size: 14px;
}

.file-link:hover {
  text-decoration: underline;
}

.chat-input-zone {
  border-top: 1px solid #e5e7eb;
  padding: 16px;
}

.file-preview {
  margin-bottom: 12px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 8px;
}

.preview-image {
  max-width: 100px;
  max-height: 100px;
  border-radius: 4px;
}

.preview-file {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cancel-file {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.input-container {
  display: flex;
  gap: 8px;
  align-items: center;
}

.attach-btn, .send-btn {
  background: #6b7280;
  border: none;
  color: white;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn:not(:disabled) {
  background: #3b82f6;
}

.message-input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  outline: none;
}

.message-input:focus {
  border-color: #3b82f6;
}

.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}

.modal-image {
  max-width: 90%;
  max-height: 90%;
  border-radius: 8px;
}

/* Picture-in-Picture pour mobile */
.pip-video {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 120px;
  height: 160px;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  z-index: 10;
}

.pip-content {
  position: relative;
  width: 100%;
  height: 100%;
}

.pip-video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mini-avatar {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.pip-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pip-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
}

.pip-timer {
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.with-pip .messages-container {
  padding-top: 200px; /* Espace pour le PiP */
}

@media (max-width: 768px) {
  .chat-toggle-btn {
    width: 50px;
    height: 50px;
    bottom: 100px;
    right: 15px;
  }
  
  .chat-container {
    width: 100vw;
    height: 100vh;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }
  
  .pip-video {
    top: 80px;
    right: 15px;
    width: 100px;
    height: 130px;
  }
  
  .message-content {
    max-width: 85%;
  }
  
  .message-image {
    max-width: 150px;
    max-height: 150px;
  }
  
  .input-container {
    padding: 8px;
  }
  
  .message-input {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .chat-header {
    padding: 12px;
  }
  
  .messages-container {
    padding: 12px;
  }
  
  .chat-input-zone {
    padding: 12px;
  }
  
  .message-content {
    padding: 10px;
    max-width: 90%;
  }
}
</style>