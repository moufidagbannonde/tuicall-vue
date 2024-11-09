<template>
  <div class="container mx-auto p-8 bg-gray-50 min-h-screen flex flex-col items-center">
    <h1 class="text-4xl font-extrabold text-center mb-8 text-gray-800 tracking-wide">Call Application</h1>

    <!-- Composants d'initialisation et de contrôle d'appel -->
    <div class="w-full max-w-lg bg-white p-6 rounded-lg shadow-lg mb-8">
      <CallInit :onInit="init" />
      <CallControls :onCall="call" />
    </div>

    <!-- Bouton pour afficher le formulaire d'appel de groupe -->
    <button @click="showGroupCallForm = true" 
            class="w-full bg-blue-600 text-white font-semibold rounded-lg py-3 hover:bg-blue-700 shadow-md transition duration-200 ease-in-out">
      Start Group Call
    </button>

    <!-- Formulaire d'appel en groupe -->
    <div v-if="showGroupCallForm" class="group-call-container mt-8 w-full max-w-lg bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
      <input v-model="calleeUserIDs" placeholder="Enter comma-separated User IDs for group call" class="w-full p-2 mb-4 border rounded-lg" />
      
      <!-- Bouton pour démarrer l'appel en groupe -->
      <button @click="handleStartGroupCall" class="w-full bg-blue-600 text-white font-semibold rounded-lg py-3 hover:bg-blue-700 shadow-md transition duration-200 ease-in-out">
        Start Group Call
      </button>

      <!-- Bouton pour annuler l'appel de groupe -->
      <button @click="cancelGroupCall" class="w-full bg-gray-600 text-white font-semibold rounded-lg py-3 hover:bg-gray-700 shadow-md transition duration-200 ease-in-out">
        Cancel
      </button>
    </div>

    <!-- Affichage des toasts -->
    <Toast />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useToast  } from 'primevue/toast';
import CallInit from './components/CallInit.vue';
import CallControls from './components/CallControls.vue';

const showGroupCallForm = ref(false);
const calleeUserIDs = ref('');
const toast = useToast(); // Utilisation du ToastService

// Fonction pour afficher un toast
const showToast = (message, severity = 'info') => {
  toast.add({ severity, summary: 'Info', detail: message, life: 3000 });
};

// Initialisation de l'appelant
const init = (callerUserID) => {
  if (!callerUserID) {
    showToast('Veuillez entrer un utilisateur ID valide!', 'error');
  } else {
    showToast('TUICallKit initialisé avec succès !', 'success');
  }
};

// Fonction d'appel
const call = (calleeUserID, callType) => {
  if (!calleeUserID) {
    showToast('Veuillez entrer l\'identifiant de l\'appelé', 'error');
  } else {
    showToast('Appel en cours...', 'success');
  }
};

// Démarrer un appel en groupe
async function handleStartGroupCall() {
  if (!calleeUserIDs.value) {
    showToast('Veuillez entrer des IDs d\'utilisateurs pour l\'appel de groupe.', 'error');
    return;
  }
  showToast('Appel de groupe démarré.', 'success');
}

// Annuler l'appel de groupe
const cancelGroupCall = () => {
  showToast('Appel de groupe annulé.', 'warn');
  showGroupCallForm.value = false;
  calleeUserIDs.value = '';  // Réinitialiser les IDs des utilisateurs
};
</script>

<style scoped>
.container {
  text-align: center;
}

.group-call-container {
  margin-top: 20px;
}

.group-call-container input {
  margin-bottom: 10px;
}
</style>
