<template>
  <div class="bg-white p-6 rounded-lg shadow-md w-full max-w-md flex flex-col items-center">
    <input
      v-model="callerUserID"
      placeholder="Entrez votre ID utilisateur"
      class="border border-gray-300 rounded-lg p-3 w-full mb-4 focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-200"
    />
    <button
      @click="initUser"
      class="bg-blue-600 text-white font-semibold rounded-lg py-2 w-full hover:bg-blue-700 shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1"
    >
      Initialiser
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  onInit: Function
});

const callerUserID = ref('');

const initUser = () => {
  props.onInit(callerUserID.value);
};
</script>
