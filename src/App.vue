<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-8">
    <div class="container mx-auto flex flex-col items-center">
      <!-- En-tête de page -->
      <h1
        class="text-5xl font-black text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 animate-fade-in">
        Call Application
      </h1>

      <!-- Formulaire d'initialisation de l'appel -->
      <div class="w-full max-w-lg transform transition-all duration-500 ease-out">
        <div
          class="bg-white backdrop-blur-lg bg-opacity-90 p-8 rounded-2xl shadow-2xl hover:shadow-3xl transition-shadow duration-300">
          <CallInit :onInit="handleInit" />
          <CallControls :onCall="call" v-if="!showGroupCallForm"></CallControls>

          <!-- Conteneur d'appel de groupe -->
          <div class="mt-10 space-y-4">
            <button v-if="!showGroupCallForm" @click="showGroupCallForm = true" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-6 rounded-xl
                hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-1 
                transition-all duration-300 shadow-lg hover:shadow-xl
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
              Start Group Call
            </button>
          </div>

          <!-- Formulaire d'appel de groupe -->
          <div v-if="showGroupCallForm" class="mt-8 animate-fade-in-up">
            <input v-model="calleeUserIDs" type="text"
              placeholder="Entrer les autres identifiants séparés par des virgules" class="w-full px-5 py-4 rounded-xl border-2 border-gray-200 
                focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
                transition-all duration-300 text-gray-700 placeholder-gray-400
                bg-white bg-opacity-90 backdrop-blur-sm" />

            <div class="flex flex-col space-y-3 mt-6">
              <!-- bouton de démarrage de l'appel de groupe -->
              <button  @click="handleStartGroupCall" class="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl
                  hover:from-green-600 hover:to-emerald-700 transform hover:-translate-y-1 
                  transition-all duration-300 shadow-lg hover:shadow-xl">
                Start Group Call
              </button>

              <!--bouton d'annulation de l'appel de groupe-->
              <button @click="cancelGroupCall" class="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold py-4 rounded-xl
                  hover:from-gray-600 hover:to-gray-700 transform hover:-translate-y-1 
                  transition-all duration-300 shadow-lg hover:shadow-xl">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!--  modal de confirmation d'appel audio  -->
      <ConfirmModal :is-open="showNoCameraModal" title="Caméra non détectée"
        message="Aucune caméra n'a été détectée. Voulez-vous passer en appel audio ?" confirm-text="Passer en audio"
        cancel-text="Annuler" @confirm="handleNoCameraConfirm" @cancel="handleNoCameraCancel" />

      <!-- Interface d'appel et chat -->
      <div class="w-full flex flex-col lg:flex-row gap-8 mt-8 relative" v-if="isCalleeInitialized">
        <!-- Interface d'appel -->
        <div class="flex-1">
          <TUICallKit class="w-full bg-white bg-opacity-95 rounded-2xl shadow-2xl 
              transition-all duration-500 ease-in-out transform hover:scale-[1.02]
              h-80 md:h-[28rem] lg:h-[35rem] xl:h-[48rem] 
              backdrop-blur-lg border border-white border-opacity-20" id="screen-share" />

          <!-- Contrôles des boutons de partage d'écran -->
          <div class="screen-share-controls flex space-x-4 mt-4">
            <!-- Bouton de partage d'écran -->
            <button @click="startScreenShare" class="px-8 py-4 rounded-xl font-bold text-white
                    bg-gradient-to-r from-blue-500 to-indigo-600
                    hover:from-blue-600 hover:to-indigo-700
                    transform hover:-translate-y-1 transition-all duration-300
                    shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              :disabled="isScreenSharing || currentScreenSharer !== null">
              Partager l'écran
            </button>
            <!-- bouton d'arrêt de partage d'écran -->
            <button @click="stopScreenCapture" :disabled="!isScreenSharing || currentScreenSharer !== currentUserID"
              class="px-8 py-4 rounded-xl font-bold text-white
                bg-gradient-to-r from-red-500 to-red-600
                hover:from-red-600 hover:to-red-700
                transform hover:-translate-y-1 transition-all duration-300
                shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">
              Arrêter le partage
            </button>
            <!-- Bouton Chat -->
            <button  @click="toggleChat" class="fixed right-0 top-1/2 transform -translate-y-1/2 z-50
                 bg-gradient-to-r from-blue-600 to-indigo-600 
                 text-white p-3 rounded-l-lg shadow-lg
                 hover:from-blue-700 hover:to-indigo-700
                 transition-all duration-300" :class="{ 'right-96': isChatOpen }">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"
                v-if="!isChatOpen">
                <path
                  d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z" />
              </svg>
              <span v-else class="flex items-center">
                ❌
              </span>
            </button>
          </div>
        </div>



        <!-- interface de chat -->
        <div v-if="isCalleeInitialized"
          class="fixed right-0 top-0 h-full w-[400px] transition-transform duration-300 ease-in-out transform z-40"
          :class="isChatOpen ? 'translate-x-0' : 'translate-x-full'">
          <ChatComponent ref="chatComponentRef" :callActive="isCalleeInitialized" @message-sent="handleChatMessage(socket)"
              />
        </div>
      </div>

      <!-- conteneur affichant les flux distants -->
      <div class="flex justify-center w-full">
        <div ref="remoteContainer" id="remoteContainer" class="w-full max-w-4xl mt-8 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 
        bg-opacity-90 backdrop-blur-lg  shadow-2xl 
         border-gray-100 transition-all duration-300
        hover:shadow-3xl transform hover:scale-[1.01]">
        </div>
      </div>
    </div>
  </div>
</template>



<script setup>
// fonctionnalités de vue
import { onMounted, onUnmounted, ref, watch } from 'vue';
// générateur de clés
import * as GenerateTestUserSig from './debug/GenerateTestUserSig-es';
// notification(s)
import { useToast } from 'vue-toastification';
// TUI
import { TUICallKit, TUICallKitServer, TUICallType } from '@tencentcloud/call-uikit-vue';
import Chat from "@tencentcloud/chat";
import TRTC from 'trtc-js-sdk';
// composants
import CallInit from './components/CallInit.vue';
import CallControls from './components/CallControls.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import ChatComponent from './components/ChatComponent.vue';
// socket
import { io } from 'socket.io-client';


// variables d'accès à l'API Tencent Cloud
const SDKAppID = 20014772;
const SDKSecretKey = "c1c2a4c234a8ec619d9d64d49f629f9ac900415dd69aeb21312a146e4f474790";
// const SDKAppID = 0;
// const SDKSecretKey = "";

// variables globales
const isCallActive = ref(false);
const isCalleeInitialized = ref(false);
const isCallStarted = ref(false);
const calleeUserIDs = ref('');
const groupID = ref('');
const selectedCallType = ref(TUICallType.VIDEO_CALL);
const showGroupCallForm = ref(false);
const toast = useToast();
const roomID = ref(1);
const currentScreenSharer = ref(null);
const isScreenSharing = ref(false);
const currentUserID = ref(null);
const showNoCameraModal = ref(false);
let pendingCalleeUserID = ref(null);
let pendingCallType = ref(null);


// variables partage écran
const isTRTCInitialized = ref(false);
const screenStream = ref(null);
let client = ref(null);

// Ajouter les références pour le chat
const chatComponentRef = ref(null);
const chatMessages = ref([]);

// Ajoutez dans les refs
const isChatOpen = ref(false);

/**
 *  cycles de vie
 */
// chargement du composant
onMounted(() => {
  initTRTC(); // initialisation de TRTC
});
onMounted(() => {
  console.log("window's history", window.History)
})


// démontage du composant
onUnmounted(() => {
  cleanup(); // nettoyage des états
  leaveRoom(); // déconnexion de la salle
})

// initialisation TRTC
async function initTRTC(callerUserID) {
  try {
    const userID = String(callerUserID);
    const { userSig } = GenerateTestUserSig.genTestUserSig({
      userID: userID,
      SDKAppID,
      SecretKey: SDKSecretKey
    });

    client.value = TRTC.createClient({
      mode: 'rtc',
      sdkAppId: SDKAppID,
      userId: userID,
      userSig: userSig
    });

    // Configuration des événements
    client.value.on('stream-added', async (event) => {
      const remoteStream = event.stream;
      console.log('Nouveau flux distant détecté:', remoteStream.getId());
      await client.value.subscribe(remoteStream);
    });

    // événement pour la gestion correcte de l'affichage
    client.value.on('stream-subscribed', (event) => {
      const remoteStream = event.stream;
      const streamId = remoteStream.getId();
      const userId = remoteStream.getUserId();
      const streamType = remoteStream.getType();

      console.log('Stream souscrit:', {
        streamId,
        userId,
        streamType,
        clientId: client.value.userId
      });

      // Non affichage du propre flux de partage d'écran (flux local)
      if (userId === client.value.userId) {
        console.log('Ignorer l\'affichage du flux local');
        return;
      }

      // Création  de la div pour le flux distant
      let remoteDiv = document.getElementById(`remote-${streamId}`);
      if (!remoteDiv) {
        remoteDiv = document.createElement('div');
        remoteDiv.id = `remote-${streamId}`;
        remoteDiv.className = 'w-full h-full rounded-lg overflow-hidden';
        document.querySelector('#remoteContainer').appendChild(remoteDiv);
      }

      // Jouer le flux distant
      remoteStream.play(remoteDiv.id);
    });
    client.value.on('stream-removed', (event) => {
      const remoteStream = event.stream;
      const streamId = remoteStream.getId();
      console.log('Stream supprimé:', streamId);
      cleanupRemoteStream(streamId);
    });

    await client.value.join({ roomId: roomID.value });
    isTRTCInitialized.value = true;
    toast.success("Connecté à la salle avec succès !");
  } catch (error) {
    console.error("Erreur lors de la connexion à la salle : ", error);
    
    // Gestion spécifique des erreurs TRTC
    if (error.code === -100013) {
      toast.error("Le service TRTC est suspendu. Veuillez vérifier votre solde Tencent Cloud.");
    } else {
      toast.error(`Erreur de connexion : ${error.message}`);
    }
    
    // Réinitialisation des états en cas d'erreur
    client.value = null;
    isTRTCInitialized.value = false;
    throw error; // Propager l'erreur pour la gestion en amont
  }
}

/**
 * permet le démarrage du partage d'écran
 */
async function startScreenShare() {
  try {
    // vérification si un partage d'écran est déjà en cours
    if (isScreenSharing.value) {
      toast.warning("Un partage d'écran est déjà en cours");
      return;
    }

    // création du stream de partage d'écran
    screenStream.value = await TRTC.createStream({
      screen: true,
      screenAudio: true,
    });

    await screenStream.value.initialize();

    screenStream.value.on('screen-sharing-stopped', () => {
      stopScreenCapture();
    });

    // Publication du flux aux autre participants
    await client.value.publish(screenStream.value);
    currentScreenSharer.value = currentUserID.value;
    isScreenSharing.value = true;

    console.log('Partage démarré avec succès, stream ID:', screenStream.value.getId());
    toast.success("Partage d'écran démarré avec succès!");
  } catch (error) {
    console.error("Erreur lors du partage d'écran : ", error);
    if (error.message && error.message.includes("Permission denied")) {
      toast.warning("Permission refusée pour le partage d'écran");
    } else {
      toast.error(`Erreur lors du partage d'écran`);
    }
    screenStream.value = null;
  }
}

// watch pour surveiller les changements de l'utilisateur en partage d'écran
watch(currentScreenSharer, (newVal) => {
  if (newVal && newVal !== currentUserID.value) {
    // Désactiver le bouton de partage pour les autres utilisateurs
    isScreenSharing.value = false;
  }
});

// watch pour surveiller les changements de l'appel
watch(isCallStarted, (newValue) => {
  console.log("La valeur de isCallStarted a changé et est maintenant : ", newValue);
  if (newValue) {
    isCallActive.value = true;
  }
});


/**
 * permet de nettoyer le flux distant
 * @param streamId identifiant du flux distant
 */
function cleanupRemoteStream(streamId) {
  const remoteDiv = document.getElementById(`remote-${streamId}`);
  if (remoteDiv) {
    remoteDiv.remove();
  }
}

/**
 * permet la déconnexion , c'est-à-dire de quitter la salle 
 */
async function leaveRoom() {
  if (client.value) {
    if (screenStream.value) {
      await stopScreenCapture();
    }
    await client.value.leave();
    client.value = null;
    isTRTCInitialized.value = false;
  }
}


/**
 * permet d'arrêter le partage d'écran
 */
async function stopScreenCapture() {
  try {
    console.log('Tentative d\'arrêt du partage, état actuel:', {
      hasStream: !!screenStream.value,
      isSharing: isScreenSharing.value,
      currentSharer: currentScreenSharer.value
    });

    if (screenStream.value) {
      // arrêter l'affichage du flux
      if (client.value) {
        console.log('Unpublishing stream...');
        await client.value.unpublish(screenStream.value);
      }

      // Arrêter le stream
      console.log('Stopping stream...');
      screenStream.value.stop();

      // Nettoyer les éléments visuels
      const streamId = screenStream.value.getId();
      console.log('Cleaning up stream:', streamId);

      const remoteContainer = document.getElementById('remoteContainer');
      if (remoteContainer) {
        const remoteDivs = remoteContainer.querySelectorAll(`[id^="remote-"]`);
        remoteDivs.forEach(div => {
          if (div.id.includes(streamId)) {
            div.remove();
          }
        });
      }

      // Réinitialiser les états des variables de partage 
      screenStream.value = null;
      isScreenSharing.value = false;
      currentScreenSharer.value = null;

      toast.success("Partage d'écran arrêté avec succès");
    } else {
      console.log('Aucun stream à arrêter');
      toast.warning("Aucun partage d'écran actif");
    }
  } catch (error) {
    console.error("Erreur lors de l'arrêt du partage d'écran:", error);
    toast.error(`Erreur lors de l'arrêt du partage d'écran: ${error.message}`);
  }
}

/**
 * permet d'initialiser TUICallKit
 * @param callerUserID 
 */
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
        onError: handleError,
        onCallAccepted: () => {
          isCallStarted.value = true;
          toast.success("Appel accepté !");
        },
        onCallRejected: () => {
          isCallStarted.value = false;
          toast.info("Appel rejeté !");
        },
        onUserAccept: () => {
          isCallStarted.value = true;
          toast.success("Vous aviez accepté l'appel !");
        },
        onUserReject: () => {
          isCallStarted.value = false;
          toast.info("Vous aviez rejeté l'appel !");
        }
      }
    });

    // Initialiser TRTC après TUICallKit
    await initTRTC(callerUserID);

    isCalleeInitialized.value = true;
    toast.success("TUICallKit initialisé avec succès !");
  } catch (error) {
    console.error("Erreur d'initialisation:", error);
    toast.error(`Erreur lors de l'initialisation : ${error}`);
  }
};

const handleInit = async (userID) => {
  try {
    await init(userID);
  } catch (error) {
    console.error("Erreur lors de l'initialisation:", error);
    toast.error("Erreur lors de l'initialisation");
  }
};

/**
 * permet de confirmer l'appel audio en cas de non détection de caméra
 */
const handleNoCameraConfirm = async () => {
  showNoCameraModal.value = false;
  if (pendingCalleeUserID.value) {
    await call(pendingCalleeUserID.value, TUICallType.AUDIO_CALL);
    pendingCalleeUserID.value = null;
    pendingCallType.value = null;
  }
};

/**
 * permet d'annuler l'appel audio en cas de non détection de caméra
 */
const handleNoCameraCancel = () => {
  showNoCameraModal.value = false;
  pendingCalleeUserID.value = null;
  pendingCallType.value = null;
  toast.info("Appel annulé");
};

/**
 * permet d'appeler un utilisateur en appel audio ou vidéo
 * @param calleeUserID identifiant de l'utilisateur appelé
 * @param callType type d'appel (audio ou vidéo)
 */
const call = async (calleeUserID, callType) => {
  if (!calleeUserID) {
    toast.error("Veuillez entrer l'identifiant de l'appelé");
    return;
  }

  try {
    // Vérifier si la caméra est disponible pour les appels vidéo
    if (callType === TUICallType.VIDEO_CALL) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');

      if (!hasCamera) {
        pendingCalleeUserID.value = calleeUserID;
        pendingCallType.value = callType;
        showNoCameraModal.value = true;
        return;
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

    isCallStarted.value = true;
    toast.info("Appel en cours...");
  } catch (error) {
    console.error("Erreur lors de l'appel:", error);
    // Vérifier si l'erreur contient le message 
    if (error.message && error.message.includes("Invalid sender or receiver identifier")) {
      toast.error("L'utilisateur appelé n'a pas encore initialisé TUICallKit");
    } else {
      toast.error(`Erreur: ${error.message}`);
    }
  }
};

/**
 * événements
 */

// permet de gérer les appels entrants
const handleIncomingCall = (event) => {
  const { inviter, type } = event;
  console.log('Appel entrant de:', inviter, 'type:', type);
  isCallStarted.value = true;
  toast.info(`Appel entrant de ${inviter}`);
};

// permet de gérer les utilisateurs entrants
const handleUserEnter = (userID) => {
  console.log('Utilisateur entré:', userID);
  isCallStarted.value = true;
  isCallActive.value = true;

  // Ajouter un message système dans le chat
  if (chatComponentRef.value) {
    chatComponentRef.value.receiveMessage(`${userID} a rejoint l'appel`);
  }

  toast.success(`${userID} a rejoint l'appel`);
};

// permet de gérer les utilisateurs qui quittent l'appel
const handleUserLeave = (userID) => {
  console.log('Utilisateur parti:', userID);
  toast.info(`${userID} a quitté l'appel`);
};

// permet de gérer la fin de l'appel
const handleCallEnd = () => {
  console.log('Appel terminé');
  isCallStarted.value = false;
  isCallActive.value = false;

  // Ajouter un message système dans le chat
  if (chatComponentRef.value) {
    chatComponentRef.value.receiveMessage('L\'appel est terminé');
  }

  if (!isCallActive.value) {
    isCallStarted.value = false;
  }
  if (screenStream.value || isScreenSharing.value) {
    stopScreenCapture();
  }
  toast.info("Appel terminé");
};

// permet de nettoyer l'état lors de la déconnexion ,c'est-à-dire lorsque l'utilisateur quitte la page
const cleanup = () => {
  isCallActive.value = false;
  isCallStarted.value = false;
  if (screenStream.value) {
    stopScreenCapture();
  }
  // Réinitialiser les messages du chat
  chatMessages.value = [];
};

// permet de gérer les erreurs
const handleError = (error) => {
  console.error('Erreur durant l\'appel:', error);
  toast.error(`Erreur: ${error.message}`);
};

// permet de créer un groupe d'utilisateurs pour l'appel en groupe
const createGroupID = async () => {
  const chat = Chat.create({ SDKAppID });
  const userIDList = calleeUserIDs.value.split(',').map(id => id.trim()).filter(id => id);
  console.log("userIDList>>>>>", userIDList);
  const memberList = userIDList.map(userID => ({ userID }));
  const res = await chat.createGroup({ type: Chat.TYPES.GRP_PUBLIC, name: "WebSDK", memberList });
  groupID.value = res.data.group.groupID;
};

/**
 * permet de démarrer un appel en groupe
 * @param callType type d'appel (audio ou vidéo)
 */
const startGroupCall = async (callType) => {
  if (!groupID.value) {
    toast.error("Erreur : Aucun groupID trouvé.");
    return;
  }
  try {
    // suppression des espaces et des doublons
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

/**
 * permet la gestion du processus d'appel en groupe (création du groupID et démarrage de l'appel)
 */
const handleStartGroupCall = async () => {
  showGroupCallForm.value = false;
  await createGroupID();
  await startGroupCall(selectedCallType.value);
  isCallStarted.value = true;
};

// permet l'annulation de l'appel en groupe et la réinitialisation des données
const cancelGroupCall = () => {
  showGroupCallForm.value = false;
  calleeUserIDs.value = '';
};

const socket = ref(io('http://localhost:8080', {
  withCredentials: true,
  transports: ['websocket', 'polling']
}));

onMounted(() => {
  socket.value.on('connect', () => {
    console.log('Connecté au serveur Socket.IO');
  });

  socket.value.on('error', (error) => {
    console.error('Erreur Socket.IO:', error);
    toast.error('Erreur de connexion au chat');
  });
});

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});
/**
 * Gestion des messages du chat
 * @param message le message envoyé
 */
const handleChatMessage = async (message) => {
  try {
    // Émettre le message directement sans passer par le composant chat
    socket.value.emit('message', message);
    console.log('Message envoyé:', message);
    toast.success('Message envoyé avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
   // toast.error('Erreur lors de l\'envoi du message');
  }
};

// permet d'ouvrir et de fermer la fenêtre de discussion
const toggleChat = () => {
  isChatOpen.value = !isChatOpen.value;
};
</script>



<style scoped>
@import './assets/app.css';

.chat-container {
  transition: all 0.3s ease;
}
</style>
