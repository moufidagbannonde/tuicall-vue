<template>
  <div class="app-container">
    <!-- Call Controls (when not in a call) -->
    <div v-if="!isInCall" class="controls-container">
      <h1 class="app-title">Vue WebRTC Call</h1>
      <CallControls @call-initiated="handleCallInitiation" />
      <div class="user-id-display">
        <p>Votre ID: <span class="user-id">{{ currentUserId }}</span></p>
        <p class="help-text">Partagez cet ID avec vos contacts pour qu'ils puissent vous appeler</p>
      </div>
    </div>

    <!-- Call View (when in a call) -->
    <CallView
  v-if="isInCall"
  :socket="socket"
  :current-user-id="currentUserId"
  :remote-user-id="remoteUserId"
  :is-video-call="isVideoCall"
  :call-status="callStatus"
  :is-incoming="isIncomingCall"
  @call-ended="handleCallEnded"
  @call-status-change="handleCallStatusChange"
  @video-disabled="handleVideoDisabled"
/>


    <!-- Incoming Call Modal -->
    <div v-if="callStatus === 'incoming'"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
        <div class="flex flex-col items-center">
          <!-- Avatar de l'appelant -->
          <div class="w-20 h-20 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
            <span class="text-2xl font-bold text-indigo-600 dark:text-indigo-300">
              {{ remoteUserId.charAt(0).toUpperCase() }}
            </span>
          </div>

          <!-- Informations de l'appel -->
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Appel entrant</h2>
          <p class="text-gray-600 dark:text-gray-300 mb-2">{{ remoteUserId }}</p>
          <p class="text-sm text-indigo-600 dark:text-indigo-400 mb-6">
            {{ isVideoCall ? 'Appel vidéo' : 'Appel audio' }}
          </p>

          <!-- Animation d'appel -->
          <div class="flex gap-1 mb-6">
            <span class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></span>
          </div>

          <!-- Boutons d'action -->
          <div class="flex gap-4">
            <button @click="acceptIncomingCall"
              class="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                <path fill-rule="evenodd"
                  d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                  clip-rule="evenodd" />
              </svg>
              Accepter
            </button>
            <button @click="rejectCall"
              class="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                <path fill-rule="evenodd"
                  d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                  clip-rule="evenodd" />
                <path fill-rule="evenodd" d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18z"
                  clip-rule="evenodd" />
              </svg>
              Rejeter
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import CallControls from './components/CallControls.vue';
import CallView from './components/CallView.vue';
import WebRTCService from './services/WebRTCService';

// Generate a random user ID
const generateUserId = () => {
  return 'user_' + Math.random().toString(36).substr(2, 9);
};

// State variables
const socket = ref(null);
const currentUserId = ref(generateUserId());
// const currentUserId = ref("");
const remoteUserId = ref('');
const isInCall = ref(false);
const isVideoCall = ref(false);
const callStatus = ref('idle'); // idle, outgoing, incoming, connected
const isIncomingCall = ref(false);
const localStream = ref(null);
// Initialize socket connection
onMounted(() => {
  // Connect to your signaling server
  socket.value = io('http://localhost:8080');

  // Register with the server
  socket.value.emit('register', { userId: currentUserId.value });

  // Initialize WebRTC service
  WebRTCService.init(
    socket.value,
    currentUserId.value,
    handleRemoteStream,
    handleCallStatusChange
  );
});

// Clean up on component unmount
onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});

// Handle call initiation
const handleCallInitiation = (targetUserId, withVideo) => {
  remoteUserId.value = targetUserId;
  isVideoCall.value = withVideo;
  callStatus.value = 'outgoing';
  isInCall.value = true;
  isIncomingCall.value = false;
};

// Handle remote stream
const handleRemoteStream = (stream) => {
  // This is handled by the CallView component
  console.log('Remote stream received');
};

// Handle call status change
const handleCallStatusChange = (status, userId, withVideo) => {
  console.log('Statut reçu de l\'appel', status, 'de', userId);
  callStatus.value = status;
  
  if (status === 'incoming') {
    remoteUserId.value = userId;
    isVideoCall.value = withVideo;
    isIncomingCall.value = true;
  } else if (status === 'connected') {
    isInCall.value = true;
  }
};

// Handle call end
const handleCallEnded = () => {
  isInCall.value = false;
  callStatus.value = 'idle';
  remoteUserId.value = '';
  isIncomingCall.value = false;
  isVideoCall.value = false; 
};

// Accept incoming call
const acceptIncomingCall = async () => {
  isInCall.value = true;
  callStatus.value = 'connected';
  
  try {
    // Use isVideoCall instead of localIsVideoCall
    const result = await WebRTCService.getLocalMedia(isVideoCall.value);
    if (!result.success) {
      throw result.error;
    }
    localStream.value = result.stream;
    await WebRTCService.acceptCall();
  } catch (error) {
    console.error('Failed to accept call:', error);
    // Handle the error by ending the call
    handleCallEnded();
  }
};

// Fix the function name to match the template
const rejectCall = () => {
  WebRTCService.rejectCall();
  handleCallEnded();
};



// Add this new handler
const handleVideoDisabled = () => {
  isVideoCall.value = false;
};
</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Inter', sans-serif;
}

.controls-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.app-title {
  color: white;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-id-display {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 1rem;
  border-radius: 0.5rem;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.user-id {
  font-weight: bold;
  color: #4f46e5;
}

.help-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

.incoming-call-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0
}
</style>