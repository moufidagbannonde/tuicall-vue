<template>
  <div v-if="isVisible" class="modal-overlay">
    <div class="modal-content">
      <h3>Confirmation</h3>
      <p>Voulez-vous vraiment supprimer ce message ?</p>
      <div class="btns">
        <button class="confirm" @click="confirm">Confirmer</button>
        <button class="cancel" @click="cancel">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue';

const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const confirm = () => {
  emit('confirm');
};

const cancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
}
.modal-content {
  background: #ffffff;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  width: 350px;
}
button.confirm {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}
button.confirm:hover {
  background-color: #218838;
}
button.cancel {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}
button.cancel:hover {
  background-color: #5a6268;
}
.btns{
  display: flex;
  /* justify-content: space-between; */
  align-items: center;
  justify-content: center;
  gap: 10px;
}
</style>
