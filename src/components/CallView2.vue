<template>
  <div class="call-container" :class="{ 'video-call': isVideoCall }">
    
    <!-- Arrière-plan avec initiale (pour appels audio) -->
    <div class="background-initial" v-if="!isVideoCall && currentCallStatus !== 'connected'">
      <span class="large-initial">
        {{ remoteUserId.charAt(0).toUpperCase() }}
      </span>
    </div>

    <!-- Chronomètre d'appel -->
    <div class="call-timer" v-if="currentCallStatus === 'connected'">
      {{ formattedCallDuration }}
    </div>

    <!-- Statut de l'appel -->
    <div class="call-status">
      <div class="status-message">
        <template v-if="currentCallStatus === 'outgoing'">
          📞 Appel en cours avec {{ remoteUserId }}...
        </template>
        <template v-else-if="currentCallStatus === 'incoming'">
          📞 Appel entrant de {{ remoteUserId }}...
        </template>
        <template v-else-if="currentCallStatus === 'connected'">
          ✅ En appel avec {{ remoteUserId }}
        </template>
      </div>
    </div>

    <!-- Flux vidéo distant (plein écran) -->
    <div class="remote-stream-container">
      <video
        v-if="isVideoCall && remoteStream"
        ref="remoteVideo"
        id="remoteVideo"
        autoplay
        playsinline
        :muted="false"
        :style="{ transform: 'scaleX(-1)' }"
      ></video>
      
      <!-- Avatar audio distant (si pas de vidéo) -->
      <div v-if="!isVideoCall && currentCallStatus === 'connected'" class="remote-audio-indicator">
        <div class="user-avatar large">
          <span>{{ remoteUserId.charAt(0).toUpperCase() }}</span>
        </div>
      </div>
    </div>

    <!-- Partage d'écran -->
    <video
      v-if="screenSharingActive && !isScreenSharer"
      ref="screenShareVideo"
      autoplay
      playsinline
      class="screen-share-video"
    ></video>

    <!-- Flux vidéo local (miniature) -->
    <div class="local-stream-container" v-if="currentCallStatus === 'connected' || localStream">
      <video
        v-if="isVideoCall && localStream"
        ref="localVideo"
        autoplay
        muted
        playsinline
        :style="{ transform: 'scaleX(-1)' }"
      ></video>
      
      <!-- Avatar audio local (si pas de vidéo) -->
      <div class="local-audio-indicator" v-if="!isVideoCall">
        <div class="user-avatar">
          <span>{{ currentUserId.charAt(0).toUpperCase() }}</span>
        </div>
      </div>
    </div>

    <!-- Indicateurs média distant -->
    <div class="remote-media-indicators">
      <transition name="fade">
        <div v-if="!remoteVideoEnabled && isVideoCall" class="media-indicator video-off">
          <span>🎥</span>
          <p>{{ remoteUserId }} a coupé sa caméra</p>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="!remoteAudioEnabled" class="media-indicator audio-off">
          <span>🎤</span>
          <p>{{ remoteUserId }} a coupé son micro</p>
        </div>
      </transition>
    </div>

    <!-- Contrôles d'appel (TOUJOURS VISIBLES pendant l'appel) -->
    <div class="call-controls" v-if="currentCallStatus === 'connected'">
      <!-- Mute -->
      <button 
        @click="toggleMute" 
        class="control-btn" 
        :class="{ active: isMuted }" 
        title="Couper le micro"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path v-if="!isMuted" d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z"/>
          <path v-if="!isMuted" d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z"/>
          <path v-if="isMuted" d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18z"/>
        </svg>
      </button>

      <!-- Vidéo -->
      <button 
        v-if="isVideoCall" 
        @click="toggleVideo" 
        class="control-btn" 
        :class="{ active: isVideoOff }" 
        title="Couper la caméra"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path v-if="!isVideoOff" d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z"/>
          <path v-if="isVideoOff" d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18z"/>
        </svg>
      </button>

      <!-- Partage d'écran -->
      <button 
        @click="toggleScreenShare" 
        class="control-btn"
        :class="{ active: screenSharingActive && isScreenSharer }"
        title="Partager l'écran"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm8 3l4 4h-3v4h-2v-4H8l4-4z"/>
        </svg>
      </button>

      <!-- Raccrocher -->
      <button @click="endCall" class="control-btn end-call" title="Terminer l'appel">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.73 3.73a.75.75 0 011.06-.001l5.5 5.5a.75.75 0 11-1.06 1.061l-5.5-5.5a.75.75 0 01-.001-1.06zM1.793 3.793a1 1 0 011.414 0l3.586 3.586A8.96 8.96 0 0111 6c5.523 0 10 4.477 10 10a8.96 8.96 0 01-1.379 4.793l3.586 3.586a1 1 0 01-1.414 1.414l-3.586-3.586A8.96 8.96 0 0111 24c-5.523 0-10-4.477-10-10a8.96 8.96 0 011.379-4.793L.793 5.207a1 1 0 010-1.414z"/>
        </svg>
      </button>
    </div>

    <!-- Contrôles appel entrant -->
    <div class="incoming-call-controls" v-if="callStatus === 'incoming'">
      <button @click="acceptCall" class="accept-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clip-rule="evenodd"/>
        </svg>
        Accepter
      </button>
      
      <button @click="rejectCall" class="reject-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clip-rule="evenodd"/>
          <path fill-rule="evenodd" d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18z" clip-rule="evenodd"/>
        </svg>
        Rejeter
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import WebRTCService from '../services/WebRTCService';
import { useToast } from 'vue-toastification';
import Peer from 'peerjs';

const props = defineProps({
  socket: Object,
  currentUserId: String,
  remoteUserId: String,
  isVideoCall: Boolean,
  callStatus: String,
  userRole: String,
});

const emit = defineEmits(['call-ended', 'call-status-change']);

const toast = useToast();

// Refs
const localVideo = ref(null);
const remoteVideo = ref(null);
const screenShareVideo = ref(null);
const localStream = ref(null);
const remoteStream = ref(null);
const currentCallStatus = ref('');
const isMuted = ref(false);
const isVideoOff = ref(false);
const remoteVideoEnabled = ref(true);
const remoteAudioEnabled = ref(true);

// Partage d'écran
const screenSharingActive = ref(false);
const isScreenSharer = ref(false);
const peerConnection = ref(null);
const remotePeerConnection = ref(null);
const screenShareCall = ref(null);

// Timer
const callStartTime = ref(null);
const callDuration = ref(0);
const timerInterval = ref(null);

const formattedCallDuration = computed(() => {
  const minutes = Math.floor(callDuration.value / 60);
  const seconds = callDuration.value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// Gestion du flux distant
const handleRemoteStream = (stream) => {
  console.log('[UI] Flux distant reçu');
  remoteStream.value = stream;
  
  if (remoteVideo.value) {
    remoteVideo.value.srcObject = stream;
    remoteVideo.value.play().catch(err => {
      console.warn('[UI] Autoplay bloqué:', err);
    });
  }
};

// Gestion changement de statut
const handleCallStatusChange = (status, userId, withVideo) => {
  console.log('[UI] Statut changé:', status);
  currentCallStatus.value = status;
  
  if (status === 'connected') {
    callStartTime.value = Date.now();
    timerInterval.value = setInterval(() => {
      callDuration.value = Math.floor((Date.now() - callStartTime.value) / 1000);
    }, 1000);
  } else if (status === 'ended' || status === 'rejected') {
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
    callDuration.value = 0;
  }
  
  emit('call-status-change', status, userId, withVideo);
};

// Démarrer appel sortant
const startOutgoingCall = async () => {
  try {
    const result = await WebRTCService.getLocalMedia(props.isVideoCall);
    
    if (!result.success) {
      if (result.noAudioDevice) {
        toast.warning('Aucun périphérique audio trouvé');
        emit('call-ended');
        return;
      }
      throw result.error;
    }
    
    if (result.fallbackToAudio) {
      toast.info('Caméra non disponible, appel audio uniquement');
    }
    
    localStream.value = result.stream;
    currentCallStatus.value = 'outgoing';
    
    await WebRTCService.makeCall(props.remoteUserId, props.isVideoCall && !result.fallbackToAudio);
    
  } catch (error) {
    console.error('[UI] Erreur démarrage appel:', error);
    toast.error('Erreur lors de l\'initialisation de l\'appel');
    emit('call-ended');
  }
};

// Accepter appel
const acceptCall = async () => {
  try {
    const result = await WebRTCService.getLocalMedia(props.isVideoCall);
    if (!result.success) {
      throw result.error;
    }
    
    localStream.value = result.stream;
    await WebRTCService.acceptCall();
    
    currentCallStatus.value = 'connected';
    emit('call-status-change', 'connected', props.remoteUserId, props.isVideoCall);
    
  } catch (error) {
    console.error('[UI] Erreur acceptation appel:', error);
    toast.error('Erreur lors de l\'acceptation de l\'appel');
    emit('call-ended');
  }
};

// Rejeter appel
const rejectCall = () => {
  WebRTCService.rejectCall();
  cleanupCallState();
  emit('call-ended');
};

// Terminer appel
const endCall = () => {
  WebRTCService.endCall();
  cleanupCallState();
  emit('call-ended');
};

// Nettoyer l'état
const cleanupCallState = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
  
  if (localStream.value) {
    localStream.value.getTracks().forEach(track => track.stop());
    localStream.value = null;
  }
  
  if (remoteStream.value) {
    remoteStream.value.getTracks().forEach(track => track.stop());
    remoteStream.value = null;
  }
  
  if (localVideo.value) localVideo.value.srcObject = null;
  if (remoteVideo.value) remoteVideo.value.srcObject = null;
  
  currentCallStatus.value = '';
  isMuted.value = false;
  isVideoOff.value = false;
  callDuration.value = 0;
  
  // Nettoyer le partage d'écran
  if (screenSharingActive.value) {
    stopScreenShare();
  }
};

// Toggle mute
const toggleMute = () => {
  isMuted.value = !isMuted.value;
  WebRTCService.toggleAudio(isMuted.value);
};

// Toggle video
const toggleVideo = () => {
  isVideoOff.value = !isVideoOff.value;
  WebRTCService.toggleVideo(isVideoOff.value);
};

// Partage d'écran
const initPeerJS = async () => {
  return new Promise((resolve, reject) => {
    peerConnection.value = new Peer(props.currentUserId, {
      debug: 2,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });

    peerConnection.value.on("open", () => {
      console.log('[PeerJS] Connexion ouverte');
      resolve();
    });

    peerConnection.value.on("call", (call) => {
      console.log('[PeerJS] Appel de partage d\'écran reçu');
      call.answer();
      
      call.on("stream", async (incomingStream) => {
        screenSharingActive.value = true;
        await nextTick();
        
        if (screenShareVideo.value) {
          screenShareVideo.value.srcObject = incomingStream;
          screenShareVideo.value.play().catch(err => {
            console.error('[PeerJS] Erreur lecture:', err);
          });
        }
      });
    });

    peerConnection.value.on("error", (err) => {
      console.error('[PeerJS] Erreur:', err);
      reject(err);
    });

    peerConnection.value.on("connection", (conn) => {
      remotePeerConnection.value = conn;
      
      conn.on("data", (data) => {
        if (data.type === "screen-share-stopped") {
          screenSharingActive.value = false;
          toast.info(`${props.remoteUserId} a arrêté de partager son écran`);
        }
      });
    });
  });
};

const toggleScreenShare = async () => {
  if (screenSharingActive.value && isScreenSharer.value) {
    stopScreenShare();
  } else {
    startScreenShare();
  }
};

const startScreenShare = async () => {
  try {
    if (!peerConnection.value) {
      await initPeerJS();
    }

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    if (!remotePeerConnection.value) {
      remotePeerConnection.value = peerConnection.value.connect(props.remoteUserId);
      
      remotePeerConnection.value.on("open", () => {
        sendScreenStream(screenStream);
      });
    } else {
      sendScreenStream(screenStream);
    }

    screenStream.getVideoTracks()[0].onended = () => {
      stopScreenShare();
    };

    isScreenSharer.value = true;
    screenSharingActive.value = true;

    props.socket.emit("screen-share-started", {
      from: props.currentUserId,
      to: props.remoteUserId,
    });

    toast.success("Partage d'écran démarré");
  } catch (error) {
    console.error('[ScreenShare] Erreur:', error);
    toast.error("Impossible de partager l'écran");
  }
};

const sendScreenStream = (screenStream) => {
  const call = peerConnection.value.call(props.remoteUserId, screenStream, {
    metadata: { type: "screen-share" },
  });

  call.on("error", (err) => {
    console.error('[ScreenShare] Erreur appel:', err);
    toast.error("Erreur lors du partage d'écran");
  });

  screenShareCall.value = call;

  if (remotePeerConnection.value && remotePeerConnection.value.open) {
    remotePeerConnection.value.send({
      type: "screen-share-started",
      from: props.currentUserId,
    });
  }
};

const stopScreenShare = async () => {
  if (screenShareVideo.value && screenShareVideo.value.srcObject) {
    screenShareVideo.value.srcObject.getTracks().forEach(track => track.stop());
    screenShareVideo.value.srcObject = null;
  }

  if (screenShareCall.value) {
    screenShareCall.value.close();
    screenShareCall.value = null;
  }

  isScreenSharer.value = false;
  screenSharingActive.value = false;

  await nextTick();

  if (remotePeerConnection.value && remotePeerConnection.value.open) {
    remotePeerConnection.value.send({
      type: "screen-share-stopped",
      from: props.currentUserId,
    });
  }

  props.socket.emit("screen-share-stopped", {
    from: props.currentUserId,
    to: props.remoteUserId,
  });

  toast.info("Partage d'écran arrêté");
};

// Watchers
watch([localVideo, localStream], () => {
  if (localVideo.value && localStream.value) {
    localVideo.value.srcObject = localStream.value;
  }
});

watch([remoteVideo, remoteStream], () => {
  if (remoteVideo.value && remoteStream.value) {
    remoteVideo.value.srcObject = remoteStream.value;
  }
});

watch(() => props.callStatus, (newStatus) => {
  currentCallStatus.value = newStatus;
});

// Lifecycle
onMounted(async () => {
  // Nettoyer les anciens écouteurs
  props.socket.off('toggle-video');
  props.socket.off('toggle-audio');
  props.socket.off('screen-share-started');
  props.socket.off('screen-share-stopped');
  
  // Initialiser WebRTC
  WebRTCService.init(
    props.socket,
    props.currentUserId,
    handleRemoteStream,
    handleCallStatusChange
  );
  
  // Initialiser PeerJS pour le partage d'écran
  try {
    await initPeerJS();
  } catch (error) {
    console.error('[PeerJS] Erreur initialisation:', error);
  }
  
  // Écouteurs Socket.IO
  props.socket.on('toggle-video', (data) => {
    if (data.from === props.remoteUserId) {
      remoteVideoEnabled.value = !data.off;
    }
  });
  
  props.socket.on('toggle-audio', (data) => {
    if (data.from === props.remoteUserId) {
      remoteAudioEnabled.value = !data.off;
    }
  });
  
  props.socket.on('screen-share-started', (data) => {
    if (data.from === props.remoteUserId) {
      toast.info(`${props.remoteUserId} a commencé à partager son écran`);
    }
  });
  
  props.socket.on('screen-share-stopped', (data) => {
    if (data.from === props.remoteUserId) {
      screenSharingActive.value = false;
      toast.info(`${props.remoteUserId} a arrêté de partager son écran`);
    }
  });
  
  // Démarrer appel sortant si nécessaire
  if (props.callStatus === 'outgoing' && props.remoteUserId) {
    await startOutgoingCall();
  }
});

onUnmounted(() => {
  props.socket.off('toggle-video');
  props.socket.off('toggle-audio');
  props.socket.off('screen-share-started');
  props.socket.off('screen-share-stopped');
  
  if (peerConnection.value) {
    peerConnection.value.destroy();
    peerConnection.value = null;
  }
  
  cleanupCallState();
});
</script>
<style scoped>
.call-container {
  position: relative;
  width: 100%;
  height: 100vh;
  background-color: #1a1a1a;
  color: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.background-initial {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.1;
  pointer-events: none;
}

.large-initial {
  font-size: 20rem;
  font-weight: bold;
  color: white;
}

.call-timer {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 1.3rem;
  font-weight: bold;
  z-index: 10;
}

.call-status {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.status-message {
  background-color: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 1.1rem;
  text-align: center;
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
  bottom: 100px;
  right: 20px;
  width: 180px;
  height: 240px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  border: 3px solid rgba(255, 255, 255, 0.2);
  background-color: #2a2a2a;
  z-index: 10;
}

.local-stream-container video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.local-audio-indicator {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
}

.user-avatar span {
  font-size: 2rem;
  font-weight: bold;
  color: white;
}

.remote-media-indicators {
  position: fixed;
  top: 140px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 50;
}

.media-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.media-indicator span {
  font-size: 1.5rem;
}

.media-indicator p {
  margin: 0;
  font-size: 0.9rem;
}

.call-controls {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  z-index: 10;
}

.control-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.control-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.control-btn svg {
  width: 28px;
  height: 28px;
}

.control-btn.active {
  background-color: #dc2626;
}

.control-btn.end-call {
  background-color: #dc2626;
  width: 70px;
  height: 70px;
}

.control-btn.end-call:hover {
  background-color: #b91c1c;
}

.incoming-call-controls {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 30px;
  z-index: 10;
}

.accept-btn,
.reject-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 30px;
  border-radius: 50px;
  border: none;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.accept-btn {
  background-color: #10b981;
  color: white;
}

.accept-btn:hover {
  background-color: #059669;
  transform: scale(1.05);
}

.reject-btn {
  background-color: #ef4444;
  color: white;
}

.reject-btn:hover {
  background-color: #dc2626;
  transform: scale(1.05);
}

.accept-btn svg,
.reject-btn svg {
  width: 24px;
  height: 24px;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>