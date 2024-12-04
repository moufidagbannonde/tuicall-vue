<template>
  <div v-if="isVisible" class="dialog-overlay">
    <div class="dialog">
      <p>{{ message }}</p>
      <div class="dialog-actions">
        <button @click="confirm">Confirmer</button>
        <button @click="cancel">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue';

const props = defineProps<{
  message: string;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const isVisible = ref(props.visible);

const confirm = () => {
  emit('confirm');
  isVisible.value = false;
};

const cancel = () => {
  emit('cancel');
  isVisible.value = false;
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.dialog {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.dialog-actions {
  display: flex;
  justify-content: space-between;
}
</style>
