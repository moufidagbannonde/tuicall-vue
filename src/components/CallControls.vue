<template>
    <div>
      <input v-model="calleeUserID" placeholder="Entrez l'ID de l'appelé" />
      <button @click="makeCall(1)">Appel Audio</button>
      <button @click="makeCall(2)">Appel Vidéo</button>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  // Déclarez les props qui vont être reçues par le composant parent
  const props = defineProps({
    onCall: Function
  });
  
  const calleeUserID = ref('');
  
  // Méthode pour effectuer l'appel
  const makeCall = (callType) => {
    props.onCall(calleeUserID.value, callType);
  };
  </script>
  