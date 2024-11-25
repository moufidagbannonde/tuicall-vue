<template>
  <div class="bg-white bg-opacity-90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md 
    flex flex-col items-center space-y-6 transform transition-all duration-300 hover:shadow-3xl">
    
    <!-- Input et icône -->
    <div class="relative w-full">
      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
        </svg>
      </div>
      <input
        v-model="calleeUserID"
        placeholder="Entrez l'identifiant de l'appelé"
        class="pl-11 w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl
          focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:bg-white
          transition-all duration-300 ease-in-out
          text-gray-700 placeholder-gray-400
          hover:border-gray-300"
      />
    </div>

    <!-- Boutons d'appel -->
    <div class="flex flex-col sm:flex-row gap-4 w-full">
      <!-- appel audio -->
      <button
        @click="makeCall(1)"
        class="group relative flex-1 px-6 py-4 bg-gradient-to-r from-green-400 to-emerald-500
          rounded-xl font-bold text-white shadow-lg
          hover:from-green-500 hover:to-emerald-600
          transform hover:-translate-y-1 transition-all duration-300
          focus:outline-none focus:ring-4 focus:ring-green-200">
        <div class="flex items-center justify-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" 
            class="h-5 w-5 transform group-hover:scale-110 transition-transform duration-300" 
            viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          <span>Appel Audio</span>
        </div>
      </button>

      <!-- appel vidéo -->
      <button
        @click="makeCall(2)"
        class="group relative flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600
          rounded-xl font-bold text-white shadow-lg
          hover:from-blue-600 hover:to-indigo-700
          transform hover:-translate-y-1 transition-all duration-300
          focus:outline-none focus:ring-4 focus:ring-blue-200">
        <div class="flex items-center justify-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" 
            class="h-5 w-5 transform group-hover:scale-110 transition-transform duration-300" 
            viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
          <span>Appel Vidéo</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// props à recevoir du composant parent
const props = defineProps({
  onCall: Function
});

// variable pour l'identifiant de l'appelé
const calleeUserID = ref('');

// méthode pour l'appel
const makeCall = (callType) => {
  props.onCall(calleeUserID.value, callType);
};
</script>
<style scoped>
@import '../assets/callcontrols.css';
</style>