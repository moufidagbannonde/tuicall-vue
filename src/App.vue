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
      <h1 class="app-title"> WebRTC Call</h1>
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

// Generate a random user ID
const generateUserId = () => {
  return 'user_' + Math.random().toString(36).substr(2, 9);
};

// State variables
const socket = ref(null);
const userName = ref('');
const currentUserId = ref('');
const remoteUserId = ref('');
const isInCall = ref(false);
const isVideoCall = ref(false);
const callStatus = ref('idle'); // idle, outgoing, incoming, connected
const isIncomingCall = ref(false);
const localStream = ref(null);
const agentId = ref(null);
const clientId = ref(null);
const onlineUsers = ref([]); // Nouvelle variable pour suivre les utilisateurs en ligne

/**
 * Vérifie les paramètres d'URL et initialise la connexion si agentId et clientId sont présents
 */
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  agentId.value = urlParams.get('agentId');
  clientId.value = urlParams.get('clientId');
  const role = urlParams.get('role');
  
  console.log('Paramètres URL détectés:', { agentId: agentId.value, clientId: clientId.value, role });
  
  if (agentId.value && role === "agent") {
    console.log('Mode agent détecté avec ID:', agentId.value);
    // Initialiser la connexion en tant qu'agent
    initializeConnection(agentId.value);
    
    // Si clientId est présent, on va attendre qu'il soit en ligne avant de lancer l'appel
    if (clientId.value) {
      console.log('Client ID détecté:', clientId.value, 'en attente de sa connexion...');
    }
  } else if (clientId.value && role === "client") {
    console.log('Mode client détecté avec ID:', clientId.value);
    // Initialiser la connexion en tant que client
    const clientInit = initializeConnection(clientId.value);
    // si le client est initialisé , lancer l'appel de l'agent vers le client
    
  } else {
    console.log('Mode manuel (sans paramètres URL valides)');
  }
});

/**
 * Initialise la connexion avec l'ID spécifié
 */
const initializeConnection = (userId) => {
  if (!userId) return;
  
  console.log('Initialisation de la connexion pour:', userId);
  currentUserId.value = userId;
  
  // Initialiser la connexion socket
  socket.value = io('http://localhost:8080');
  
  // Écouter les événements de connexion
  // Dans la fonction initializeConnection, après l'émission de register-video-call
  
  socket.value.on('connect', () => {
    console.log('Connecté au serveur socket.io');
    
    // Déterminer le type d'utilisateur
    const role = new URLSearchParams(window.location.search).get('role');
    const userType = role || 'unknown';
    
    // Émettre un événement pour enregistrer l'utilisateur
    socket.value.emit('register', { 
      userId: currentUserId.value,
      userType: userType
    });
    
    // Si c'est un client, émettre qu'il est prêt pour un appel
    if (userType === 'client') {
      console.log('Client prêt pour un appel, notification au serveur');
      socket.value.emit('client-ready-for-call', {
        clientId: currentUserId.value,
        userType: userType
      });
    }
  });
  
  // Ajouter un écouteur pour l'événement client-ready
  socket.value.on('client-ready', (data) => {
    console.log('ÉVÉNEMENT REÇU: Un client est prêt pour un appel:', data);
    
    // Si nous sommes l'agent et que c'est notre client qui est prêt
    const role = new URLSearchParams(window.location.search).get('role');
    if (role === 'agent' && clientId.value === data.clientId) {
      console.log('Notre client est prêt pour un appel, préparation pour lancer l\'appel automatiquement');
      
      // Attendre un peu avant de lancer l'appel pour s'assurer que tout est initialisé
      setTimeout(async () => {
        try {
          // Obtenir d'abord les permissions média
          const mediaResult = await WebRTCService.getLocalMedia(true);
          if (!mediaResult.success) {
            throw mediaResult.error;
          }
          
          // Stocker le flux local
          localStream.value = mediaResult.stream;
          
          // S'assurer que les états sont correctement définis avant de lancer l'appel
          remoteUserId.value = data.clientId;
          isVideoCall.value = true;
          callStatus.value = 'outgoing';
          isInCall.value = true;
          isIncomingCall.value = false;
          
          // Vérifier que les états sont bien définis
          console.log('États avant appel:', {
            remoteUserId: remoteUserId.value,
            isVideoCall: isVideoCall.value,
            callStatus: callStatus.value,
            isInCall: isInCall.value,
            isIncomingCall: isIncomingCall.value
          });
          
          // Puis lancer l'appel
          console.log('Permissions média obtenues, lancement automatique de l\'appel vers:', data.clientId);
          handleCallInitiation(data.clientId, true);
          WebRTCService.makeCall(data.clientId, true);
        } catch (error) {
          console.error('Erreur lors de la préparation de l\'appel automatique:', error);
          alert('Impossible d\'accéder à la caméra ou au microphone. Veuillez vérifier vos permissions.');
        }
      }, 2000);
    }
  });
  
  // Écouter les mises à jour des utilisateurs en ligne
  socket.value.on('online_users', (users) => {
    console.log('Utilisateurs en ligne:', users);
    onlineUsers.value = users;
  });
  
  // Initialiser le service WebRTC avec la socket et le userId
  WebRTCService.init(
    socket.value,
    currentUserId.value,
    handleRemoteStream,
    handleCallStatusChange
  );
};

/**
 * soumet le nom d'utilisateur, initialise la connexion socket et démarre le service WebRTC.
 */
const submitUserName = () => {
  // Vérifier que le nom d'utilisateur n'est pas vide
  if (userName.value.trim()) {
    // Initialiser la connexion avec le nom d'utilisateur saisi
    initializeConnection(userName.value.trim());
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
  
  // Ne pas réinitialiser currentUserId pour permettre de passer d'autres appels
  // currentUserId.value = '';
  
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