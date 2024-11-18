<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"></div>
    
    <!-- Modal  -->
    <div class="relative bg-white/95 rounded-2xl shadow-2xl p-8 max-w-md w-full m-4 
                transform transition-all duration-300 animate-slideIn
                border border-gray-100">
      <h3 class="text-xl font-bold text-gray-800 mb-4">{{ title }}</h3>
      <p class="text-gray-600 mb-8 leading-relaxed">{{ message }}</p>
      
      <div class="flex justify-end space-x-4">
        <button @click="onCancel" 
          class="px-6 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 
                 transition-all duration-200 hover:shadow-md">
          {{ cancelText }}
        </button>
        <button @click="onConfirm"
          class="px-6 py-2.5 rounded-lg bg-blue-600 text-white
                 hover:bg-blue-700 transition-all duration-200 
                 hover:shadow-lg hover:scale-105">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// définition des données à recevoir du composant parent App.vue
defineProps({
  isOpen: Boolean,
  title: String,
  message: String,
  confirmText: {
    type: String,
    default: 'Confirmer'
  },
  cancelText: {
    type: String,
    default: 'Annuler'
  }
});
// définition des événements à émettre au composant parent App.vue
const emit = defineEmits(['confirm', 'cancel']);
const onConfirm = () => emit('confirm');
const onCancel = () => emit('cancel');
</script>

<style scoped>

</style>