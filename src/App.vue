<template>
  <div class="container mx-auto p-8 bg-gray-50 min-h-screen flex flex-col items-center">
    <h1 class="text-4xl font-extrabold text-center mb-8 text-gray-800 tracking-wide">Call Application</h1>

    <!-- Composants d'initialisation et de contrôle d'appel -->
    <div class="w-full max-w-lg bg-white p-6 rounded-lg shadow-lg mb-8">
      <CallInit :onInit="init" />
      <CallControls :onCall="call" />
    </div>

    <!-- Bouton pour afficher le formulaire d'appel de groupe -->
    <button v-if="!showGroupCallForm" @click="showGroupCallForm = true" 
            class="w-full bg-blue-600 text-white font-semibold rounded-lg py-3 hover:bg-blue-700 shadow-md transition duration-200 ease-in-out">
      Start Group Call
    </button>

    <!-- Champs pour entrer les utilisateurs pour un appel en groupe (affiché après le clic sur le bouton) -->
    <div v-if="showGroupCallForm" class="group-call-container mt-8 w-full max-w-lg bg-white p-6 rounded-lg shadow-lg flex flex-col items-center transition-all duration-500 ease-in-out transform">
      <input v-model="calleeUserIDs" type="text" placeholder="Enter comma-separated User IDs for group call"
        class="border border-gray-300 rounded-lg p-3 w-full focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-200" />
      
      <!-- Bouton pour démarrer l'appel en groupe -->
      <button @click="handleStartGroupCall"
        class="mt-4 w-full bg-blue-600 text-white font-semibold rounded-lg py-3 hover:bg-blue-700 shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1">
        Start Group Call
      </button>
      
      <!-- Bouton pour annuler l'appel de groupe et revenir en arrière -->
      <button @click="cancelGroupCall"
        class="mt-4 w-full bg-gray-600 text-white font-semibold rounded-lg py-3 hover:bg-gray-700 shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1">
        Cancel
      </button>
    </div>

    <!-- TUICallKit Component -->
    <div class="TUICallKit w-full flex justify-center items-center mt-8">
      <TUICallKit v-if="isCalleeInitialized" class="w-full bg-white bg-opacity-80 rounded-xl shadow-xl transition-all duration-500 ease-in-out transform hover:scale-105
               h-80 md:h-[28rem] lg:h-[35rem] xl:h-[48rem] max-w-sm md:max-w-4xl lg:max-w-5xl xl:max-w-6xl" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { TUICallKit, TUICallKitServer, TUICallType } from '@tencentcloud/call-uikit-vue';
import CallInit from './components/CallInit.vue';
import CallControls from './components/CallControls.vue';
import * as GenerateTestUserSig from './debug/GenerateTestUserSig-es';
import Chat from "@tencentcloud/chat";

// Constantes et variables réactives
const SDKAppID = 20013712;
const SDKSecretKey = "459dcede1cc23bdcb8b3dcf4e61dfd054794411eb7cb5c5827b85f73d98821bd";
const isCalleeInitialized = ref(false);
const isCallStarted = ref(false);  // Variable qui indique si l'appel a commencé
const calleeUserIDs = ref(''); // IDs d'utilisateurs pour l'appel de groupe, séparés par des virgules
const groupID = ref(''); // Stockage dynamique du groupID généré
const selectedCallType = ref(TUICallType.VIDEO_CALL); // Par défaut, l'appel de groupe est un appel vidéo
const showGroupCallForm = ref(false); // Variable qui contrôle l'affichage du formulaire d'appel de groupe

// Initialisation de l'appelant
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
    isCalleeInitialized.value = true;
  }
};

// Fonction d'appel
const call = async (calleeUserID, callType) => {
  if (!calleeUserID) {
    alert("Veuillez entrer l'identifiant de l'appelé");
  } else if (!isCalleeInitialized.value) {
    alert("L'utilisateur appelé n'a pas encore initialisé TUICallKit.");
  } else {
    await TUICallKitServer.call({
      userID: calleeUserID,
      type: callType
    });
    alert("Appel en cours...");
    isCallStarted.value = true;  // L'appel a commencé, donc afficher le formulaire d'appel de groupe
  }
};

// Créer un groupe d'utilisateurs
async function createGroupID() {
  const chat = Chat.create({ SDKAppID });
  const userIDList = calleeUserIDs.value.split(',').map(id => id.trim()).filter(id => id); // Convertir la liste d'IDs en tableau
  const memberList = userIDList.map(userID => ({ userID }));

  const res = await chat.createGroup({
    type: Chat.TYPES.GRP_PUBLIC,
    name: "WebSDK",
    memberList
  });

  groupID.value = res.data.group.groupID; // Stocker le groupID généré
  return groupID.value;
}

// Démarrer un appel en groupe
async function startGroupCall(callType) {
  if (!groupID.value) {
    console.error("Erreur : Aucun groupID trouvé. Impossible de démarrer l'appel de groupe.");
    return;
  }

  try {
    const userIDList = calleeUserIDs.value.split(',').map(id => id.trim()).filter(id => id);
    if (userIDList.length === 0) {
      alert("Veuillez entrer au moins un utilisateur ID pour l'appel de groupe.");
      return;
    }

    await TUICallKitServer.groupCall({
      userIDList,
      groupID: groupID.value,
      type: callType
    });
    alert("Appel de groupe en cours...");

  } catch (error) {
    console.error(`[TUICallKit] Échec de l'appel de groupe, Raison : ${error}`);
  }
}

// Gérer le démarrage de l'appel en groupe
async function handleStartGroupCall() {
  try {
    await createGroupID(); // Générer le groupID avant de lancer l'appel
    await startGroupCall(selectedCallType.value); // Lancer l'appel de groupe avec le groupID généré
  } catch (error) {
    console.error("Erreur lors de la création de l'ID de groupe ou de l'appel de groupe :", error);
  }
}

// Fonction pour annuler l'appel de groupe et fermer le formulaire
const cancelGroupCall = () => {
  showGroupCallForm.value = false;  // Fermer le formulaire d'appel de groupe
  calleeUserIDs.value = '';  // Réinitialiser les IDs des utilisateurs
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

/* Transition pour déplacer la section du groupe d'appel en bas après le lancement de l'appel */
.group-call-container {
  transition: transform 0.5s ease-in-out;
  margin-top: 20px; 
}

.group-call-container.v-enter-active, .group-call-container.v-leave-active {
  transition: transform 0.5s ease-in-out;
}

.group-call-container.v-enter, .group-call-container.v-leave-to {
  transform: translateY(50px); /* Le formulaire est décalé vers le bas uniquement après le lancement de l'appel */
}
</style>