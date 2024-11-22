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
                    :class="['message', message.isMe ? 'my-message' : 'other-message']">
                    <div class="message-bubble">
                        <p class="uk-margin-remove">{{ message.text }}</p>
                        <p class="uk-text-muted">{{ message.time }}</p>
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
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from 'vue-toastification';
import { io } from 'socket.io-client';

const toast = useToast();

// Interface pour les messages
interface Message {
    text: string;
    time: string;
    isMe: boolean;
}

// Props pour recevoir les messages externes
const props = defineProps<{
    callActive: boolean;
}>();

// Émettre des événements
const emit = defineEmits<{
    (e: 'message-sent', message: string): void;
}>();

const messages = ref<Message[]>([]);
const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const socket = ref<any>(null); // Référence pour le socket

const connectSocket = () => {
    socket.value = io('http://localhost:8080'); // Remplacez par votre URL de serveur

    socket.value.on('message', (message: string) => {
        receiveMessage(message);
    });
};

const sendMessage = () => {
    if (!props.callActive) {
        toast.error('Impossible d\'envoyer un message : appel non actif');
        return;
    }
    if (newMessage.value.trim()) {
        // Création du message local
        messages.value.push({
            text: newMessage.value,
            time: new Date().toLocaleTimeString(),
            isMe: true
        });

        // Émission du message vers le serveur
        socket.value.emit('message', newMessage.value);

        // Émission du message vers le composant parent
        emit('message-sent', newMessage.value);

        newMessage.value = '';
        nextTick(() => {
            scrollToBottom();
        });
    }
};



// Réception des messages externes
const receiveMessage = (text: string) => {
    messages.value.push({
        text,
        time: new Date().toLocaleTimeString(),
        isMe: false
    });
    nextTick(() => {
        scrollToBottom();
    });
};

const scrollToBottom = () => {
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
};

// Connexion au socket lors du montage du composant
onMounted(() => {
    connectSocket();
});

// Déconnexion du socket lors de la destruction du composant
onBeforeUnmount(() => {
    if (socket.value) {
        socket.value.disconnect();
    }
});

// Exposer la méthode receiveMessage pour le composant parent
defineExpose({
    receiveMessage
});

</script>
<style scoped>
.chat-container {
    max-width: 800px;
    margin: 0 auto;
    background: #f8f9fe;
    border-radius: 20px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    padding: 20px;
    height: 80vh;
    display: flex;
    flex-direction: column;
}

.messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    margin: 20px 0;
    background: white;
    border-radius: 15px;
    box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.05);
}

.message-bubble {
    max-width: 70%;
    padding: 12px 20px;
    border-radius: 20px;
    margin: 8px 0;
}

.my-message .message-bubble {
    background: #2979ff;
    color: white;
    margin-left: auto;
    border-bottom-right-radius: 5px;
}

.other-message .message-bubble {
    background: #e9ecef;
    color: #333;
    margin-right: auto;
    border-bottom-left-radius: 5px;
}

.uk-input {
    border-radius: 25px;
    padding: 15px 25px;
    border: 2px solid #e9ecef;
    transition: all 0.3s ease;
}

.uk-input:focus {
    border-color: #2979ff;
    box-shadow: 0 0 0 3px rgba(41, 121, 255, 0.1);
}

.uk-button-primary {
    border-radius: 25px;
    padding: 10px 30px;
    background: #2979ff;
    border: none;
    margin-left: 10px;
    transition: all 0.3s ease;
}

.uk-button-primary:hover {
    background: #1565c0;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(41, 121, 255, 0.2);
}

.uk-alert {
    border-radius: 12px;
    padding: 12px 20px;
    text-align: center;
    font-weight: 500;
    margin-bottom: 20px;
}

.uk-alert-success {
    background: #e3f2fd;
    color: #1565c0;
    border: 1px solid #90caf9;
}

.uk-alert-warning {
    background: #fff3e0;
    color: #e65100;
    border: 1px solid #ffe0b2;
}

.uk-text-muted {
    font-size: 0.8em;
    margin-top: 4px;
    opacity: 0.7;
}

/* Personnalisation de la scrollbar */
.messages-area::-webkit-scrollbar {
    width: 6px;
}

.messages-area::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
}

.messages-area::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 10px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}
</style>



