<template>
    <div>
      <input v-model="callerUserID" placeholder="Entrez votre ID utilisateur" />
      <button @click="initUser">Initialiser</button>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  // Déclarez les props qui vont être reçues par le composant parent
  const props = defineProps({
    onInit: Function
  });
  
  const callerUserID = ref('');
  
  // Méthode pour initialiser l'utilisateur
  const initUser = () => {
    props.onInit(callerUserID.value);
  };
  </script>
  