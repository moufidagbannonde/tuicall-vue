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
    <!-- chrono pour indiquer la durée d'appel (à commencer du moment où l'appel a commencé)-->
    <div class="call-timer mt-3" v-if="currentCallStatus === 'connected'">
      {{ formattedCallDuration }}
    </div>

    <!-- Indicateur du statut d'appel -->
    <div class="call-status">
      <div class="status-message text-center mt-5">
        <template v-if="currentCallStatus === 'outgoing'">
          Appel en cours avec {{ remoteUserId }}...
        </template>
        <template v-else-if="currentCallStatus === 'incoming'">
          Appel entrant de {{ remoteUserId }}...
        </template>
        <template v-else-if="currentCallStatus === 'connected'">
          En appel avec {{ remoteUserId }}
        </template>
      </div>
    </div>
    <!-- Affichage du flux audio/vidéo -->
    <div class="remote-stream-container relative">
  <!-- Vidéo WebRTC pour l'agent (voit le client) -->
  <video
    v-if="userRole === 'agent' && remoteStream"
    id="remoteVideo"
    autoplay
    playsinline
    :muted="false"
    :style="{ transform: 'scaleX(-1)' }"
    style="width: 100%; height: 100%; object-fit: cover"
  ></video>
  
  <!-- Avatar SDK UNIQUEMENT pour le client -->
  <div v-if="userRole === 'client' && remoteStream" class="agent-avatar-container"></div>
</div>

    <!-- flux de partage d'écran -->
    <video
      v-if="screenSharingActive && !isScreenSharer"
      ref="screenShareVideo"
      :key="'screen-' + Date.now()"
      autoplay
      playsinline
      class="screen-share-video"
    ></video>
    <!-- Affichage du flux de la vidéo localement -->
    <div
      class="local-stream-container"
      v-if="currentCallStatus === 'connected' || localStream"
    >
      <!-- Vidéo locale -->
      <video
        v-if="localStream"
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

    <div class="remote-media-indicators space-y-3 fixed top-5 right-5 z-50">
      <transition
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="translate-y-[-20px] opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transform ease-in duration-200 transition"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-[-20px] opacity-0"
      >
        <div
          v-if="!remoteVideoEnabled"
          class="video-disabled-indicator flex items-center bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-3 rounded-lg shadow-xl backdrop-blur-sm border border-red-400"
        >
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-red-700 rounded-full">
              <span class="text-xl">🎥</span>
            </div>
            <div>
              <p class="text-sm font-medium">Caméra désactivée</p>
              <p class="text-xs opacity-80">
                {{ remoteUserId }} a coupé sa caméra
              </p>
            </div>
          </div>
        </div>
      </transition>

      <transition
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="translate-y-[-20px] opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transform ease-in duration-200 transition"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-[-20px] opacity-0"
      >
        <div
          v-if="!remoteAudioEnabled"
          class="audio-disabled-indicator flex items-center bg-gradient-to-r from-gray-700 to-gray-800 text-white px-5 py-3 rounded-lg shadow-xl backdrop-blur-sm border border-gray-600"
        >
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-gray-900 rounded-full">
              <span class="text-xl">🎤</span>
            </div>
            <div>
              <p class="text-sm font-medium">Micro désactivé</p>
              <p class="text-xs opacity-80">
                {{ remoteUserId }} a coupé son micro
              </p>
            </div>
          </div>
        </div>
      </transition>
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
      <!-- partager l'écran -->
      <button
        @click="startScreenShare"
        class="control-btn"
        v-if="currentCallStatus === 'connected' && userRole !== 'agent'"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-6 h-6"
        >
          <path
            d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm8 3l4 4h-3v4h-2v-4H8l4-4z"
          />
        </svg>
      </button>
      <!-- mettre fin à l'appel -->
      <button @click="endCall" class="control-btn end-call">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
          <path fill="currentColor" d="m3.68 16.07l3.92-3.11V9.59c2.85-.93 5.94-.93 8.8 0v3.38l3.91 3.1L24 12.39c-6.41-7.19-17.59-7.19-24 0z"/>
        </svg>
      </button>
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
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from "vue";
import WebRTCService from "../services/WebRTCService";
import { useToast } from "vue-toastification";
import Peer from "peerjs";
import VirtualAvatarService from '../services/VirtualAvatarService';

const iceCandidateReceived = ref(false);
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
  userRole: String,
  initialLocalStream: MediaStream,
});

const peerConnection = ref(null);
const remotePeerConnection = ref(null);
const screenSharingActive = ref(false);
const screenShareVideo = ref(null);
const awaitingRecordPermission = ref(false);
const virtualHumanReady = ref(false);
const useVirtualAvatar = ref(true);
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

// Utiliser la prop initialLocalStream pour l'aperçu local.
// Ce watcher s'assure que localStream.value est mis à jour si la prop arrive ou change.
watch(() => props.initialLocalStream, (newStream) => {
  if (newStream) {
    localStream.value = newStream;
  }
}, { immediate: true }); // immediate: true pour l'initialisation au montage si la prop est déjà là.

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
  if (isRecording.value) { // Si on enregistre déjà, on arrête
    if (WebRTCService.stopRecording()) {
      isRecording.value = false;
      props.socket.emit('recording-status-changed', { to: props.remoteUserId, recording: false });
      toast.info("Enregistrement arrêté.");
    } else {
      toast.error("Erreur lors de l'arrêt de l'enregistrement.");
    }
  // if (!isRecording.value) {
  //   if (WebRTCService.startRecording()) {
  //     isRecording.value = true;
  //   }
  // } else {
  //   if (WebRTCService.stopRecording()) {
  //     isRecording.value = false;
  //   }
  } else { // Sinon, on demande la permission pour démarrer
    if (awaitingRecordPermission.value) return; // Déjà en attente d'une réponse

    awaitingRecordPermission.value = true;
    props.socket.emit('request-record-permission', {
      from: props.currentUserId, // ID de l'agent
      to: props.remoteUserId    // ID du client
    });
    toast.info("Demande d'autorisation d'enregistrement envoyée au client...");
  }
};

const callStartTime = ref(null);
const callDuration = ref(0);
const timerInterval = ref(null);
const isCallBeingRecordedByAgent = ref(false);

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

    // Mettre à jour le statut après que l'appel est établi
    currentCallStatus.value = "connected";
    emit(
      "call-status-change",
      "connected",
      props.remoteUserId,
      localIsVideoCall.value
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

const showPlayButton = ref(false);

// Ajoutez cette méthode pour forcer la lecture
const forcePlayRemoteVideo = () => {
  const remoteVideo = document.getElementById("remoteVideo");
  if (remoteVideo && remoteStream.value) {

    // Réinitialiser le srcObject pour éviter les problèmes
    const currentStream = remoteVideo.srcObject;
    remoteVideo.srcObject = null;

    // Petit délai avant de réattacher le flux
    setTimeout(() => {
      remoteVideo.srcObject = currentStream;
      remoteVideo.volume = 1.0;
      remoteVideo.muted = false;

      remoteVideo
        .play()
        .then(() => {
          showPlayButton.value = false;
        })
        .catch((error) => {
          console.error("Échec de la lecture forcée:", error);
        });
    }, 100);
  }
};

/**
 *  gère le flux vidéo/audio distant reçu.
 *  met à jour le flux distant et l'affiche si un élément vidéo est présent.
 * @param {MediaStream} stream - Le flux vidéo/audio distant à afficher.
 */
const handleRemoteStream = (stream) => {
  console.log('[STREAM] Flux distant reçu, rôle:', props.userRole);
  remoteStream.value = stream;

  // Pour le client, pas besoin d'attacher à remoteVideo (il voit l'avatar)
  if (props.userRole === 'client') {
    console.log('[CLIENT] Flux distant assigné, watcher devrait se déclencher');
    return;
  }

  // Pour l'agent uniquement : attacher le flux à l'élément vidéo
  const attachStreamToVideo = () => {
    const remoteVideo = document.getElementById("remoteVideo");
    if (remoteVideo) {
      // Arrêter l'ancien flux s'il existe
      if (remoteVideo.srcObject) {
        const oldStream = remoteVideo.srcObject;
        if (oldStream && oldStream.getTracks) {
          oldStream.getTracks().forEach((track) => track.stop());
        }
      }

      // Attacher le nouveau flux avec un délai pour éviter les interruptions
      setTimeout(() => {
        // Attacher le nouveau flux
        remoteVideo.srcObject = stream;

        // Forcer la lecture avec retry
        const playVideo = async () => {
          try {
            // Forcer le volume à un niveau audible
            remoteVideo.volume = 1.0;
            remoteVideo.muted = false;

            // Attendre un court instant avant de lancer la lecture
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Forcer la lecture
            const playPromise = remoteVideo.play();

            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  // Vérifier si la vidéo joue réellement
                  setTimeout(() => {
                    if (remoteVideo.paused) {
                      console.warn(
                        "La vidéo est en pause malgré le succès de play()"
                      );
                      remoteVideo
                        .play()
                        .catch((e) =>
                          console.error("Nouvelle tentative échouée:", e)
                        );
                    } else {
                    }
                  }, 1000);
                })
                .catch((error) => {
                  console.error(
                    "Erreur lors de la lecture automatique:",
                    error
                  );
                  // Si l'erreur est liée �� l'interaction utilisateur, afficher un message
                  if (error.name === "NotAllowedError") {
                    console.warn(
                      "La lecture automatique a été bloquée. Interaction utilisateur requise."
                    );
                    // Afficher un bouton pour que l'utilisateur démarre la lecture
                    showPlayButton.value = true;
                  } else {
                    // Pour les autres erreurs, réessayer après un délai
                    setTimeout(playVideo, 1000);
                  }
                });
            }
          } catch (error) {
            console.error("Erreur lors de la tentative de lecture:", error);
            setTimeout(playVideo, 1000);
          }
        };

        // Essayer de lire après un court délai
        setTimeout(playVideo, 200);

        // Également configurer l'événement onloadedmetadata
        remoteVideo.onloadedmetadata = () => {
          setTimeout(playVideo, 100);
        };
      }, 200);

      return true;
    } else {
      console.warn("L'élément vidéo distant n'est pas trouvé par ID");
      return false;
    }
  };

  // Essayer d'attacher immédiatement
  if (!attachStreamToVideo()) {
    // Si l'élément n'est pas encore disponible, réessayer avec un délai
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = setInterval(() => {
      attempts++;
      if (attachStreamToVideo() || attempts >= maxAttempts) {
        clearInterval(checkInterval);
        if (attempts >= maxAttempts) {
          console.error(
            "Impossible de trouver l'élément vidéo distant après plusieurs tentatives"
          );
        }
      }
    }, 200); // Vérifier toutes les 200ms
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
  console.log('[HANDLE STATUS] Reçu:', status, '| userId:', userId, '| video:', withVideo);
  currentCallStatus.value = status;
  
  // Démarrer le timer quand l'appel est connecté
  if (status === "connected") {
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

 // Écouteur pour la réponse de permission d'enregistrement (côté Agent)
 props.socket.on('record-permission-response', ({ from, to, granted }) => {
    if (props.userRole === 'agent' && to === props.currentUserId && from === props.remoteUserId) {
      awaitingRecordPermission.value = false;
      if (granted) {
        if (WebRTCService.startRecording()) {
          isRecording.value = true;
          props.socket.emit('recording-status-changed', { to: props.remoteUserId, recording: true });
          toast.success("Enregistrement démarré avec l'accord du client.");
        } else {
          isRecording.value = false;
          toast.error("Erreur lors du démarrage de l'enregistrement.");
        }
      } else {
        isRecording.value = false;
        toast.info("Le client a refusé la demande d'enregistrement.");
      }
    }
  });

  // Écouteur pour savoir si l'appel est en cours d'enregistrement (côté Client)
  props.socket.on('recording-status-changed', ({ recording }) => {
    if (props.userRole === 'client') {
      isCallBeingRecordedByAgent.value = recording;
      // Vous pouvez utiliser isCallBeingRecordedByAgent.value pour afficher un indicateur au client
      if (recording) {
        toast.info("Cet appel est en cours d'enregistrement.", { timeout: 5000 });
      } else {
        toast.info("L'enregistrement de l'appel est terminé.", { timeout: 3000 });
      }
    }
  });
  
watch(() => props.callStatus, async (newStatus) => {
  console.log('[WATCH PROPS] callStatus changé:', newStatus);
  currentCallStatus.value = newStatus;

  if (newStatus === 'connected' && !localStream.value && props.initialLocalStream) {
    localStream.value = props.initialLocalStream;
  }
}, { immediate: true });

const auto_record_video_call = localStorage.getItem('auto_record_video_call');

/**
 *  fonction  appelée lorsque le composant est monté.
 *  initialise le service WebRTC et démarre l'appel sortant si nécessaire.
 */
onMounted(async () => {
  if (auto_record_video_call) {
    const maDonnee = JSON.parse(auto_record_video_call);
    console.log("Donnée récupérée de l'autre projet :", maDonnee);
    // Tu peux maintenant utiliser maDonnee.utilisateur, maDonnee.theme, etc.
  } else {
    console.log("Aucune donnée partagée trouvée.");
  }


  // Initialiser le service WebRTC avec les paramètres nécessaires
  WebRTCService.init(
    props.socket,
    props.currentUserId,
    (remote) => {
      if (!remote) {
        console.error("Received null remote stream");
        return;
      }
      remoteStream.value = remote;
      handleRemoteStream(remote);
    },
    handleCallStatusChange
  );
  
  watch(
    remoteStream,
    (newStream, oldStream) => {
      // Clean up old stream
      if (oldStream) {
        oldStream.getTracks().forEach((track) => track.stop());
      }

      if (newStream) {
        if (newStream.getVideoTracks().length === 0) {
          toast.warning("Aucune piste vidéo dans le flux distant");
        }
        console.log('[STREAM] Flux distant reçu, rôle:', props.userRole);
        console.log('[CLIENT] Flux distant assigné, watcher devrait se déclencher');
      }
    },
    { immediate: true }
  );

  // Initialiser PeerJS
  try {
    await initPeerJS();
  } catch (error) {
    console.error(
      "Erreur lors de l'initialisation de PeerJS au montage:",
      error
    );
  }

  // Écouter l'événement screen-share-started
  props.socket.on("screen-share-started", (data) => {
    if (data.from === props.remoteUserId) {
      toast.info(`${props.remoteUserId} a commencé à partager son écran`);
    }
  });

  // Écouter l'événement screen-share-stopped
  props.socket.on("screen-share-stopped", (data) => {
    if (data.from === props.remoteUserId) {
      toast.info(`${props.remoteUserId} a arrêté de partager son écran`);
    }
  });

  // Écouter l'événement toggle-video
  props.socket.on("toggle-video", (data) => {
    if (data.from === props.remoteUserId) {
      // Mettre à jour l'état de la vidéo distante
      remoteVideoEnabled.value = !data.off;
    }
  });

  // Écouter l'événement toggle-audio
  props.socket.on("toggle-audio", (data) => {
    if (data.from === props.remoteUserId) {
      // Mettre à jour l'état de la vidéo distante
      remoteAudioEnabled.value = !data.off;
    }
  });

  // Si l'appel est sortant, démarrer l'appel
  if (props.callStatus === "outgoing" && props.remoteUserId) {
    startOutgoingCall();
  }
  
});

// Watcher pour initialiser l'avatar UNIQUEMENT pour le client
let avatarInitTimeout = null;
let avatarInitialized = false;
let avatarInitAttempts = 0;
let webrtcStableTimeout = null;
const MAX_INIT_ATTEMPTS = 3;

// Fonction pour vérifier si WebRTC est stable
const isWebRTCStable = () => {
  // Vérifier via le service WebRTC si disponible
  if (WebRTCService.peerConnection) {
    const pc = WebRTCService.peerConnection;
    const iceState = pc.iceConnectionState;
    const connState = pc.connectionState;
    
    console.log('[WEBRTC CHECK]', {
      iceState,
      connState,
      isStable: (iceState === 'connected' || iceState === 'completed') && 
                (connState === 'connected')
    });
    
    return (iceState === 'connected' || iceState === 'completed') && 
           (connState === 'connected');
  }
  
  return false;
};

// Fonction pour vérifier si le flux est vraiment prêt
const isStreamReady = (stream) => {
  if (!stream) return false;
  
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    console.log('[AVATAR] ⚠️ Aucune piste audio dans le flux');
    return false;
  }
  
  const activeAudioTrack = audioTracks.find(track => 
    track.readyState === 'live' && track.enabled
  );
  
  if (!activeAudioTrack) {
    console.log('[AVATAR] ⚠️ Aucune piste audio active');
    return false;
  }
  
  console.log('[AVATAR] ✅ Flux audio prêt:', {
    trackCount: audioTracks.length,
    trackState: activeAudioTrack.readyState,
    trackEnabled: activeAudioTrack.enabled
  });
  
  return true;
};

// Fonction d'initialisation de l'avatar avec retry amélioré
const initAvatar = async (retryCount = 0) => {
  const attemptNum = retryCount + 1;
  
  try {
    console.log(`[AVATAR] 🚀 Tentative d'initialisation ${attemptNum}/${MAX_INIT_ATTEMPTS}`);
    
    // Vérification 1: Statut de l'appel
    if (currentCallStatus.value !== 'connected') {
      throw new Error('Appel non connecté (status: ' + currentCallStatus.value + ')');
    }
    
    // Vérification 2: WebRTC stable
    if (!isWebRTCStable()) {
      throw new Error('WebRTC non stable, attente...');
    }
    
    // Vérification 3: Flux distant existe et est prêt
    if (!isStreamReady(remoteStream.value)) {
      throw new Error('Flux distant non prêt ou sans audio');
    }
    
    // Vérification 4: L'élément DOM existe
    const container = document.querySelector('.agent-avatar-container');
    if (!container) {
      throw new Error('Conteneur .agent-avatar-container non trouvé');
    }
    
    // ⚠️ IMPORTANT : Vérifier que le flux local existe (micro du client)
    if (!localStream.value) {
      throw new Error('Flux local non disponible (micro du client)');
    }
    
    const localAudioTrack = localStream.value.getAudioTracks()[0];
    if (!localAudioTrack || localAudioTrack.readyState !== 'live') {
      throw new Error('Piste audio locale non disponible ou inactive');
    }
    
    console.log('[AVATAR] ✅ Toutes les vérifications passées, initialisation...');
    console.log('[AVATAR] 📡 Track audio local:', {
      id: localAudioTrack.id,
      label: localAudioTrack.label,
      state: localAudioTrack.readyState,
      enabled: localAudioTrack.enabled
    });
    
    // Initialiser l'avatar
    await VirtualAvatarService.initialize('agent-avatar-container', {
      timeout: 90000,
      retryAttempts: 3
    });
    
    console.log('[AVATAR] ✅ Avatar initialisé avec succès');
    
    // ⚠️ CRITIQUE : Passer le track audio existant au lieu de demander un nouveau flux
    try {
      await VirtualAvatarService.startAudioStream(localAudioTrack);
      console.log('[AVATAR] ✅ Stream audio connecté (flux WebRTC réutilisé)');
      toast.success('Avatar connecté avec audio', { timeout: 3000 });
    } catch (audioError) {
      console.warn('[AVATAR] ⚠️ Audio non disponible:', audioError.message);
      toast.warning('Avatar connecté (sans audio)', { timeout: 3000 });
    }
    
    virtualHumanReady.value = true;
    avatarInitialized = true;
    avatarInitAttempts = 0;
    
  } catch (error) {
    console.error(`[AVATAR] ❌ Échec tentative ${attemptNum}:`, error.message);
    
    // Gérer les erreurs spécifiques
    const isResourceBusy = error.message.includes('611');
    const isTimeout = error.message.includes('Timeout');
    const isStreamNotReady = error.message.includes('Flux distant') || error.message.includes('Flux local');
    const isWebRTCNotStable = error.message.includes('WebRTC non stable');
    const isAudioNotAvailable = error.message.includes('Piste audio locale');
    
    // Retry si possible
    if (retryCount < MAX_INIT_ATTEMPTS - 1) {
      let retryDelay;
      
      if (isAudioNotAvailable) {
        // Pour les problèmes de micro, attendre un peu
        retryDelay = 5000;
        console.log(`[AVATAR] 🔄 Micro pas prêt, retry dans ${retryDelay/1000}s`);
        toast.info(`Attente du microphone... (${retryDelay/1000}s)`, { timeout: 5000 });
      } else if (isWebRTCNotStable) {
        retryDelay = 10000;
        console.log(`[AVATAR] 🔄 WebRTC instable, retry dans ${retryDelay/1000}s`);
        toast.info(`Attente stabilisation connexion... (${retryDelay/1000}s)`, { timeout: 5000 });
      } else if (isStreamNotReady) {
        retryDelay = 15000 * (retryCount + 1);
        console.log(`[AVATAR] 🔄 Flux pas prêt, retry dans ${retryDelay/1000}s`);
        toast.info(`Attente du flux audio... Retry dans ${retryDelay/1000}s`, { timeout: 5000 });
      } else if (isResourceBusy || isTimeout) {
        retryDelay = 10000 * (retryCount + 1);
        console.log(`[AVATAR] 🔄 Ressource occupée, retry dans ${retryDelay/1000}s`);
        toast.info(`Nouvelle tentative dans ${retryDelay/1000}s...`, { timeout: 5000 });
      } else {
        retryDelay = 8000;
        console.log(`[AVATAR] 🔄 Erreur inconnue, retry dans ${retryDelay/1000}s`);
        toast.warning(`Erreur: ${error.message}. Nouvelle tentative...`, { timeout: 5000 });
      }
      
      avatarInitTimeout = setTimeout(() => {
        initAvatar(retryCount + 1);
      }, retryDelay);
      
    } else {
      console.error('[AVATAR] ❌ Échec après', MAX_INIT_ATTEMPTS, 'tentatives');
      virtualHumanReady.value = false;
      avatarInitialized = false;
      
      if (isResourceBusy) {
        toast.error('Avatar occupé. Veuillez réessayer dans quelques minutes.', { timeout: 7000 });
      } else if (isStreamNotReady || isAudioNotAvailable) {
        toast.error('Problème de connexion audio. Vérifiez votre micro.', { timeout: 7000 });
      } else {
        toast.error('Impossible de charger l\'avatar. Veuillez réessayer.', { timeout: 7000 });
      }
    }
  }
};

// Watcher amélioré : attendre que WebRTC soit VRAIMENT stable
// Watcher amélioré : vérifier AUSSI le flux local (micro du client)
let initDebounceTimeout = null;

watch([currentCallStatus, remoteStream, localStream], ([status, remote, local], [oldStatus, oldRemote, oldLocal]) => {
  console.log('[AVATAR TRIGGER]', {
    status,
    hasRemoteStream: !!remote,
    hasLocalStream: !!local,
    isRemoteReady: isStreamReady(remote),
    isLocalReady: isStreamReady(local),
    isWebRTCStable: isWebRTCStable(),
    role: props.userRole,
    isVideoCall: props.isVideoCall,
    alreadyInitialized: avatarInitialized,
    isClient: props.userRole === 'client'
  });
  
  // Nettoyer les timeouts existants
  if (initDebounceTimeout) {
    clearTimeout(initDebounceTimeout);
    initDebounceTimeout = null;
  }
  
  if (avatarInitTimeout) {
    clearTimeout(avatarInitTimeout);
    avatarInitTimeout = null;
  }
  
  if (webrtcStableTimeout) {
    clearTimeout(webrtcStableTimeout);
    webrtcStableTimeout = null;
  }
  
  // ⚠️ IMPORTANT : Conditions pour initialiser (inclure le flux local)
  const shouldInitialize = 
    status === 'connected' &&
    remote &&
    local &&  // ← NOUVEAU : vérifier que le flux local existe
    isStreamReady(remote) &&
    isStreamReady(local) &&  // ← NOUVEAU : vérifier que le micro est actif
    props.isVideoCall &&
    props.userRole === 'client' &&
    !avatarInitialized;
  
  if (shouldInitialize) {
    console.log('[AVATAR] ✅ Conditions remplies (remote + local), attente stabilisation WebRTC...');
    
    // Attendre que WebRTC soit STABLE avant de lancer l'avatar
    const checkStability = () => {
      if (isWebRTCStable()) {
        console.log('[AVATAR] ✅ WebRTC stable détecté');
        
        // Attendre encore 10 secondes supplémentaires pour sécurité
        const EXTRA_DELAY = 10000;
        console.log(`[AVATAR] ⏳ Attente de sécurité de ${EXTRA_DELAY/1000}s...`);
        toast.info(`Préparation de l'avatar... (${EXTRA_DELAY/1000}s)`, { timeout: EXTRA_DELAY });
        
        initDebounceTimeout = setTimeout(() => {
          if (currentCallStatus.value === 'connected' && 
              isStreamReady(remoteStream.value) &&
              isStreamReady(localStream.value) &&  // ← Re-vérifier le flux local
              isWebRTCStable()) {
            console.log('[AVATAR] 🚀 Lancement de l\'initialisation');
            initAvatar(0);
          } else {
            console.log('[AVATAR] ⚠️ Conditions perdues après attente');
          }
        }, EXTRA_DELAY);
      } else {
        console.log('[AVATAR] ⏳ WebRTC pas encore stable, vérification dans 2s...');
        webrtcStableTimeout = setTimeout(checkStability, 2000);
      }
    };
    
    // Commencer les vérifications de stabilité
    checkStability();
    
  } else if (status === 'ended' || status === 'disconnected') {
    console.log('[AVATAR] ⚠️ Appel terminé, nettoyage');
    
    if (avatarInitTimeout) {
      clearTimeout(avatarInitTimeout);
      avatarInitTimeout = null;
    }
    
    if (initDebounceTimeout) {
      clearTimeout(initDebounceTimeout);
      initDebounceTimeout = null;
    }
    
    if (webrtcStableTimeout) {
      clearTimeout(webrtcStableTimeout);
      webrtcStableTimeout = null;
    }
    
    avatarInitialized = false;
    avatarInitAttempts = 0;
    virtualHumanReady.value = false;
    
  } else if (!shouldInitialize && !avatarInitialized) {
    const reasons = [];
    if (status !== 'connected') reasons.push(`status=${status}`);
    if (!remote) reasons.push('no_remote_stream');
    if (!local) reasons.push('no_local_stream');  // ← NOUVEAU
    if (remote && !isStreamReady(remote)) reasons.push('remote_not_ready');
    if (local && !isStreamReady(local)) reasons.push('local_not_ready');  // ← NOUVEAU
    if (!props.isVideoCall) reasons.push('not_video_call');
    if (props.userRole !== 'client') reasons.push(`role=${props.userRole}`);
    
    if (reasons.length > 0) {
      console.log('[AVATAR] ⏸️ Initialisation en attente:', reasons.join(', '));
    }
  }
}, { immediate: true });

// Nettoyage au démontage
onUnmounted(() => {
  if (initDebounceTimeout) {
    clearTimeout(initDebounceTimeout);
    initDebounceTimeout = null;
  }
  
  if (avatarInitTimeout) {
    clearTimeout(avatarInitTimeout);
    avatarInitTimeout = null;
  }
  
  if (webrtcStableTimeout) {
    clearTimeout(webrtcStableTimeout);
    webrtcStableTimeout = null;
  }
  
  avatarInitialized = false;
  avatarInitAttempts = 0;
  
  VirtualAvatarService.destroy();
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
    remoteVideo.value.onloadedmetadata = async () => {
      try {
        await remoteVideo.value.play();
      } catch (error) {
        console.warn("Failed to play remote video in watch:", error);
      }
    };
  }
});

const isScreenSharer = ref(false);

const initPeerJS = async () => {
  try {
    return new Promise((resolve, reject) => {
      peerConnection.value = new Peer(props.currentUserId, {
        debug: 2,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            {
              urls: "turn:numb.viagenie.ca",
              username: "webrtc@live.com",
              credential: "muazkh",
            },
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
          ],
        },
      });

      peerConnection.value.on("open", () => {
        resolve();
      });
      peerConnection.value.on("call", (call) => {
        // Répondre automatiquement à l'appel de partage d'écran
        call.answer();
        // Gérer le flux entrant
        call.on("stream", async (incomingStream) => {

          // Activer l'affichage et attendre que l'élément soit créé
          screenSharingActive.value = true;

          // Attendre que l'élément soit créé avec un délai maximum
          let attempts = 0;
          const maxAttempts = 10;

          while (!screenShareVideo.value && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }

          if (!screenShareVideo.value) {
            console.error(
              "Élément vidéo non trouvé après plusieurs tentatives"
            );
            return;
          }

          // Arrêter l'ancien flux s'il existe
          if (screenShareVideo.value.srcObject) {
            screenShareVideo.value.srcObject
              .getTracks()
              .forEach((track) => track.stop());
          }

          // Attacher le nouveau flux
          screenShareVideo.value.srcObject = incomingStream;

          // Forcer la lecture avec retry
          const playVideo = async () => {
            try {
              await screenShareVideo.value.play();
            } catch (error) {
              console.error("Erreur lors de la lecture:", error);
              setTimeout(playVideo, 1000);
            }
          };

          screenShareVideo.value.onloadedmetadata = () => {
            playVideo();
          };
        });
        call.on("error", (error) => {
          console.error("Erreur sur l'appel de partage d'écran:", error);
        });
      });

      peerConnection.value.on("error", (err) => {
        console.error("Erreur PeerJS:", err);
        reject(err);
      });

      // Gestion des connexions entrantes
      peerConnection.value.on("connection", (conn) => {
        remotePeerConnection.value = conn;

        conn.on("data", (data) => {
          if (data.type === "screen-share-stopped") {
            toast.info(`${props.remoteUserId} a arrêté de partager son écran`);
          }
        });
      });
    });
  } catch (error) {
    console.error("Échec de l'initialisation de PeerJS:", error);
    throw error;
  }
};

const startScreenShare = async () => {
  try {
    if (!peerConnection.value) {
      console.error("PeerJS not initialized");
      toast.error("Erreur d'initialisation pour le partage d'écran");
      await initPeerJS();
    }

    // Get screen sharing stream
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    // Afficher le flux de partage d'écran dans le nouvel élément vidéo
    if (screenShareVideo.value) {
      screenShareVideo.value.srcObject = screenStream;
    }

    // Connect to remote peer if not already connected
    if (!remotePeerConnection.value) {
      remotePeerConnection.value = peerConnection.value.connect(
        props.remoteUserId
      );

      // Wait for connection to open
      remotePeerConnection.value.on("open", () => {
        sendScreenStream(screenStream);
      });
    } else {
      sendScreenStream(screenStream);
    }

    // Handle stream ending
    screenStream.getVideoTracks()[0].onended = () => {
      stopScreenShare();
    };

    isScreenSharer.value = true;
    screenSharingActive.value = true;

    // Notify via socket
    props.socket.emit("screen-share-started", {
      from: props.currentUserId,
      to: props.remoteUserId,
    });

    toast.success("Partage d'écran démarré");
  } catch (error) {
    console.error("Erreur lors du partage d'écran:", error);
    toast.error("Impossible de partager l'écran. Veuillez réessayer.");
  }
};

const screenShareCall = ref(null);

const stopScreenShare = async () => {
  try {
    // Arrêter le partage d'écran
    if (screenShareVideo.value && screenShareVideo.value.srcObject) {
      screenShareVideo.value.srcObject
        .getTracks()
        .forEach((track) => track.stop());
      screenShareVideo.value.srcObject = null;
    }

    // Fermer l'appel de partage d'écran
    if (screenShareCall.value) {
      screenShareCall.value.close();
      screenShareCall.value = null;
    }
    isScreenSharer.value = false;
    screenSharingActive.value = false;

    await nextTick();

    // Notify remote peer
    if (remotePeerConnection.value && remotePeerConnection.value.open) {
      remotePeerConnection.value.send({
        type: "screen-share-stopped",
        from: props.currentUserId,
      });
    }

    // Notify via socket
    props.socket.emit("screen-share-stopped", {
      from: props.currentUserId,
      to: props.remoteUserId,
    });
    screenSharingActive.value = false;
    isScreenSharer.value = null;
    toast.info("Partage d'écran arrêté");
  } catch (error) {
    console.error("Erreur lors de l'arrêt du partage d'écran:", error);
    toast.error("Erreur lors de l'arrêt du partage d'écran");
  }
};

const sendScreenStream = (screenStream) => {
  try {
    if (!props.remoteUserId) {
      throw new Error("ID du pair distant non défini");
    }

    // Créer l'appel avec le flux d'écran
    const call = peerConnection.value.call(props.remoteUserId, screenStream, {
      metadata: { type: "screen-share" },
      sdpTransform: (sdp) => {
        // Forcer une meilleure qualité vidéo
        return sdp.replace(
          "useinbandfec=1",
          "useinbandfec=1;stereo=1;maxaveragebitrate=510000"
        );
      },
    });

    call.on("error", (err) => {
      console.error("Erreur lors de l'appel de partage d'écran:", err);
      toast.error("Erreur lors du partage d'écran");
    });

    call.on("stream", (remoteStream) => {
    });

    // Sauvegarder l'appel pour pouvoir le fermer plus tard
    screenShareCall.value = call;

    // Notification via data connection
    if (remotePeerConnection.value && remotePeerConnection.value.open) {
      remotePeerConnection.value.send({
        type: "screen-share-started",
        from: props.currentUserId,
      });
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi du flux de partage d'écran:", error);
    toast.error("Erreur lors du partage d'écran");
  }
};

/**
 *  tente d'obtenir le média local (audio et/ou vidéo) et de démarrer l'appel une fois la configuration terminée.
 */
const acceptCall = async () => {
  try {
    // Obtenir le flux local
    const result = await WebRTCService.getLocalMedia(localIsVideoCall.value);
    if (!result.success) {
      throw result.error;
    }

    // Sauvegarder et afficher le flux local
    localStream.value = result.stream;
    if (localVideo.value) {
      localVideo.value.srcObject = result.stream;
    }

    // Accepter l'appel et envoyer notre flux local
    await WebRTCService.acceptCall(result.stream);

    // Mettre à jour le statut
    currentCallStatus.value = "connected";
    emit(
      "call-status-change",
      "connected",
      props.remoteUserId,
      localIsVideoCall.value
    );

    // Configurer la gestion du flux distant
    WebRTCService.onRemoteStream((remoteStream) => {
      if (remoteVideo.value) {
        remoteVideo.value.srcObject = remoteStream;
        remoteStream.value = remoteStream;
      }
    });
  } catch (error) {
    console.error("Failed to accept call:", error);
    emit("call-ended");
  }
};

// fonction pour nettoyer les états
const cleanupCallState = () => {
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
  if (peerConnection.value) {
    peerConnection.value.destroy();
    peerConnection.value = null;
  }
});

/**
 *  bascule l'état de l'audio et notifie le service WebRTC.
 */
const toggleMute = () => {
  isMuted.value = !isMuted.value;
  WebRTCService.toggleAudio(
    isMuted.value,
    props.remoteUserId,
    props.currentUserId
  );
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
.play-video-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  padding: 20px;
  font-size: 12px;
  transition: all 0.3s ease;
}

.play-video-button:hover {
  background-color: rgba(0, 0, 0, 0.9);
  transform: translate(-50%, -50%) scale(1.1);
}

.play-video-button svg {
  margin-bottom: 5px;
}

.play-video-button span {
  font-size: 10px;
  text-align: center;
  max-width: 100px;
}
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

.screen-share-video {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;
  object-fit: contain;
  border-radius: 12px;
  /* z-index: 100; */
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
.call-status {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.status-message {
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 1.2rem;
}

.agent-avatar-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.agent-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.agent-avatar-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  padding: 80px;
}

/* Le SDK ajoutera automatiquement un canvas ici */
.agent-avatar-container canvas {
  max-width: 50% !important;
  max-height: 95% !important;
  width: auto !important;
  height: 100% !important;
  object-fit: contain !important;
  margin: auto;
  border-radius: 24px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.7);
}

/* Iframe isolé pour l'avatar */
.avatar-iframe {
  width: 100%;
  height: 100%;
  border: none;
  position: absolute;
  top: 0;
  left: 0;
  background: #000;
}
</style>
