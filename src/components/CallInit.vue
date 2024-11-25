<template>
  <div class="bg-white bg-opacity-90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md 
    transform transition-all duration-300 hover:shadow-3xl border border-gray-100">

    <!-- En-tête -->
    <div class="mb-6 text-center">
      <h2 class="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        Initialisation
      </h2>
    </div>

    <!-- Input et icône -->
    <div class="relative mb-6">
      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <input v-model="callerUserID" placeholder="Entrer ou créer votre identifiant" class="w-full pl-11 px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl
          focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:bg-white
          transition-all duration-300 ease-in-out
          text-gray-700 placeholder-gray-400
          hover:border-gray-300" />
    </div>

    <!-- Bouton d'initialisation -->
    <button @click="initUser" class="group relative w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600
        rounded-xl font-bold text-white shadow-lg overflow-hidden
        hover:from-blue-600 hover:to-indigo-700
        transform hover:-translate-y-1 transition-all duration-300
        focus:outline-none focus:ring-4 focus:ring-blue-200">
      <div class="relative flex items-center justify-center space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 transform group-hover:rotate-180 transition-transform duration-500" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>Initialiser</span>
      </div>


      <div class="absolute inset-0 h-full w-full bg-white/30 group-hover:scale-100 scale-0 
        transition-transform duration-500 origin-center rounded-xl">
      </div>
    </button>


  </div>
</template>

<script setup>
import { ref } from 'vue';

// props à recevoir du composant parent
const props = defineProps({
  onInit: Function
});

// variable pour l'identifiant de l'appelant
const callerUserID = ref('');

// méthode pour initialiser l'appelant
const initUser = () => {
  props.onInit(callerUserID.value);
};
</script>
