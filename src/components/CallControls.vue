<template>
  <div class="bg-white p-6 rounded-lg shadow-md w-full max-w-md flex flex-col items-center space-y-4">
    <input
      v-model="calleeUserID"
      placeholder="Entrez l'ID de l'appelé"
      class="border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-200"
    />
    <div class="flex space-x-4 w-full">
      <button
        @click="makeCall(1)"
        class="bg-green-500 text-white font-semibold rounded-lg py-2 w-full hover:bg-green-600 shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1"
      >
        Appel Audio
      </button>
      <button
        @click="makeCall(2)"
        class="bg-blue-600 text-white font-semibold rounded-lg py-2 w-full hover:bg-blue-700 shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1"
      >
        Appel Vidéo
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  onCall: Function
});

const calleeUserID = ref('');

const makeCall = (callType) => {
  props.onCall(calleeUserID.value, callType);
};
</script>
