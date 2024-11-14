<template>
  <div class="container mx-auto p-8 bg-gray-50 min-h-screen flex flex-col items-center">
    <h1 class="text-4xl font-extrabold text-center mb-8 text-gray-800 tracking-wide">Call Application</h1>

    <!-- Composants d'initialisation et de contrôle d'appel -->
    <div class="w-full max-w-lg bg-white p-6 rounded-lg shadow-lg mb-8">
      <CallInit :onInit="init" />
      <CallControls :onCall="call" />

      <div
        class="group-call-container mt-8 w-full max-w-lg p-6 rounded-lg flex flex-col items-center transition-all duration-500 ease-in-out transform">
        <button v-if="!showGroupCallForm" @click="showGroupCallForm = true"
          class="mt-4 w-full bg-blue-600 text-white font-semibold rounded-lg py-3 hover:bg-blue-700 shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1">
          Start Group Call
        </button>
      </div>

      <!-- Champs pour entrer les utilisateurs pour un appel en groupe -->
      <div v-if="showGroupCallForm"
        class="group-call-container mt-8 w-full max-w-lg bg-white p-6 rounded-lg shadow-lg flex flex-col items-center transition-all duration-500 ease-in-out transform">
        <input v-model="calleeUserIDs" type="text" placeholder="Enter comma-separated User IDs for group call"
          class="border border-gray-300 rounded-lg p-3 w-full focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-200" />

        <button @click="handleStartGroupCall"
          class="mt-4 w-full bg-blue-600 text-white font-semibold rounded-lg py-3 hover:bg-blue-700 shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1">
          Start Group Call
        </button>

        <button @click="cancelGroupCall"
          class="mt-4 w-full bg-gray-600 text-white font-semibold rounded-lg py-3 hover:bg-gray-700 shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1">
          Cancel
        </button>
      </div>
    </div>

    <div class="TUICallKit w-full flex justify-center items-center mt-8" v-if="isCalleeInitialized">
      <TUICallKit
        class="w-full bg-white bg-opacity-80 rounded-xl shadow-xl transition-all duration-500 ease-in-out transform hover:scale-105 h-80 md:h-[28rem] lg:h-[35rem] xl:h-[48rem] max-w-sm md:max-w-4xl lg:max-w-5xl xl:max-w-6xl"
        id="screen-share" />
      <!--  div pour les contrôles de partage d'écran -->
      <div class="screen-share-controls mt-4">
        <button @click="startScreenShare"
          class="bg-blue-600 text-white font-semibold rounded-lg py-3 px-6 hover:bg-blue-700 shadow-md transition duration-200 mx-2">
          Partager l'écran
        </button>
        <button @click="stopScreenCapture"
          class="bg-red-600 text-white font-semibold rounded-lg py-3 px-6 hover:bg-red-700 shadow-md transition duration-200 mx-2">
          Arrêter le partage d'écran
        </button>
      </div>
    </div>


    <div ref="remoteContainer" id="remoteContainer" class="w-full max-w-4xl mt-8"></div>





  </div>
</template>

<style scoped>
.container {
  text-align: center;
}

.TUICallKit {
  margin-top: 20px;
  height: 500px;
  display: flex;
  justify-content: center;
}

.group-call-container {
  transition: transform 0.5s ease-in-out;
  margin-top: 20px;
}

.group-call-container.v-enter-active,
.group-call-container.v-leave-active {
  transition: transform 0.5s ease-in-out;
}

.group-call-container.v-enter,
.group-call-container.v-leave-to {
  transform: translateY(50px);
}

#screen-share {
  width: 100%;
  height: 400px;
  background-color: black;
}

button {
  padding: 10px 20px;
  margin: 5px;
  cursor: pointer;
}
</style>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { TUICallKit, TUICallKitServer, TUICallType } from '@tencentcloud/call-uikit-vue';
import CallInit from './components/CallInit.vue';
import CallControls from './components/CallControls.vue';
import * as GenerateTestUserSig from './debug/GenerateTestUserSig-es';
import Chat from "@tencentcloud/chat";
import { useToast } from 'vue-toastification';
import TRTC from 'trtc-js-sdk';

const isCallActive = ref(false);
const localStream = ref(null);
const SDKAppID = 20013712;
const SDKSecretKey = "459dcede1cc23bdcb8b3dcf4e61dfd054794411eb7cb5c5827b85f73d98821bd";
const isCalleeInitialized = ref(false);
const isCallStarted = ref(false);
const calleeUserIDs = ref('');
const groupID = ref('');
const selectedCallType = ref(TUICallType.VIDEO_CALL);
const showGroupCallForm = ref(false);
const toast = useToast();
const roomID = ref(1);

// variables partage écran
const isTRTCInitialized = ref(false);
const screenStream = ref(null);
let client = null;

onMounted(() => {
  initTRTC();
});

onUnmounted(() => {
  cleanup();
  leaveRoom();
})

// initialisation TRTC
async function initTRTC(callerUserID) {
  const userID = String(callerUserID);


  // Générer le userSig et extraire la chaîne
  const { userSig } = GenerateTestUserSig.genTestUserSig({
    userID: userID,
    SDKAppID,
    SecretKey: SDKSecretKey
  });

  client = TRTC.createClient({
    mode: 'rtc',
    sdkAppId: SDKAppID,
    userId: userID,
    userSig: userSig
  });

  // Configuration des événements
  client.on('stream-added', async (event) => {
    const remoteStream = event.stream;
    console.log('Nouveau flux distant détecté:', remoteStream.getId());
    await client.subscribe(remoteStream);
  });

  // Déplacer le gestionnaire stream-subscribed ici
  client.on('stream-subscribed', (event) => {
    const remoteStream = event.stream;
    const streamId = remoteStream.getId();
    const userId = remoteStream.getUserId();
    const streamType = remoteStream.getType();

    console.log('Stream souscrit:', {
      streamId,
      userId,
      streamType,
      clientId: client.userId
    });

    // Ne pas afficher le flux si c'est notre propre partage d'écran
    if (userId === client.userId && streamType === 'screen') {
      console.log('Ignorer l\'affichage du flux de partage d\'écran local');
      return;
    }

    // Vérifier si le div existe déjà
    let remoteDiv = document.getElementById(`remote-${streamId}`);
    if (!remoteDiv) {
      remoteDiv = document.createElement('div');
      remoteDiv.id = `remote-${streamId}`;
      remoteDiv.style.width = '320px';
      remoteDiv.style.height = '240px';
      document.querySelector('#remoteContainer').appendChild(remoteDiv);
      remoteStream.play(remoteDiv.id);
    }
  });

  client.on('stream-removed', (event) => {
    const remoteStream = event.stream;
    const streamId = remoteStream.getId();
    console.log('Stream supprimé:', streamId);
    cleanupRemoteStream(streamId);
  });

  try {
    await client.join({ roomId: roomID.value });
    isTRTCInitialized.value = true;
    toast.success("Connecté à la salle avec succès !");
  } catch (error) {
    console.error("Erreur lors de la connexion à la salle : ", error);
    toast.error("Erreur lors de la connexion à la salle");
  }
}
// démarrer le partage d'écran
async function startScreenShare() {
  try {
    if (screenStream.value) {
      toast.warning("Un partage d'écran est déjà en cours");
      return;
    }

    // Utiliser createStream avec les options de partage d'écran
    screenStream.value = await TRTC.createStream({
      screen: true,
      screenAudio: true,
    });

    // Initialiser le flux de partage d'écran
    await screenStream.value.initialize();

    // Gérer l'arrêt du partage d'écran par l'utilisateur
    screenStream.value.on('screen-sharing-stopped', () => {
      stopScreenCapture();
    });

    // Publier le flux
    await client.publish(screenStream.value);
    toast.success("Partage d'écran démarré avec succès!");
  } catch (error) {
    console.error("Erreur lors du partage d'écran : ", error);
    toast.error(`Erreur lors du partage d'écran : ${error.message}`);
    screenStream.value = null;
  }
}

function cleanupRemoteStream(streamId) {
  const remoteDiv = document.getElementById(`remote-${streamId}`);
  if (remoteDiv) {
    remoteDiv.remove();
  }
}

async function leaveRoom() {
  if (client) {
    if (screenStream.value) {
      await stopScreenCapture();
    }
    await client.leave();
    client = null;
    isTRTCInitialized.value = false;
  }
}

// arrêter le partage d'écran
async function stopScreenCapture() {
  try {
    if (screenStream.value) {
      // Arrêter la publication du flux
      await client.unpublish(screenStream.value);

      // Nettoyer les divs des flux distants
      const streamId = screenStream.value.getId();
      cleanupRemoteStream(streamId);

      // Arrêter et fermer le flux
      screenStream.value.stop();
      screenStream.value.close();
      screenStream.value = null;

      toast.info("Partage d'écran arrêté !");
    }
  } catch (error) {
    console.error("Erreur lors de l'arrêt du partage d'écran : ", error);
    toast.error(`Erreur lors de l'arrêt du partage d'écran : ${error.message}`);
  }
}

// Fonction d'Initialisation
const init = async (callerUserID) => {
  if (!callerUserID) {
    toast.error("Veuillez entrer un utilisateur ID valide!");
    return;
  }

  const { userSig } = GenerateTestUserSig.genTestUserSig({
    userID: callerUserID,
    SDKAppID,
    SecretKey: SDKSecretKey
  });

  try {
    await TUICallKitServer.init({
      userID: callerUserID,
      userSig,
      SDKAppID,
      // Ajout des gestionnaires d'événements
      events: {
        onInvited: handleIncomingCall,
        onUserEnter: handleUserEnter,
        onUserLeave: handleUserLeave,
        onCallEnd: handleCallEnd,
        onError: handleError
      }
    });

    // Initialiser TRTC après TUICallKit
    await initTRTC(callerUserID);

    isCalleeInitialized.value = true;
    toast.success("TUICallKit initialisé avec succès !");
  } catch (error) {
    console.error("Erreur d'initialisation:", error);
    toast.error("Erreur lors de l'initialisation");
  }
};

// Fonction d'appel 
const call = async (calleeUserID, callType) => {
  if (!calleeUserID) {
    toast.error("Veuillez entrer l'identifiant de l'appelé");
    return;
  }

  if (!isCalleeInitialized.value) {
    toast.error("L'utilisateur appelé n'a pas encore initialisé TUICallKit.");
    return;
  }

  try {
    // Vérifier si la caméra est disponible pour les appels vidéo
    if (callType === TUICallType.VIDEO_CALL) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');

      if (!hasCamera) {
        toast.warning("Aucune caméra détectée. Basculement en appel audio.");
        callType = TUICallType.AUDIO_CALL;
      }
    }

    await TUICallKitServer.call({
      userID: calleeUserID,
      type: callType,
      timeout: 30,
      offlinePushInfo: {
        title: 'Appel entrant',
        description: callType === TUICallType.VIDEO_CALL ? 'Appel vidéo' : 'Appel audio'
      }
    });

    isCallStarted.value = true; // Mettez à jour ici
    toast.info("Appel en cours...");
  } catch (error) {
    console.error("Erreur lors de l'appel:", error);
    toast.error(`Erreur: ${error.message}`);
  }
};

// Gestionnaires d'événements
const handleIncomingCall = (event) => {
  const { inviter, type } = event;
  console.log('Appel entrant de:', inviter, 'type:', type);
  toast.info(`Appel entrant de ${inviter}`);
};

const handleUserEnter = (userID) => {
  console.log('Utilisateur entré:', userID);
  isCallActive.value = true; // Activer les contrôles de partage d'écran
  toast.success(`${userID} a rejoint l'appel`);
};

const handleUserLeave = (userID) => {
  console.log('Utilisateur parti:', userID);
  toast.info(`${userID} a quitté l'appel`);
};

const handleCallEnd = () => {
  console.log('Appel terminé');
  isCallStarted.value = false;
  isCallActive.value = false; // Désactiver les contrôles de partage d'écran
  toast.info("Appel terminé");
};
// Ajouter une fonction pour nettoyer l'état lors de la déconnexion
const cleanup = () => {
  isCallActive.value = false;
  isCallStarted.value = false;
  if (screenStream.value) {
    stopScreenCapture();
  }
};
const handleError = (error) => {
  console.error('Erreur durant l\'appel:', error);
  toast.error(`Erreur: ${error.message}`);
};




// Créer un groupe d'utilisateurs
const createGroupID = async () => {
  const chat = Chat.create({ SDKAppID });
  const userIDList = calleeUserIDs.value.split(',').map(id => id.trim()).filter(id => id);
  const memberList = userIDList.map(userID => ({ userID }));
  const res = await chat.createGroup({ type: Chat.TYPES.GRP_PUBLIC, name: "WebSDK", memberList });
  groupID.value = res.data.group.groupID;
};

// Démarrer un appel en groupe
const startGroupCall = async (callType) => {
  if (!groupID.value) {
    toast.error("Erreur : Aucun groupID trouvé.");
    return;
  }
  try {
    const userIDList = calleeUserIDs.value.split(',').map(id => id.trim()).filter(id => id);
    if (!userIDList.length) {
      toast.error("Veuillez entrer au moins un utilisateur ID.");
      return;
    }
    await TUICallKitServer.groupCall({ userIDList, groupID: groupID.value, type: callType });
    toast.info("Appel de groupe en cours...");
  } catch (error) {
    console.error(`Échec de l'appel de groupe: ${error}`);
  }
};

// Démarrer un appel en groupe en créant un groupID
const handleStartGroupCall = async () => {
  await createGroupID();
  await startGroupCall(selectedCallType.value);
};

// Annuler l'appel de groupe et réinitialiser les données
const cancelGroupCall = () => {
  showGroupCallForm.value = false;
  calleeUserIDs.value = '';
};



</script>