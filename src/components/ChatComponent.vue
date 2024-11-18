<template>
    <div class="chat-container" :class="{ 'chat-expanded': isExpanded }">
        <!-- Bouton pour afficher/masquer le chat -->
        <button @click="toggleChat" class="chat-toggle-btn">
            <span v-if="!isExpanded">💬</span>
            <span v-else>&times;</span>
            <span v-if="unreadCount && !isExpanded" class="unread-badge">
                {{ unreadCount }}
            </span>
        </button>

        <!-- Panneau de chat -->
        <div v-show="isExpanded" class="chat-panel">
            <!-- En-tête du chat -->
            <div class="chat-header">
                <h3>Chat</h3>
                <div class="chat-actions">
                    <button @click="scrollToBottom" title="Aller en bas">⬇️</button>
                </div>
            </div>

            <!-- Messages -->
            <div ref="messagesContainer" class="messages-container">
                <div v-for="message in messages" :key="message.ID" class="message"
                    :class="{ 'message-own': message.from === currentUserId }">
                    <div class="message-header">
                        <span class="message-sender">{{ message.from === currentUserId ? 'Vous' : message.from }}</span>
                        <span class="message-time">{{ formatTime(message.time) }}</span>
                    </div>
                    <div class="message-content">{{ message.payload?.text }}</div>
                </div>
            </div>

            <!-- Zone de saisie -->
            <div class="chat-input-container">
                <input v-model="newMessage" @keyup.enter="sendMessage" placeholder="Écrivez votre message..."
                    :disabled="!isCallActive" />
                <button @click="sendMessage" :disabled="!isCallActive || !newMessage.trim()">
                    Envoyer
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import TIM from 'tim-js-sdk';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useToast } from 'vue-toastification';
import * as GeneratTestUserSig from '../debug/GenerateTestUserSig-es';

const SDKAppID = 20014601;
const SDKSecretKey = "76511b9b4c801d3ae63d3cdee238b8f201d148a73e464267e2c6e54b597422f8";
const props = defineProps({
    currentUserId: {
        type: String,
        required: true
    },
    isCallActive: {
        type: Boolean,
        default: false
    },
    groupId: {
        type: String,
        required: true
    }
});

const toast = useToast();
const tim = TIM.create({
    SDKAppID: SDKAppID // Utilisez votre SDKAppID
});

const isExpanded = ref(false);
const messages = ref([]);
const newMessage = ref('');
const unreadCount = ref(0);
const messagesContainer = ref(null);

const toggleChat = () => {
    isExpanded.value = !isExpanded.value;
    if (isExpanded.value) {
        unreadCount.value = 0;
        scrollToBottom();
    }
};

const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
};

const sendMessage = async () => {
    if (!newMessage.value.trim() || !props.isCallActive) return;

    try {
        const message = tim.createTextMessage({
            to: props.groupId,
            conversationType: TIM.TYPES.CONV_GROUP,
            payload: {
                text: newMessage.value.trim()
            }
        });

        await tim.sendMessage(message);
        newMessage.value = '';
        scrollToBottom();
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        toast.error('Erreur lors de l\'envoi du message');
    }
};

const scrollToBottom = () => {
    if (messagesContainer.value) {
        setTimeout(() => {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }, 50);
    }
};

const handleMessageReceived = (event) => {
    const messageList = event.data;
    messages.value.push(...messageList);
    if (!isExpanded.value) {
        unreadCount.value += messageList.length;
    }
    scrollToBottom();
};

watch(messages, (newMessages, oldMessages) => {
    if (!isExpanded.value && oldMessages && newMessages.length > oldMessages.length) {
        unreadCount.value++;
    }
});

onMounted(async () => {
    const userID = String(props.currentUserId);
   const { userSig } = GeneratTestUserSig.genTestUserSig({
    userID:userID,
    SDKAppID,
    SecretKey: SDKSecretKey
   })

    try {
        await tim.login({
            userID,
           userSig
        });

        tim.on(TIM.EVENT.MESSAGE_RECEIVED, handleMessageReceived);

        // Rejoindre le groupe
        await tim.joinGroup({ groupID: props.groupId });

        // Charger l'historique des messages
        const { data: { messageList } } = await tim.getMessageList({
            conversationID: `GROUP${props.groupId}`,
            count: 15
        });

        messages.value = messageList;
        scrollToBottom();
    } catch (error) {
        console.error('Erreur d\'initialisation du chat:', error);
        toast.error('Erreur d\'initialisation du chat');
    }
});

onUnmounted(() => {
    tim.off(TIM.EVENT.MESSAGE_RECEIVED, handleMessageReceived);
    tim.logout();
});
</script>

<style scoped>
.chat-container {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 1000;
}

.chat-toggle-btn {
    width: 50px;
    height: 50px;
    border-radius: 25px;
    background: #4F46E5;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 1.5rem;
    position: relative;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}


.unread-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #EF4444;
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 0.75rem;
}

.chat-panel {
    position: absolute;
    bottom: 60px;
    right: 0;
    width: 300px;
    height: 400px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
}

.chat-header {
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.message {
    max-width: 80%;
    padding: 8px 12px;
    border-radius: 12px;
    background: #f3f4f6;
    align-self: flex-start;
}

.message-own {
    background: #4F46E5;
    color: white;
    align-self: flex-end;
}

.message-header {
    font-size: 0.75rem;
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
}

.message-time {
    opacity: 0.7;
}

.chat-input-container {
    padding: 12px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 8px;
}

.chat-input-container input {
    flex: 1;
    padding: 8px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    outline: none;
}

.chat-input-container button {
    padding: 8px 16px;
    background: #4F46E5;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
}

.chat-input-container button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>