<template>
    <div class="container mx-auto">
        <div class="max-w-3xl mx-auto bg-gray-50 rounded-3xl shadow-lg p-5 h-[80vh] flex flex-col">
            <!-- Indicateur de statut d'appel -->
            <div class="rounded-xl p-3 text-center font-medium mb-5"
                :class="{ 'bg-blue-50 text-blue-800 border border-blue-200': props.callActive, 
                         'bg-orange-50 text-orange-800 border border-orange-200': !props.callActive }">
                {{ props.callActive ? 'Appel en cours' : 'Appel déconnecté' }}
            </div>

            <!-- Zone des messages -->
            <div class="flex-1 overflow-y-auto p-5 my-5 bg-white rounded-2xl shadow-inner" ref="messagesContainer">
                <div v-for="message in messages" :key="message.id"
                    :class="['message', message.isMe ? 'flex justify-end' : 'flex justify-start']">
                    <div class="relative max-w-[70%] group">
                        <!-- Message répondu -->
                        <div v-if="message.replyTo" class="text-xs text-gray-500 mb-1">
                            En réponse à: {{ findReplyMessage(message.replyTo)?.text }}
                        </div>

                        <!-- Message principal -->
                        <div class="p-3 rounded-2xl my-2"
                            :class="[message.isMe ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm']">
                            
                            <!-- Contenu du message -->
                            <p class="m-0" v-if="editingMessage?.id !== message.id">{{ message.text }}</p>
                            
                            <!-- Formulaire d'édition de message -->
                            <div v-else class="flex flex-col gap-2">
                                <input 
                                    v-model="editContent"
                                    @keyup.enter="confirmEdit(message.id)"
                                    class="rounded-lg px-3 py-1 text-gray-800 w-full"
                                    type="text"
                                >
                                <div class="flex gap-2 justify-end">
                                    <button @click="cancelEdit" 
                                        class="text-xs text-gray-200 hover:text-white">
                                        Annuler
                                    </button>
                                    <button @click="confirmEdit(message.id)"
                                        class="text-xs text-gray-200 hover:text-white">
                                        Confirmer
                                    </button>
                                </div>
                            </div>

                            <!-- Actions sur le(s) message(s) (édition et suppression) -->
                            <div v-if="message.isMe" 
                                class="absolute top-0 right-0 -mt-2 hidden group-hover:flex gap-1 bg-white rounded-full shadow-md p-1">
                                <button @click="startEdit(message)" 
                                    class="p-1 hover:bg-gray-100 rounded-full">
                                    <font-awesome-icon icon="edit" class="w-3 h-3 text-gray-600" />
                                </button>
                                <button @click="deleteMessage(message.id)"
                                    class="p-1 hover:bg-gray-100 rounded-full">
                                    <font-awesome-icon icon="trash" class="w-3 h-3 text-red-600" />
                                </button>
                            </div>

                            <!--  bouton de réponse aux messages des autres -->
                            <div v-if="!message.isMe" 
                                class="absolute top-0 right-0 -mt-2 hidden group-hover:flex gap-1 bg-white rounded-full shadow-md p-1">
                                <button @click="startReply(message)"
                                    class="p-1 hover:bg-gray-100 rounded-full">
                                    <font-awesome-icon icon="reply" class="w-3 h-3 text-gray-600" />
                                </button>
                            </div>
                        </div>

                        <!-- Zone de réponse -->
                        <div v-if="replyingTo?.id === message.id" 
                            class="mt-2 bg-white rounded-lg p-2 shadow-md">
                            <input 
                                v-model="replyContent"
                                @keyup.enter="confirmReply(message.id)"
                                class="w-full rounded-lg border p-2 text-sm"
                                placeholder="Votre réponse..."
                            >
                            <div class="flex justify-end gap-2 mt-1">
                                <button @click="cancelReply"
                                    class="text-xs text-gray-500 hover:text-gray-700">
                                    Annuler
                                </button>
                                <button @click="confirmReply(message.id)"
                                    class="text-xs text-blue-500 hover:text-blue-700">
                                    Répondre
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Zone de saisie de message -->
            <div class="mt-4">
                <div class="flex gap-2">
                    <input v-model="newMessage" @keyup.enter="sendMessage" 
                        class="flex-1 rounded-full px-6 py-3 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        type="text" placeholder="Écrivez votre message...">
                    <button @click="sendMessage" 
                        class="rounded-full p-3 bg-blue-500 text-white hover:bg-blue-700 transform hover:-translate-y-0.5 transition-all hover:shadow-lg">
                        <font-awesome-icon icon="paper-plane" class="w-5 h-5" />
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
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faPaperPlane, faEdit, faTrash, faReply } from '@fortawesome/free-solid-svg-icons';

// icônes
library.add(faPaperPlane, faEdit, faTrash, faReply);
// notification(s)
const toast = useToast();

// Interface pour les messages
interface Message {
    id: string;
    text: string;
    time: string;
    isMe: boolean;
    replyTo?: string;
}

// Props pour recevoir les messages externes
const props = defineProps<{
    callActive: boolean;
}>();

// Émettre des événements vers le composant parent
const emit = defineEmits<{
    (e: 'message-sent', message: string): void;
}>();

// variables pour les messages
const messages = ref<Message[]>([]);
const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

// variable pour la connexion au socket
const socket = ref<any>(null); 

//variables pour l'édition et la réponse des/aux messages
const editingMessage = ref<Message | null>(null);
const editContent = ref('');
const replyingTo = ref<Message | null>(null);
const replyContent = ref('');

// connexion au socket pour la communication en temps réel
const connectSocket = () => {
    socket.value = io('http://localhost:8080'); // URL du serveur

    socket.value.on('message', (message: string) => {
        receiveMessage(message);
    });

    // Nouveaux écouteurs socket
    socket.value.on('messageEdited', (data: { messageId: string, newContent: string }) => {
        const messageIndex = messages.value.findIndex(m => m.id === data.messageId);
        if (messageIndex !== -1) {
            messages.value[messageIndex].text = data.newContent;
        }
    });

    socket.value.on('messageDeleted', (messageId: string) => {
        messages.value = messages.value.filter(m => m.id !== messageId);
    });

    socket.value.on('messageReplied', (data: { replyTo: string, message: string }) => {
        receiveMessage(data.message, data.replyTo);
    });
};

// envoi du message
const sendMessage = () => {
    if (!props.callActive) {
        toast.error('Impossible d\'envoyer un message : appel non actif');
        return;
    }
    if (newMessage.value.trim()) {
        const newMsg: Message = {
            id: Date.now().toString(),
            text: newMessage.value,
            time: new Date().toLocaleTimeString(),
            isMe: true
        };
        messages.value.push(newMsg);
        socket.value.emit('message', newMessage.value);
        emit('message-sent', newMessage.value);
        newMessage.value = '';
        nextTick(() => {
            scrollToBottom();
        });
    }
};

// Réception des messages externes (d'autres participants)
const receiveMessage = (text: string, replyTo?: string) => {
    messages.value.push({
        id: Date.now().toString(),
        text,
        time: new Date().toLocaleTimeString(),
        isMe: false,
        replyTo
    });
    nextTick(() => {
        scrollToBottom();
    });
};

// début d'édition du message
const startEdit = (message: Message) => {
    editingMessage.value = message;
    editContent.value = message.text;
};

// confirmation de l'édition
const confirmEdit = (messageId: string) => {
    if (!editContent.value.trim()) return;
    
    socket.value?.emit('editMessage', {
        messageId,
        newContent: editContent.value
    });

    const messageIndex = messages.value.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
        messages.value[messageIndex].text = editContent.value;
    }
    
    cancelEdit();
    toast.success('Message modifié');
};

// annulation de l'édition
const cancelEdit = () => {
    editingMessage.value = null;
    editContent.value = '';
};

// suppression du message
const deleteMessage = (messageId: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce message ?')) {
        socket.value?.emit('deleteMessage', messageId);
        messages.value = messages.value.filter(m => m.id !== messageId);
        toast.success('Message supprimé');
    }
};

//  réponse au message
const startReply = (message: Message) => {
    replyingTo.value = message;
    replyContent.value = '';
};

// confirmation de la réponse
const confirmReply = (messageId: string) => {
    if (!replyContent.value.trim()) return;
    if (!props.callActive) {
        toast.error('Impossible de répondre : appel non actif');
        return;
    }

    // Ajouter le message localement
    const newMsg: Message = {
        id: Date.now().toString(),
        text: replyContent.value,
        time: new Date().toLocaleTimeString(),
        isMe: true,
        replyTo: messageId
    };
    messages.value.push(newMsg);

    // Envoi de la réponse via le socket
    socket.value?.emit('replyMessage', {
        replyTo: messageId,
        message: replyContent.value
    });

    cancelReply();
    toast.success('Réponse envoyée');
    
    nextTick(() => {
        scrollToBottom();
    });
};

const cancelReply = () => {
    replyingTo.value = null;
    replyContent.value = '';
};

const findReplyMessage = (messageId: string) => {
    return messages.value.find(m => m.id === messageId);
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
<style scoped >
@import url("../assets/chat.css");
</style>



