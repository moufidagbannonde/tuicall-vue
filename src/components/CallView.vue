<template>
  <div class="call-container" :class="{ 'video-call': isVideoCall }">
    <!-- Remote Video/Audio Stream -->
    <div class="remote-stream-container" v-if="callStatus === 'connected'">
      <video ref="remoteVideo" autoplay :class="{ 'hidden': !isVideoCall }"></video>
      <div class="remote-audio-indicator" v-if="!isVideoCall">
        <div class="user-avatar"><span class="text-2xl font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-gray-800 rounded-full w-28 h-28 flex items-center justify-center">
          {{ remoteUserId.charAt(0).toUpperCase() }}
        </span></div>
        <div class="audio-waves">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>

    <!-- Local Video Preview -->
    <div class="local-stream-container" v-if="localStream && isVideoCall">
      <video ref="localVideo" autoplay muted></video>
    </div>

    <!-- Call Status Indicator -->
    <p>État de l'appel : {{ callStatusText }}</p>
    <div class="call-status" v-if="callStatus !== 'connected'">
      <div class="status-message">
        <template v-if="callStatus === 'outgoing'">
          Appel en cours vers {{ remoteUserId }}...
        </template>
        <template v-else-if="callStatus === 'incoming'">
          Appel entrant de {{ remoteUserId }}
        </template>
      </div>
    </div>

    <!-- Commandes d'appel -->
    <div class="call-controls">
      <button @click="toggleMute" class="control-btn" :class="{ 'active': isMuted }">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
          <path v-if="!isMuted" d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
          <path v-if="!isMuted"
            d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
          <path v-if="isMuted"
            d="M10.5 1.875a1.125 1.125 0 012.25 0v8.25c0 .621-.504 1.125-1.125 1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-8.25a1.125 1.125 0 011.125-1.125h1.5zm-4.5 4.5a.75.75 0 00-1.5 0v5.25c0 2.9 2.35 5.25 5.25 5.25h3a.75.75 0 000-1.5h-3a3.75 3.75 0 01-3.75-3.75V6.375z" />
          <path v-if="isMuted" d="M19.78 17.28a.75.75 0 00-1.06-1.06L6.22 28.72a.75.75 0 101.06 1.06L19.78 17.28z" />
        </svg>
      </button>

      <button @click="toggleVideo" class="control-btn" :class="{ 'active': isVideoOff }" v-if="isVideoCall">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
          <path v-if="!isVideoOff"
            d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
          <path v-if="isVideoOff"
            d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.5 17.69c0 .471-.202.86-.504 1.124l-9.309-9.31c.043-.043.086-.084.129-.124H21a1.5 1.5 0 011.5 1.5v6.75z" />
        </svg>
      </button>

      <button @click="endCall" class="control-btn end-call">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
          <path fill-rule="evenodd"
            d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
            clip-rule="evenodd" />
          <path fill-rule="evenodd" d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18z"
            clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <!-- Commandes d'appel entrant -->
    <div class="incoming-call-controls" v-if="callStatus === 'incoming'">
      <button @click="acceptCall" class="accept-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
          <path fill-rule="evenodd"
            d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
            clip-rule="evenodd" />
        </svg>
        Accepter
      </button>
      <button @click="rejectCall" class="reject-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
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
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import WebRTCService from '../services/WebRTCService';

const props = defineProps({
  socket: Object,
  currentUserId: String,
  remoteUserId: String,
  isVideoCall: Boolean,
  callStatus: String,
  isIncoming: Boolean
});

const emit = defineEmits(['call-ended', 'call-status-change', 'video-disabled']);

// Refs for video elements
const localVideo = ref(null);
const remoteVideo = ref(null);

// State variables
const localStream = ref(null);
const remoteStream = ref(null);
const isMuted = ref(false);
const isVideoOff = ref(false);
// Add this line to create a local ref for video call state
const localIsVideoCall = ref(props.isVideoCall);
const currentCallStatus = ref('');

// Watch for props.isVideoCall changes
watch(() => props.isVideoCall, (newValue) => {
  localIsVideoCall.value = newValue;
});

const callStatusText = computed(() => {
  switch (currentCallStatus.value) {
    case 'outgoing': return 'Appel en cours';
    case 'incoming': return 'Appel entrant';
    case 'connected': return 'Appel connecté';
    default: return 'En attente';
  }
});


// Start an outgoing call
const startOutgoingCall = async () => {
  try {
    const result = await WebRTCService.getLocalMedia(localIsVideoCall.value);

    if (!result.success) {
      if (result.noAudioDevice) {
        alert('Aucun périphérique audio trouvé. Impossible de passer un appel.');
        emit('call-ended');
        return;
      }
      throw result.error;
    }

    if (result.fallbackToAudio) {
      const switchToAudio = confirm(
        'Aucune caméra n\'a été trouvée. Voulez-vous basculer vers un appel audio ?'
      );
      if (switchToAudio) {
        localIsVideoCall.value = false;
        emit('video-disabled');
      } else {
        emit('call-ended');
        return;
      }
    }

    localStream.value = result.stream;
    currentCallStatus.value = 'outgoing'; // Mettre à jour l'état local
    await WebRTCService.makeCall(props.remoteUserId, !result.fallbackToAudio && localIsVideoCall.value);
  } catch (error) {
    console.error('Failed to start call:', error);
    alert('Erreur lors de l\'initialisation de l\'appel. Veuillez réessayer.');
    emit('call-ended');
  }
};

// Handle remote stream
const handleRemoteStream = (stream) => {
  remoteStream.value = stream;
  if (remoteVideo.value) {
    remoteVideo.value.srcObject = stream;
  }
};

// Handle call status change
const handleCallStatusChange = (status, userId, withVideo) => {
  console.log('Call status changed:', status); // Pour le débogage
  currentCallStatus.value = status; // Mettre à jour l'état local
  emit('call-status-change', status, userId, withVideo);
};
// Initialize WebRTC service
onMounted(() => {
  localIsVideoCall.value = props.isVideoCall;
  currentCallStatus.value = props.callStatus || '';
  WebRTCService.init(props.socket, props.currentUserId, handleRemoteStream, handleCallStatusChange);

  if (props.callStatus === 'outgoing' && props.remoteUserId) {
    startOutgoingCall();
  }
});

// Clean up on component unmount
onUnmounted(() => {
  WebRTCService.endCall();
});

// Watch for changes in video elements to attach streams
watch([localVideo, remoteVideo, localStream, remoteStream], () => {
  if (localVideo.value && localStream.value) {
    localVideo.value.srcObject = localStream.value;
  }
  if (remoteVideo.value && remoteStream.value) {
    remoteVideo.value.srcObject = remoteStream.value;
  }
});

// Accept an incoming call
const acceptCall = async () => {
  try {
    const result = await WebRTCService.getLocalMedia(localIsVideoCall.value);
    if (!result.success) {
      throw result.error;
    }
    localStream.value = result.stream;
    await WebRTCService.acceptCall();
  } catch (error) {
    console.error('Failed to accept call:', error);
    emit('call-ended');
  }
};

// Reject an incoming call
const rejectCall = () => {
  WebRTCService.rejectCall();
  emit('call-ended');
};

// End the current call
const endCall = () => {
  WebRTCService.endCall();
  emit('call-ended');
};

// Toggle audio mute
const toggleMute = () => {
  isMuted.value = !isMuted.value;
  WebRTCService.toggleAudio(isMuted.value);
};

// Toggle video
const toggleVideo = () => {
  isVideoOff.value = !isVideoOff.value;
  WebRTCService.toggleVideo(isVideoOff.value);
};
</script>

<style scoped>
.call-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #1a1a1a;
  color: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.remote-stream-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.remote-stream-container video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.local-stream-container {
  position: absolute;
  bottom: 80px;
  right: 20px;
  width: 150px;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 2px solid white;
}

.local-stream-container video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.call-controls {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 10px;
}

.control-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.control-btn.active {
  background-color: #dc2626;
}

.control-btn.end-call {
  background-color: #dc2626;
}
</style>