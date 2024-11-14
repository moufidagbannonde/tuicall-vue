<template>
    <div>
      <button @click="shareScreen">Partager l'écran</button>
      <button @click="stopScreenSharing">Arrêter le partage d'écran</button>
      <div v-if="screenShared">
        <p>Partage d'écran en cours...</p>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { TRTCCloud } from 'trtc-js-sdk'; // Assurez-vous d'importer correctement le SDK
  
  // Références pour stocker l'état
  const screenStream = ref(null);
  const screenShared = ref(false);
  let trtcCloud = null;
  
  // Initialisation du TRTCCloud lorsque le composant est monté
  onMounted(() => {
  // Vérification de l'importation de TRTCCloud
  if (TRTCCloud) {
    try {
      trtcCloud = TRTCCloud.sharedInstance();
      console.log("TRTCCloud initialisé correctement", trtcCloud);
    } catch (error) {
      console.error("Erreur lors de l'initialisation de TRTCCloud:", error);
    }
  } else {
    console.error("TRTCCloud n'est pas disponible.");
  }
});
  
// Fonction pour démarrer le partage d'écran
  const shareScreen = async () => {
    // Vérification que trtcCloud est bien initialisé avant d'essayer de partager l'écran
    if (!trtcCloud) {
      console.error("TRTCCloud n'est pas disponible. Impossible de démarrer le partage d'écran.");
      return;
    }
  
    try {
      // Demander à l'utilisateur de partager son écran
      screenStream.value = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: "screen",
        },
      });
  
      // Démarrer le partage d'écran dans TRTC
      trtcCloud.startScreenCapture(screenStream.value);
      screenShared.value = true;
      console.log("Partage d'écran démarré.");
    } catch (err) {
      console.error("Erreur lors de la capture d'écran:", err);
      screenShared.value = false;
    }
  };
  
  // Fonction pour arrêter le partage d'écran
  const stopScreenSharing = () => {
    if (screenStream.value) {
      // Arrêter le partage d'écran et arrêter les pistes
      trtcCloud.stopScreenCapture();
      screenStream.value.getTracks().forEach(track => track.stop());
      screenShared.value = false;
      console.log("Partage d'écran arrêté.");
    }
  };
  </script>
  
  <style scoped>
  /* Styles pour personnaliser l'apparence */
  button {
    margin: 10px;
  }
  </style>
  