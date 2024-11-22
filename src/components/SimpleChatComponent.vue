<template>
  <div class="flex flex-col h-full">
    <!-- En-tête -->
    <div class="p-4 border-b">
      <h2 class="text-lg font-bold">Chat</h2>
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-for="message in messages" :key="message.id"
        :class="[
          'max-w-[80%] rounded-lg p-3',
          message.sender === currentUser 
            ? 'ml-auto bg-blue-500 text-white' 
            : 'bg-gray-100'
        ]"
      >
        <div class="text-sm font-bold">{{ message.sender }}</div>
        <div>{{ message.content }}</div>
      </div>
    </div>

    <!-- Input -->
    <div class="p-4 border-t">
      <form @submit.prevent="sendMessage" class="flex gap-2">
        <input 
          v-model="newMessage" 
          type="text" 
          placeholder="Votre message..."
          class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
        <button 
          type="submit"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Envoyer
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  messages: Array,
  currentUser: String
});

const emit = defineEmits(['send-message']);
const newMessage = ref('');

const sendMessage = () => {
  if (newMessage.value.trim()) {
    emit('send-message', newMessage.value);
    newMessage.value = '';
  }
};
</script> 