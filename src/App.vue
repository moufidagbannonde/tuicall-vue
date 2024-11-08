<template>
  <div class="container">
    <h1>Call Application</h1>

    <!-- Composants d'initialisation et de contrôle d'appel -->
    <CallInit :onInit="init" />
    <CallControls :onCall="call" />

    <!-- TUICallKit Component -->
    <div class="TUICallKit">
      <TUICallKit v-if="isCalleeInitialized" />
    </div>

    <!-- Champs pour entrer les utilisateurs pour un appel en groupe -->
    <div>
      <input v-model="calleeUserIDs" type="text" placeholder="Enter comma-separated User IDs for group call" />
      <button @click="startGroupCall">Start Group Call</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { TUICallKit, TUICallKitServer, TUICallType } from '@tencentcloud/call-uikit-vue';
import CallInit from './components/CallInit.vue'; // Assurez-vous de créer ce composant
import CallControls from './components/CallControls.vue'; // Assurez-vous de créer ce composant
import * as GenerateTestUserSig from './debug/GenerateTestUserSig-es';

const SDKAppID = 20013712;
const SDKSecretKey = "459dcede1cc23bdcb8b3dcf4e61dfd054794411eb7cb5c5827b85f73d98821bd";
const isCalleeInitialized = ref(false); // L'état d'initialisation de l'appelé
const calleeUserIDs = ref(""); // Utilisateurs pour l'appel en groupe (sous forme d'IDs séparés par des virgules)

const init = async (callerUserID) => {
  if (!callerUserID) {
    alert("Veuillez entrer un utilisateur ID valide!");
  } else {
    const { userSig } = GenerateTestUserSig.genTestUserSig({
      userID: callerUserID,
      SDKAppID,
      SecretKey: SDKSecretKey
    });

    await TUICallKitServer.init({
      userID: callerUserID,
      userSig,
      SDKAppID
    });
    alert("TUICallKit initialisé avec succès !");
    isCalleeInitialized.value = true; // Marquer l'appelant comme initialisé
  }
};

// Démarrer l'appel de groupe
const startGroupCall = async () => {
  // Vérifier si des IDs sont entrés
  if (!calleeUserIDs.value) {
    alert("Veuillez entrer des IDs d'utilisateur pour l'appel en groupe.");
    return;
  }

  // Séparer les IDs d'utilisateur par des virgules et les transformer en tableau
  const userIDs = calleeUserIDs.value.split(',').map(id => id.trim()).filter(id => id !== "");

  if (userIDs.length === 0) {
    alert("Veuillez entrer des IDs valides.");
    return;
  }

  // Générer un groupID unique (horodatage)
  const groupID = "group-" + Date.now(); // ID de groupe basé sur l'horodatage, simple mais unique
  const callType = TUICallType.VIDEO_CALL; // Type d'appel, ici vidéo

  // Appeler la fonction groupCall avec les paramètres appropriés
  await groupCall(groupID, callType, userIDs);
};

// Fonction de groupe d'appel
const groupCall = async (groupID, callType, userIDs) => {
  try {
    // Vérifiez si les ID des utilisateurs sont valides
    if (!userIDs || userIDs.length === 0) {
      throw new Error("Aucun utilisateur sélectionné pour l'appel.");
    }

    // Appel API avec groupID valide
    await TUICallKitServer.groupCall({
      userIDList: userIDs,  // Liste dynamique des utilisateurs
      groupID: groupID,     // ID du groupe, généré dynamiquement
      type: callType        // Type d'appel (vidéo ou audio)
    });
    alert("Appel de groupe en cours...");
  } catch (error) {
    console.error("L'appel vidéo de groupe a échoué !", error);
    alert("Erreur lors de l'appel de groupe : " + error.message);
  }
};
</script>

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
</style>
