<template>
  <div class="call-container" :class="{ 'video-call': isVideoCall }">
    <!-- Arrière-plan avec initiale pour l'appelant et l'appelé -->
    <div
      class="background-initial"
      v-if="
        !isVideoCall && (callStatus === 'outgoing' || callStatus === 'incoming')
      "
    >
      <span class="large-initial">
        {{
          callStatus === "outgoing"
            ? remoteUserId.charAt(0).toUpperCase()
            : currentUserId.charAt(0).toUpperCase()
        }}
      </span>
    </div>
    <!-- chrono pour indiquer la durée d'appel -->
    <!-- <div class="call-timer mt-3">
    {{ formattedCallDuration }}
  </div> -->

    <!-- Affichage du flux audio/vidéo -->
    <div class="remote-stream-container" v-if="callStatus === 'connected'">
      <video
        ref="remoteVideo"
        autoplay
        :class="{ hidden: !isVideoCall }"
        :style="{ transform: 'scaleX(-1)' }"
      ></video>
      <template v-if="callStatus === 'outgoing' || callStatus === 'incoming'">
        Appel en cours avec {{ currentUserId }}...
      </template>
      <div class="remote-audio-indicator" v-if="!isVideoCall">
        <div class="user-avatar">
          <span
            class="text-2xl font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-gray-800 rounded-full w-28 h-28 flex items-center justify-center"
          >
            {{ remoteUserId.charAt(0).toUpperCase() }}
          </span>
        </div>
        <div class="audio-waves">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>

    <!-- Affichage du flux de la vidéo localement -->
    <div class="local-stream-container" v-if="localStream">
      <video
        ref="localVideo"
        autoplay
        muted
        :class="{ hidden: !isVideoCall }"
        :style="{ transform: 'scaleX(-1)' }"
      ></video>
      <div class="local-audio-indicator" v-if="!isVideoCall">
        <div class="user-avatar">
          <span
            class="text-xl font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center"
          >
            {{ currentUserId.charAt(0).toUpperCase() }}
          </span>
        </div>
      </div>
    </div>

    <!-- Indicateur du statut d'appel -->
    <div class="call-status" v-if="callStatus !== 'connected'">
      <div class="status-message text-center mt-5">
        <template v-if="callStatus === 'outgoing' || callStatus === 'incoming'">
          Appel en cours avec {{ remoteUserId }}...
        </template>
        <!-- <template v-else-if="callStatus === 'incoming'">
        Appel entrant de {{ remoteUserId }}
      </template> -->
      </div>
    </div>

    <div class="remote-media-indicators">
      <div v-if="!remoteVideoEnabled" class="video-disabled-indicator">
        {{ remoteUserId }} a désactivé sa caméra
      </div>
      <div v-if="!remoteAudioEnabled" class="audio-disabled-indicator">
        {{ remoteUserId }} a désactivé son micro
      </div>
    </div>

    <!-- Commandes d'appel -->
    <div class="call-controls">
      <!-- couper le son de l'appel -->
      <button
        @click="toggleMute"
        class="control-btn"
        :class="{ active: isMuted }"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-6 h-6"
        >
          <path
            v-if="!isMuted"
            d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z"
          />
          <path
            v-if="!isMuted"
            d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z"
          />
          <path
            v-if="isMuted"
            d="M10.5 1.875a1.125 1.125 0 012.25 0v8.25c0 .621-.504 1.125-1.125 1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-8.25a1.125 1.125 0 011.125-1.125h1.5zm-4.5 4.5a.75.75 0 00-1.5 0v5.25c0 2.9 2.35 5.25 5.25 5.25h3a.75.75 0 000-1.5h-3a3.75 3.75 0 01-3.75-3.75V6.375z"
          />
          <path
            v-if="isMuted"
            d="M19.78 17.28a.75.75 0 00-1.06-1.06L6.22 28.72a.75.75 0 101.06 1.06L19.78 17.28z"
          />
        </svg>
      </button>
      <!-- basculer entre l'affichage et le masquage de la vidéo -->
      <button
        @click="toggleVideo"
        class="control-btn"
        :class="{ active: isVideoOff }"
        v-if="isVideoCall"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-6 h-6"
        >
          <path
            v-if="!isVideoOff"
            d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z"
          />
          <path
            v-if="isVideoOff"
            d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.5 17.69c0 .471-.202.86-.504 1.124l-9.309-9.31c.043-.043.086-.084.129-.124H21a1.5 1.5 0 011.5 1.5v6.75z"
          />
        </svg>
      </button>
      <!-- mettre fin à l'appel -->
      <button @click="endCall" class="control-btn end-call">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-6 h-6"
        >
          <path
            fill-rule="evenodd"
            d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
            clip-rule="evenodd"
          />
          <path
            fill-rule="evenodd"
            d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
      <!--enregistrer l'appel-->
      <!-- <button @click="toggleRecording" :class="['control-button', isRecording ? 'recording' : '']"
        title="Enregistrer l'appel">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="6" :fill="isRecording ? '#ff0000' : 'none'" stroke-width="2" />
        </svg>
      </button> -->
    </div>

    <!-- Commandes d'appel entrant -->
    <div class="incoming-call-controls" v-if="callStatus === 'incoming'">
      <!-- accepter l'appel -->
      <button @click="acceptCall()" class="accept-btn">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-6 h-6"
        >
          <path
            fill-rule="evenodd"
            d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
            clip-rule="evenodd"
          />
        </svg>
        Accepter
      </button>
      <!-- rejeter l'appel -->
      <button @click="rejectCall" class="reject-btn">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-6 h-6"
        >
          <path
            fill-rule="evenodd"
            d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
            clip-rule="evenodd"
          />
          <path
            fill-rule="evenodd"
            d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18z"
            clip-rule="evenodd"
          />
        </svg>
        Rejeter
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import WebRTCService from "../services/WebRTCService";
import { useToast } from "vue-toastification";

/**
 * transfert de flux d'audio ou vidéo
 *
 */
// propriétés à recevoir
const props = defineProps({
  socket: Object,
  currentUserId: String,
  remoteUserId: String,
  isVideoCall: Boolean,
  callStatus: String,
  isIncoming: Boolean,
});
// événements à émettre
const emit = defineEmits([
  "call-ended",
  "call-status-change",
  "video-disabled",
]);

// notification(s)
const toast = useToast();

// Références pour les éléments vidéos
const localVideo = ref(null);
const remoteVideo = ref(null);
const isRecording = ref(false);

// Variables d'état
const localStream = ref(null);
const remoteStream = ref(null);
const isMuted = ref(false);
const isVideoOff = ref(false);

// création d'une référence locale pour l'état de la vidéo
const localIsVideoCall = ref(props.isVideoCall);
const currentCallStatus = ref("");

// Suivre les changements du flux de la vidéo (afficher en temps réel ce que transmet la caméra de l'appelant)
watch(
  () => props.isVideoCall,
  (newValue) => {
    localIsVideoCall.value = newValue;
  }
);

const callStatusText = computed(() => {
  switch (currentCallStatus.value) {
    case "outgoing":
      return "Appel en cours";
    case "incoming":
      return "Appel entrant";
    case "connected":
      return "Appel connecté";
    default:
      return "En attente";
  }
});

const toggleRecording = () => {
  if (!isRecording.value) {
    if (WebRTCService.startRecording()) {
      isRecording.value = true;
    }
  } else {
    if (WebRTCService.stopRecording()) {
      isRecording.value = false;
    }
  }
};

const callStartTime = ref(null);
const callDuration = ref(0);
const timerInterval = ref(null);

// Ajoutez cette computed property pour formater la durée
const formattedCallDuration = computed(() => {
  const minutes = Math.floor(callDuration.value / 60);
  const seconds = callDuration.value % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
});

/**
 *  démarrage d'un appel vidéo ou audio sortant, en vérifiant la disponibilité des périphériques
 * et en ajustant l'appel en fonction des ressources disponibles (caméra et micro).
 */
const startOutgoingCall = async () => {
  try {
    // Demander à WebRTCService de récupérer les flux audio/vidéo locaux en fonction du type d'appel
    const result = await WebRTCService.getLocalMedia(localIsVideoCall.value);

    // Vérifier si la récupération du flux a échoué
    if (!result.success) {
      // Si aucun périphérique audio n'est trouvé, afficher un avertissement et terminer l'appel
      if (result.noAudioDevice) {
        toast.warning(
          "Aucun périphérique audio trouvé. Impossible de passer un appel."
        );
        emit("call-ended"); // Émettre un événement pour signaler que l'appel est terminé
        return;
      }
      // Si une autre erreur se produit, lever une exception
      throw result.error;
    }

    // Si la caméra n'est pas disponible, proposer de passer à un appel audio
    if (result.fallbackToAudio) {
      const switchToAudio = confirm(
        "Aucune caméra n'a été trouvée. Voulez-vous basculer vers un appel audio ?"
      );
      // Si l'utilisateur accepte, passer en mode appel audio
      if (switchToAudio) {
        localIsVideoCall.value = false; // Mettre à jour le type d'appel à audio
        emit("video-disabled"); // Émettre un événement pour indiquer que la vidéo est désactivée
      } else {
        emit("call-ended"); // Sinon, terminer l'appel
        return;
      }
    }

    // Si tout est bon, initialiser le flux local et définir l'état de l'appel comme sortant
    localStream.value = result.stream;
    currentCallStatus.value = "outgoing"; // Mettre à jour l'état de l'appel en cours à 'sortant'

    // Appeler la fonction pour établir l'appel avec l'utilisateur distant
    await WebRTCService.makeCall(
      props.remoteUserId,
      !result.fallbackToAudio && localIsVideoCall.value
    );
  } catch (error) {
    // En cas d'erreur lors de l'initialisation de l'appel, afficher un message d'erreur
    console.error("Failed to start call:", error);
    toast.error(
      "Erreur lors de l'initialisation de l'appel. Veuillez réessayer."
    );
    emit("call-ended"); // Émettre un événement pour signaler que l'appel est terminé
  }
};

/**
 *  gère le flux vidéo/audio distant reçu.
 *  met à jour le flux distant et l'affiche si un élément vidéo est présent.
 * @param {MediaStream} stream - Le flux vidéo/audio distant à afficher.
 */
const handleRemoteStream = (stream) => {
  // Mettre à jour la valeur du flux distant
  remoteStream.value = stream;

  // Si l'élément vidéo distant existe, l'afficher
  if (remoteVideo.value) {
    remoteVideo.value.srcObject = stream;
  }
};

/**
 * gère les changements de statut de l'appel.
 * met à jour l'état local du statut de l'appel et émet un événement pour notifier
 * les autres composants du changement.
 * @param {string} status - Le nouveau statut de l'appel (ex. 'en cours', 'terminé', etc.).
 * @param {string} userId - L'identifiant de l'utilisateur concerné par le changement de statut.
 * @param {boolean} withVideo - Indique si l'appel est vidéo ou audio.
 */
const handleCallStatusChange = (status, userId, withVideo) => {
  console.log("Call status changed:", status);
  currentCallStatus.value = status;

  // Démarrer le timer quand l'appel est connecté
  if (status === "connected") {
    console.log("Starting timer for status:", status);
    // S'assurer qu'il n'y a pas déjà un timer en cours
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
    }

    callStartTime.value = Date.now();
    timerInterval.value = setInterval(() => {
      callDuration.value = Math.floor(
        (Date.now() - callStartTime.value) / 1000
      );
    }, 1000);
  } else if (status === "ended" || status === "rejected") {
    // Arrêter le timer si l'appel est terminé ou rejeté
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
    callDuration.value = 0;
    callStartTime.value = null;
  }

  emit("call-status-change", status, userId, withVideo);
};

/**
 *  fonction  appelée lorsque le composant est monté.
 *  initialise le service WebRTC et démarre l'appel sortant si nécessaire.
 */
onMounted(() => {
  // Initialiser le type d'appel (vidéo ou audio) à partir des propriétés du composant
  localIsVideoCall.value = props.isVideoCall;
  // Initialiser l'état actuel de l'appel à partir des propriétés du composant
  currentCallStatus.value = props.callStatus || "";

  // Initialiser le service WebRTC avec les paramètres nécessaires
  WebRTCService.init(
    props.socket,
    props.currentUserId,
    handleRemoteStream,
    handleCallStatusChange
  );

  // Écouter l'événement toggle-video
  props.socket.on("toggle-video", (data) => {
    console.log("Réception de l'événement toggle-video:", data);
    if (data.from === props.remoteUserId) {
      // Mettre à jour l'état de la vidéo distante
      remoteVideoEnabled.value = !data.off;
      console.log(
        `L'utilisateur distant ${data.from} a ${
          data.off ? "désactivé" : "activé"
        } sa caméra`
      );
    }
  });


  // Écouter l'événement toggle-audio
  props.socket.on("toggle-audio", (data) => {
    console.log("Réception de l'événement toggle-audio:", data);
    if (data.from === props.remoteUserId) {
      // Mettre à jour l'état de la vidéo distante
      remoteAudioEnabled.value = !data.off;
      console.log(
        `L'utilisateur distant ${data.from} a ${
          data.off ? "désactivé" : "activé"
        } son micro`
      );
    }
  });


  // Si l'appel est sortant, démarrer l'appel
  if (props.callStatus === "outgoing" && props.remoteUserId) {
    startOutgoingCall();
  }
});

/**
 *  fonction  appelée lorsque le composant est démonté.
 *  termine l'appel WebRTC en cours pour libérer les ressources.
 */
onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
  WebRTCService.endCall(); // Terminer l'appel en cours
  cleanupCallState();
});

/**
 *  surveille les changements des éléments vidéo et des flux associés.
 * Si un flux est disponible, il est attaché à l'élément vidéo correspondant.
 */
watch([localVideo, remoteVideo, localStream, remoteStream], () => {
  // Si l'élément vidéo local et le flux local sont disponibles, les attacher
  if (localVideo.value && localStream.value) {
    localVideo.value.srcObject = localStream.value;
  }
  // Si l'élément vidéo distant et le flux distant sont disponibles, les attacher
  if (remoteVideo.value && remoteStream.value) {
    remoteVideo.value.srcObject = remoteStream.value;
  }
});

/**
 *  tente d'obtenir le média local (audio et/ou vidéo) et de démarrer l'appel une fois la configuration terminée.
 */
const acceptCall = async () => {
  try {
    const result = await WebRTCService.getLocalMedia(localIsVideoCall.value);
    if (!result.success) {
      throw result.error;
    }
    localStream.value = result.stream;

    // Accepter l'appel d'abord
    await WebRTCService.acceptCall();

    // Mettre à jour le statut et émettre l'événement avec tous les paramètres
    currentCallStatus.value = "connected";
    emit(
      "call-status-change",
      "connected",
      props.remoteUserId,
      localIsVideoCall.value
    );
  } catch (error) {
    console.error("Failed to accept call:", error);
    emit("call-ended");
  }
};

// fonction pour nettoyer les états
const cleanupCallState = () => {
  console.log("Cleaning up call state...");

  // Arrêter le chronomètre d'abord
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }

  // Réinitialiser les flux
  if (localStream.value) {
    localStream.value.getTracks().forEach((track) => track.stop());
    localStream.value = null;
  }
  if (remoteStream.value) {
    remoteStream.value.getTracks().forEach((track) => track.stop());
    remoteStream.value = null;
  }

  // Réinitialiser les éléments vidéo
  if (localVideo.value) localVideo.value.srcObject = null;
  if (remoteVideo.value) remoteVideo.value.srcObject = null;

  // Réinitialiser les états
  currentCallStatus.value = "";
  isMuted.value = false;
  isVideoOff.value = false;
  callDuration.value = 0;
  callStartTime.value = null;
};

/**
 *  met fin à l'appel en rejetant la connexion via WebRTC et notifie les autres composants.
 */
const rejectCall = () => {
  console.log("appel rejeté");
  // Rejeter l'appel via WebRTC
  WebRTCService.rejectCall();
  // Nettoyer les états
  cleanupCallState();
  // Émettre un événement pour indiquer que l'appel est terminé
  emit("call-ended");
};

/**
 *  termine l'appel via WebRTC et notifie les autres composants.
 */
const endCall = () => {
  // Terminer l'appel via WebRTC
  WebRTCService.endCall();
  // Nettoyer les états
  cleanupCallState();
  // Émettre un événement pour indiquer que l'appel est terminé
  emit("call-ended");
};

onUnmounted(() => {
  if (WebRTCService.onMediaStateChange) {
    WebRTCService.onMediaStateChange = null;
  }
});

/**
 *  bascule l'état de l'audio et notifie le service WebRTC.
 */
const toggleMute = () => {
  isMuted.value = !isMuted.value;
  WebRTCService.toggleAudio(isMuted.value, props.remoteUserId, props.currentUserId);
};

const remoteVideoEnabled = ref(true);
const remoteAudioEnabled = ref(true);
/**
 *  bascule l'état de la vidéo et notifie le service WebRTC.
 */
const toggleVideo = () => {
  isVideoOff.value = !isVideoOff.value;
  WebRTCService.toggleVideo(
    isVideoOff.value,
    props.remoteUserId,
    props.currentUserId
  );
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

.recording {
  background-color: rgba(255, 0, 0, 0.2);
}

.control-button {
  position: relative;
}

.control-button.recording::after {
  content: "";
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  background-color: #ff0000;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.5);
    opacity: 0.5;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.local-audio-indicator {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #1a1a1a;
}

.local-stream-container .user-avatar span {
  font-size: 1.5rem;
  width: 3rem;
  height: 3rem;
}

.background-initial {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 0;
  opacity: 0.1;
  pointer-events: none;
}

.large-initial {
  font-size: 25rem;
  font-weight: bold;
  color: white;
}

.call-timer {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.5);
  padding: 5px 15px;
  border-radius: 15px;
  font-size: 1.2rem;
  font-weight: bold;
}
</style>