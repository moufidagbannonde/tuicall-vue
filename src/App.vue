<template>
  <div class="app-container">
    <!-- Modal de saisie du nom -->
    <div v-if="!currentUserId" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
        <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Entrez votre nom</h2>
        <input type="text" v-model="userName" @keyup.enter="submitUserName" placeholder="Votre nom"
          class="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:text-white" />
        <button @click="submitUserName" :disabled="!userName.trim()"
          class="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50">
          Commencer
        </button>
      </div>
    </div>

    <!-- Call Controls (quand l'appel n'est pas encore lancé) -->

    <div v-if="!isInCall && currentUserId" class="controls-container">
      <h1 class="app-title">Vue WebRTC Call</h1>
      <CallControls @call-initiated="handleCallInitiation" />
      <div class="user-id-display">
        <p>Votre ID: <span class="user-id">{{ currentUserId }}</span></p>
        <p class="help-text">Partagez cet ID avec vos contacts pour qu'ils puissent vous appeler</p>
      </div>
    </div>
    <!-- Call View (quand l'appel) -->
    <CallView v-if="isInCall" :socket="socket" :current-user-id="currentUserId" :remote-user-id="remoteUserId"
      :is-video-call="isVideoCall" :call-status="callStatus" :is-incoming="isIncomingCall" @call-ended="handleCallEnded"
      @call-status-change="handleCallStatusChange" @video-disabled="handleVideoDisabled" />
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

// Initialisation des refs
const userName = ref('');
const socket = ref(null);
const currentUserId = ref('');
const remoteUserId = ref('');
const isVideoCall = ref(false);
const isInCall = ref(false);
const callStatus = ref('idle');
const isIncomingCall = ref(false);
const localStream = ref(null);

// Ajout de onMounted pour initialiser automatiquement les IDs depuis l'URL
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const agentId = params.get('agentId');
  const clientId = params.get('clientId');
  const role = params.get('role');
  // const encodedData = params.get('data');

  if (agentId && clientId) {
    // Set username based on role
    if (role === 'agent') {
      // For agent, use the decoded data
      userName.value = agentId;
    } else {
      // For client, use the clientId
      userName.value = clientId;
    }

    submitUserName();

    // Initialize call automatically if it's the agent
    // if (role === 'agent') {
    //   setTimeout(() => {
    //     console.log('Agent initiating call to client:', clientId);
    //     handleCallInitiation(clientId, true);
    //   }, 1000);
    // }
  }
});

// Update submitUserName to use role parameter
// Ajouter une nouvelle ref pour l'état d'attente
const isWaitingForClient = ref(false);
const waitingForUserId = ref('');

// Modifier submitUserName()
const submitUserName = () => {
  const params = new URLSearchParams(window.location.search);
  const agentId = params.get('agentId');
  const clientId = params.get('clientId');
  const role = params.get('role');

  if (agentId && clientId) {
    socket.value = io('http://localhost:8080');
    
    if (role === 'agent') {
      currentUserId.value = agentId;
      remoteUserId.value = clientId;
      // Activer l'état d'attente pour l'agent
      isWaitingForClient.value = true;
      waitingForUserId.value = clientId;

      // Écouter la connexion du client
      socket.value.on('user-connected', (connectedUserId) => {
        if (connectedUserId === clientId) {
          isWaitingForClient.value = false;
          console.log('Client connected, initiating call...');
          handleCallInitiation(clientId, true);
        }
      });
    } else {
      currentUserId.value = clientId;
      remoteUserId.value = agentId;
    }

    socket.value.emit('user-connected', currentUserId.value);
  
      // Écouter les événements d'appel
      socket.value.on('call-invitation', (data) => {
        console.log('Invitation reçue:', data);
        handleCallStatusChange('incoming', data.callerID, true);
      });
  
      socket.value.on('invitation-error', (data) => {
        console.error('Erreur d\'invitation:', data.message);
        handleCallStatusChange('idle', null, false);
      });
  
      socket.value.on('call-answer-received', (data) => {
        if (data.success) {
          handleCallStatusChange('connected', remoteUserId.value, isVideoCall.value);
        } else {
          console.error('Erreur de réponse:', data.error);
          handleCallStatusChange('idle', null, false);
        }
      });
  
      socket.value.on('call-ended', (data) => {
        handleCallEnded();
      });

      // Écouter l'invitation d'appel
      socket.value.on('call-invitation', (data) => {
        console.log('Invitation reçue:', data);
        handleCallStatusChange('incoming', data.callerID, true);
      });
  
      // Écouter l'offre d'appel
      socket.value.on('call-offer', (data) => {
        console.log('Offre d\'appel reçue:', data);
        handleCallStatusChange('incoming', data.from, data.callInfo.withVideo);
      });
  
      // Écouter la réponse d'appel
      socket.value.on('call-answer', (data) => {
        console.log('Réponse d\'appel reçue:', data);
        if (data.accepted) {
          handleCallStatusChange('connected', data.from, isVideoCall.value);
        } else {
          handleCallStatusChange('rejected', data.from);
        }
      });

      if (typeof WebRTCService.init !== 'function') {
        console.error('WebRTCService.init is not implemented');
        return;
      }

      WebRTCService.init(
        socket.value,
        currentUserId.value,
        handleRemoteStream,
        handleCallStatusChange
      );
    }
};


/**
 *  déconnecte la socket si elle existe.
 */
onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});

/**
 *  met à jour les variables d'état pour refléter l'appel sortant.
 */
const handleCallInitiation = (targetUserId, withVideo) => {
  // Assigner l'ID de l'utilisateur cible et le type d'appel (vidéo ou audio)
  remoteUserId.value = targetUserId;
  isVideoCall.value = withVideo;

  // Mettre à jour l'état de l'appel : en cours d'appel sortant
  callStatus.value = 'outgoing';
  isInCall.value = true;
  isIncomingCall.value = false;

   // Émettre l'invitation d'appel
   socket.value.emit('invite-to-call', {
    inviteeID: targetUserId,
    callerID: currentUserId.value,
    roomID: Date.now().toString()
  });

  // Émettre l'offre d'appel
  socket.value.emit('call-offer', {
    to: targetUserId,
    from: currentUserId.value,
    withVideo: withVideo
  });
};
/**
 *  fonction  appelée lorsque le flux vidéo à distance est reçu.
 */
const handleRemoteStream = (stream) => {
  console.log('Remote stream received');
};

/**
 *  met à jour l'état local en fonction du nouveau statut.
 */
const handleCallStatusChange = (status, userId, withVideo) => {
  // Mettre à jour le statut de l'appel
  callStatus.value = status;

  // Gérer les différents statuts de l'appel
  if (status === 'incoming') {
    // Si l'appel est entrant, mettre à jour l'ID de l'utilisateur distant et le type d'appel
    remoteUserId.value = userId;
    isVideoCall.value = withVideo;
    isIncomingCall.value = true;
  } else if (status === 'connected') {
    // Si l'appel est connecté, mettre à jour l'état de l'appel
    isInCall.value = true;
  } else if (status === 'idle' || status === 'rejected') {
    // Si l'appel est terminé ou rejeté, réinitialiser les états liés à l'appel
    isInCall.value = false;
    callStatus.value = 'idle';
    remoteUserId.value = '';
    isIncomingCall.value = false;
    isVideoCall.value = false;
  }
};

/**
 *  réinitialise tous les états liés à l'appel.
 */
 const handleCallEnded = () => {
  // Mettre à jour les états 
  isInCall.value = false;
  callStatus.value = 'idle';  // Statut de l'appel 
  remoteUserId.value = '';  //  l'ID de l'utilisateur distant
  currentUserId.value = '';
  isIncomingCall.value = false;  // état de l'appel entrant
  isVideoCall.value = false;  // état de l'appel vidéo
};

/**
 * Elle met à jour l'état de l'appel et récupère le flux média local avant d'accepter l'appel.
 */
const acceptIncomingCall = async () => {
  // Mettre à jour les états pour indiquer que l'appel est  connecté
  isInCall.value = true;
  callStatus.value = 'connected';  

  try {
    //  décider du type d'appel (vidéo ou audio)
    const result = await WebRTCService.getLocalMedia(isVideoCall.value);
    if (!result.success) {
      throw result.error;  // Lancer une erreur si la récupération du média échoue
    }
    localStream.value = result.stream;  // Assigner le flux local reçu
    await WebRTCService.acceptCall();  // Accepter l'appel WebRTC
  } catch (error) {
    console.error('Failed to accept call:', error);  
    // Log de l'erreur
    // En cas d'échec,  terminer l'appel
    handleCallEnded();  
  }
};

/**
 *  met  à jour l'état et rejette l'appel.
 */
const rejectCall = () => {
  WebRTCService.rejectCall();  // Rejeter l'appel via WebRTC
  handleCallEnded();  // Réinitialiser les états 
};

/**
 * désactive l'appel vidéo
 */
const handleVideoDisabled = () => {
  isVideoCall.value = false;  // Désactiver l'appel vidéo
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