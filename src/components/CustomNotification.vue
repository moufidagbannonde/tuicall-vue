<template>
  <div v-if="visible" :class="['notification', type, animationClass]" @click="close">
    {{ message }}
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

 const props = defineProps({
  message: String,
  type: {
    type: String,
    default: 'info', // info, success, error, etc.
  },
});

const visible = ref(true);
const animationClass = ref('notification-enter'); // Classe d'animation

const close = () => {
  animationClass.value = 'notification-leave'; // Déclenche l'animation de sortie
  setTimeout(() => {
    visible.value = false; // Masquer après l'animation
  }, 400); // Correspond à la durée de l'animation de sortie
};

// Réinitialiser l'animation lorsque la notification est affichée
watch(visible, (newValue) => {
  if (newValue) {
    animationClass.value = 'notification-enter'; // Réinitialiser l'animation d'entrée
  }
});
</script>

<style scoped>
.notification {
  position: fixed;
  top: 20px;
  left: 20px; 
  transform: translateX(-50%); 
  padding: 15px 20px; 
  width: 90%; 
  max-width: 500px; 
  border-radius: 8px;
  margin: 10px 0;
  cursor: pointer;
  z-index: 1000; 
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
  opacity: 0;
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.notification.info {
  background-color: #084298;
  color: white;
}
.notification.success {
  background-color: #4CAF50;
  color: white;
}
.notification.error {
  background-color: red;
  color: white;
}

@keyframes slideIn {
  0% {
    opacity: 0;
    transform: translateY(-20px); /* Départ légèrement en haut */
  }
  100% {
    opacity: 1;
    transform: translateY(0); /* Position finale */
  }
}

@keyframes slideOut {
  0% {
    opacity: 1;
    transform: translateY(0); /* Position initiale */
  }
  100% {
    opacity: 0;
    transform: translateY(-20px); /* Sortie légèrement vers le haut */
  }
}

.notification-enter {
  animation: slideIn 0.4s ease-out forwards; /* Animation d'entrée */
}

.notification-leave {
  animation: slideOut 0.4s ease-in forwards; /* Animation de sortie */
}
</style> 