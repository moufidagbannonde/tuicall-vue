<template>
    <div class="uk-container">
        <div class="uk-card uk-card-default uk-card-body chat-container">
            <!-- Indicateur de statut d'appel -->
            <div class="uk-alert"
                :class="{ 'uk-alert-success': props.callActive, 'uk-alert-warning': !props.callActive }">
                {{ props.callActive ? 'Appel en cours' : 'Appel déconnecté' }}
            </div>
            <!-- Zone des messages -->
            <div class="messages-area uk-margin" ref="messagesContainer">
                <div v-for="(message, index) in messages" :key="index"
                    :class="['uk-margin-small', message.isMe ? 'my-message' : 'other-message']">
                    <div class="uk-card uk-card-primary uk-card-small uk-card-body">
                        <p class="uk-margin-remove">{{ message.text }}</p>
                        <small class="uk-text-muted">{{ message.time }}</small>
                    </div>
                </div>
            </div>

            <!-- Zone de saisie de message-->
            <div class="uk-margin">
                <div class="uk-inline uk-width-1-1">
                    <input v-model="newMessage" @keyup.enter="sendMessage" class="uk-input" type="text"
                        placeholder="Écrivez votre message...">
                    <button @click="sendMessage" class="uk-button uk-button-primary">
                        Envoyer
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
// import des fonctions de vue
import { ref, nextTick, onMounted } from 'vue'

// interface pour les messages
interface Message {
    text: string
    time: string
    isMe: boolean
}

//  props pour recevoir les messages externes
const props = defineProps<{
    callActive: boolean
}>()

// Ajout des émetteurs d'événements
const emit = defineEmits<{
    (e: 'message-sent', message: string): void
}>()

const messages = ref<Message[]>([])
const newMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

const sendMessage = () => {
    if (!props.callActive) {
        alert('Impossible d\'envoyer un message : appel non actif')
        return
    }
    if (newMessage.value.trim()) {
        // Création du message local
        messages.value.push({
            text: newMessage.value,
            time: new Date().toLocaleTimeString(),
            isMe: true
        })

        // Émission du message vers le composant parent
        emit('message-sent', newMessage.value)

        newMessage.value = ''
        nextTick(() => {
            scrollToBottom()
        })
    }
}

// Ajout d'une méthode pour recevoir les messages externes
const receiveMessage = (text: string) => {
    messages.value.push({
        text,
        time: new Date().toLocaleTimeString(),
        isMe: false
    })
    nextTick(() => {
        scrollToBottom()
    })
}

const scrollToBottom = () => {
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
}

// Exposer la méthode receiveMessage pour le composant parent
defineExpose({
    receiveMessage
})

</script>
<style scoped>
.chat-container {
    max-width: 800px;
    margin: 0 auto;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    height: 600px;
}

.messages-area {
    height: 400px;
    overflow-y: auto;
    padding: 20px;
    background-color: #f9fafc;
    border-radius: 8px;
    margin: 15px 0;
    display: flex;
    flex-direction: column;
}

.my-message {
    display: flex;
    justify-content: flex-end;
    width: 100%;
}

.other-message {
    display: flex;
    justify-content: flex-start;
    width: 100%;
}

.my-message .uk-card {
    background-color: #1e87f0;
    color: white;
    display: inline-block;
    max-width: 70%;
    border-radius: 12px 12px 2px 12px;
    margin-left: auto;
    box-shadow: 0 2px 4px rgba(30, 135, 240, 0.2);
}

.other-message .uk-card {
    background-color: #ffffff;
    display: inline-block;
    max-width: 70%;
    border-radius: 12px 12px 12px 2px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.uk-alert {
    margin-bottom: 15px;
    text-align: center;
    border-radius: 8px;
    font-weight: 500;
}

.uk-input {
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    padding: 12px;
}

.uk-button-primary {
    border-radius: 8px;
    padding: 0 20px;
    margin-left: 8px;
    transition: all 0.2s ease;
}

.uk-button-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(30, 135, 240, 0.3);
}

/* Style pour la barre de défilement */
.messages-area::-webkit-scrollbar {
    width: 6px;
}

.messages-area::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

.uk-margin {
    margin-top: auto;
    padding: 15px;
}

.chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.messages-area {
    flex: 1;
    overflow-y: auto;
    /* Permet de faire défiler les messages si nécessaire */
    margin-bottom: 16px;
    /* Espace entre les messages et l'input */
}

.my-message {
    margin-top: 8px;
    /* Espace entre les messages envoyés */
    text-align: right;
    /* Alignement à droite pour mes messages */
}

.other-message {
    margin-top: 8px;
    /* Espace entre les messages reçus */
    text-align: left;
    /* Alignement à gauche pour les autres messages */
}

.uk-card {
    display: inline-block;
    /* Permet de mieux contrôler l'alignement des cartes */
}

.uk-inline {
    margin-top: auto;
    /* Pousse le champ de saisie en bas du container */
}
</style>