<template>
  <div class="app-container">
    <!-- Modal de saisie du nom -->
    <div
      v-if="!currentUserId"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
        <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Entrez votre nom
        </h2>
        <input
          type="text"
          v-model="userName"
          @keyup.enter="submitUserName"
          placeholder="Votre nom"
          class="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:text-white"
        />
        <button
          @click="submitUserName"
          :disabled="!userName.trim()"
          class="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          Commencer
        </button>
      </div>
    </div>

    <!-- Call Controls (quand l'appel n'est pas encore lancé) -->

    <div v-if="!isInCall && currentUserId" class="controls-container">
      <!-- <h1 class="app-title">WebRTC Call</h1> -->
      <!-- <CallControls @call-initiated="handleCallInitiation" /> -->
      <div class="user-id-display">
        <p>
          Votre ID: <span class="user-id">{{ currentUserId }}</span>
        </p>
        <p class="help-text">
          Partagez cet ID avec vos contacts pour qu'ils puissent vous appeler
        </p>
      </div>
    </div>
    <!-- Call View (quand l'appel) -->
    <CallView
      v-if="isInCall"
      :socket="socket"
      :current-user-id="currentUserId"
      :remote-user-id="remoteUserId"
      :is-video-call="isVideoCall"
      :call-status="callStatus"
      :is-incoming="isIncomingCall"
      @call-ended="handleCallEnded"
      :initial-local-stream="localStream"
      @call-status-change="handleCallStatusChange"
      @video-disabled="handleVideoDisabled"
      :user-role="userRole"
    />
    <!-- Incoming Call Modal -->
    <div
      v-if="callStatus === 'incoming'"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all"
      >
        <div class="flex flex-col items-center">
          <!-- Avatar de l'appelant -->
          <div
            class="w-20 h-20 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4"
          >
            <span class="text-2xl font-bold text-indigo-600 dark:text-indigo-300">
              {{ remoteUserId.charAt(0).toUpperCase() }}
            </span>
          </div>
          <!-- Informations de l'appel -->
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Appel entrant
          </h2>
          <p class="text-gray-600 dark:text-gray-300 mb-2">{{ remoteUserId }}</p>
          <p class="text-sm text-indigo-600 dark:text-indigo-400 mb-6">
            {{ isVideoCall ? "Appel vidéo" : "Appel audio" }}
          </p>
          <!-- Animation d'appel -->
          <div class="flex gap-1 mb-6">
            <span
              class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"
            ></span>
            <span
              class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"
            ></span>
            <span class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></span>
          </div>
          <!-- Boutons d'action -->
          <div class="flex gap-4">
            <button
              @click="acceptIncomingCall"
              class="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="w-5 h-5"
              >
                <path
                  fill-rule="evenodd"
                  d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                  clip-rule="evenodd"
                />
              </svg>
              Accepter
            </button>
            <button
              @click="rejectCall"
              class="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
              <path fill="currentColor" d="m3.68 16.07l3.92-3.11V9.59c2.85-.93 5.94-.93 8.8 0v3.38l3.91 3.1L24 12.39c-6.41-7.19-17.59-7.19-24 0z"/>
            </svg>
              Rejeter
            </button>
          </div>
        </div>
      </div>
    </div>

       <!-- Modal de Permission d'Enregistrement (pour le client) -->
    <div
      v-if="showRecordPermissionModal && userRole === 'client'"
      class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
        <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Autorisation d'enregistrement
        </h2>
        <p class="mb-6 text-gray-700 dark:text-gray-300">
          L'agent ({{ recordRequesterId }}) souhaite enregistrer cet appel.
          Acceptez-vous de poursuivre ?
        </p>
        <div class="flex justify-end gap-4">
          <button
            @click="handleRecordPermissionResponse(false)"
            class="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Refuser
          </button>
          <button
            @click="handleRecordPermissionResponse(true)"
            class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Autoriser
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { io } from "socket.io-client";
import CallControls from "./components/CallControls.vue";
import CallView from "./components/CallView.vue";
import WebRTCService from "./services/WebRTCService";
import CryptoJS from "crypto-js";

// Generate a random user ID
const generateUserId = () => {
  return "user_" + Math.random().toString(36).substr(2, 9);
};

// State variables
const userRole = ref(null);
const socket = ref(null);
const userName = ref("");
const currentUserId = ref("");
const remoteUserId = ref("");
const isInCall = ref(false);
const isVideoCall = ref(false);
const callStatus = ref("idle"); // idle, outgoing, incoming, connected
const isIncomingCall = ref(false);
const localStream = ref(null);
const agentId = ref(null);
const clientId = ref(null);
const onlineUsers = ref([]); // Nouvelle variable pour suivre les utilisateurs en ligne
const showRecordPermissionModal = ref(false);
const recordRequesterId = ref(null); // ID de l'agent demandant l'enregistrement

/**
 * Decrypts encrypted data
 * @param {string} encryptedData - The encrypted data in format "iv:encryptedText"
 * @returns {string} - The decrypted text
 */
 function decryptData(encryptedData) {
  try {
    // Check if encryptedData is null or undefined
    if (!encryptedData) {
      console.warn('No encrypted data provided for decryption');
      return null;
    }
    
    const secretKey = 'catarina-secure-key-2025';
    // Use the same fixed salt as on the server
    const fixedSalt = 'catarina2025salt';
    
    // Create the same IV using MD5
    const iv = CryptoJS.MD5(fixedSalt).toString();
    const ivWordArray = CryptoJS.enc.Hex.parse(iv.substring(0, 32));
    
    // Create the same key using SHA-256
    const keyWordArray = CryptoJS.SHA256(secretKey);
    
    // Decrypt the data
    const ciphertext = CryptoJS.enc.Hex.parse(encryptedData);
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      keyWordArray,
      { 
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

/**
 * Vérifie les paramètres d'URL et initialise la connexion si agentId et clientId sont présents
 */
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  for (const [key, value] of urlParams.entries()) {
  }
  
  agentId.value = decryptData(urlParams.get("agentId"));
  clientId.value = decryptData(urlParams.get("clientId"));
  const role = urlParams.get("role");
  userRole.value = role;

  if (agentId.value && role === "agent") {
    // Initialiser la connexion en tant qu'agent
    initializeConnection(agentId.value);

    // Si clientId est présent, on va attendre qu'il soit en ligne avant de lancer l'appel
    if (clientId.value) {
    }
  } else if (clientId.value && role === "client") {
    // Initialiser la connexion en tant que client
    initializeConnection(clientId.value);
    // si le client est initialisé , lancer l'appel de l'agent vers le client
  } else {
  }
});

  // Écouteur pour la demande de permission d'enregistrement (côté Client)
  if (userRole.value === 'client') {
    socket.value.on('request-record-permission', ({ from }) => { // `from` est l'ID de l'agent
      if (isInCall.value && remoteUserId.value === from) { // Vérifier si la demande vient de l'interlocuteur actuel
        recordRequesterId.value = from;
        showRecordPermissionModal.value = true;
      }
    });
  }

/**
 * Initialise la connexion avec l'ID spécifié
 */
const initializeConnection = (userId) => {
  if (!userId) return;

  currentUserId.value = userId;

  // Initialiser la connexion socket
  socket.value = io("http://localhost:8080");

  socket.value.on("connect", () => {
    // Déterminer le type d'utilisateur
    const role = new URLSearchParams(window.location.search).get("role");
    const userType = role || "unknown";

    // Émettre un événement pour enregistrer l'utilisateur
    socket.value.emit("register", {
      userId: currentUserId.value,
      userType: userType,
    });

    // Si c'est un client, émettre qu'il est prêt pour un appel
    if (userType === "client") {
      socket.value.emit("client-ready-for-call", {
        clientId: currentUserId.value,
        userType: userType,
      });
    }
  });

  // Ajouter un écouteur pour l'événement client-ready
  socket.value.on("client-ready", (data) => {

    // Si nous sommes l'agent et que c'est notre client qui est prêt
    const role = new URLSearchParams(window.location.search).get("role");
    if (role === "agent" && clientId.value === data.clientId) {

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
          callStatus.value = "outgoing";
          isInCall.value = true;
          isIncomingCall.value = false;

          // Puis lancer l'appel
          handleCallInitiation(data.clientId, true);
          WebRTCService.makeCall(data.clientId, true);
        } catch (error) {
          console.error("Erreur lors de la préparation de l'appel automatique:", error);
          alert(
            "Impossible d'accéder à la caméra ou au microphone. Veuillez vérifier vos permissions."
          );
        }
      }, 2000);
    }
  });

  // Écouter les mises à jour des utilisateurs en ligne
  socket.value.on("online_users", (users) => {
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
  callStatus.value = "outgoing";
  isInCall.value = true;
  isIncomingCall.value = false;
};
/**
 *  fonction  appelée lorsque le flux vidéo à distance est reçu.
 */
const handleRemoteStream = (stream) => {
};

/**
 *  met à jour l'état local en fonction du nouveau statut.
 */
const handleCallStatusChange = (status, userId, withVideo) => {
  // Mettre à jour le statut de l'appel
  callStatus.value = status;

  // Gérer les différents statuts de l'appel
  if (status === "incoming") {
    // Si l'appel est entrant, mettre à jour l'ID de l'utilisateur distant et le type d'appel
    remoteUserId.value = userId;
    isVideoCall.value = withVideo;
    isIncomingCall.value = true;
  } else if (status === "connected") {
    // Si l'appel est connecté, mettre à jour l'état de l'appel
    isInCall.value = true;
  } else if (status === "idle" || status === "rejected") {
    // Si l'appel est terminé ou rejeté, réinitialiser les états liés à l'appel
    isInCall.value = false;
    callStatus.value = "idle";
    remoteUserId.value = "";
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
  callStatus.value = "idle"; // Statut de l'appel
  remoteUserId.value = ""; //  l'ID de l'utilisateur distant

  // Ne pas réinitialiser currentUserId pour permettre de passer d'autres appels
  // currentUserId.value = '';

  isIncomingCall.value = false; // état de l'appel entrant
  isVideoCall.value = false; // état de l'appel vidéo
};

/**
 * Elle met à jour l'état de l'appel et récupère le flux média local avant d'accepter l'appel.
 */
const acceptIncomingCall = async () => {
  // Mettre à jour les états pour indiquer que l'appel est  connecté
  isInCall.value = true;
  callStatus.value = "connected";

  try {
    //  décider du type d'appel (vidéo ou audio)
    const result = await WebRTCService.getLocalMedia(isVideoCall.value);
    if (!result.success) {
      throw result.error; // Lancer une erreur si la récupération du média échoue
    }
    localStream.value = result.stream; // Assigner le flux local reçu
    await WebRTCService.acceptCall(); // Accepter l'appel WebRTC
  } catch (error) {
    console.error("Failed to accept call:", error);
    handleCallEnded();
  }
};

/**
 *  met  à jour l'état et rejette l'appel.
 */
const rejectCall = () => {
  WebRTCService.rejectCall(); // Rejeter l'appel via WebRTC
  handleCallEnded(); // Réinitialiser les états
};

/**
 * désactive l'appel vidéo
 */
const handleVideoDisabled = () => {
  isVideoCall.value = false; // Désactiver l'appel vidéo
};

/**
 * Gère la réponse du client à la demande d'enregistrement.
 */
 const handleRecordPermissionResponse = (granted) => {
  if (socket.value && recordRequesterId.value && userRole.value === 'client') {
    socket.value.emit('record-permission-response', {
      from: currentUserId.value,    // ID du client
      to: recordRequesterId.value,  // ID de l'agent
      granted: granted
    });
  }
  showRecordPermissionModal.value = false;
  recordRequesterId.value = null;
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
  font-family: "Inter", sans-serif;
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
  right: 0;
}
</style>
