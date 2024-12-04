<template>
  <div class="container mx-auto px-4">
    <div
      class="max-w-3xl mx-auto bg-gray-100 rounded-3xl shadow-xl p-6 h-[85vh] flex flex-col"
    >
      <!-- Indicateur de statut d'appel -->
      <div
        class="rounded-xl p-3 text-center font-semibold text-sm mb-5"
        :class="{
          'bg-blue-100 text-blue-900 border border-blue-300': props.callActive,
          'bg-orange-100 text-orange-900 border border-orange-300': !props.callActive,
        }"
      >
        {{ props.callActive ? "Appel en cours" : "Appel déconnecté" }}
      </div>

      <!-- Zone des messages -->
      <div
        class="flex-1 overflow-y-auto p-5 my-5 bg-white rounded-2xl shadow-inner"
        ref="messagesContainer"
      >
        <div
          v-for="(message, index) in messages"
          :key="message.id"
          :class="[
            'message flex items-start',
            message.isMe ? 'justify-end' : 'justify-start',
          ]"
        >
          <div class="relative max-w-[70%] group">
            <!-- Affichage du nom de l'utilisateur -->
            <div v-if="index === 0 || messages[index - 1].userId !== message.userId" class="text-xs text-gray-600 mb-1">
              {{ getUserName(message) }}
            </div> 

            <!-- Message répondu -->
            <div v-if="message.replyTo" class="text-xs text-gray-500 mb-1 italic">
              En réponse à: {{ findReplyMessage(message.replyTo)?.text }}
            </div>

            <!-- Message principal -->
            <div
              class="p-4 rounded-xl my-2"
              :class="[
                message.isMe
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : 'bg-gray-200 text-gray-900 rounded-bl-sm',
              ]"
            >
              <!-- Contenu du message -->
              <p class="m-0 text-sm" v-if="editingMessage?.id !== message.id">
                {{ message.text }}
              </p>

              <!-- Formulaire d'édition de message -->
              <!-- <div v-else class="flex flex-col gap-2">
                <input
                  v-model="editContent"
                  @keyup.enter="confirmEdit(message.id)"
                  class="rounded-lg px-3 py-1 text-gray-800 w-full border border-gray-300 focus:ring-2 focus:ring-blue-200"
                  type="text"
                />
                <div class="flex gap-2 justify-end">
                  <button
                    @click="cancelEdit"
                    class="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    @click="confirmEdit(message.id)"
                    class="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Confirmer
                  </button>
                </div>
              </div> -->

              <!-- Actions sur le(s) message(s) -->
              <div
                v-if="message.isMe || !message.isMe"
                class="absolute top-0 right-0 -mt-2 hidden group-hover:flex gap-1 bg-white rounded-full shadow-lg p-1"
              >
                <!-- <button
                  v-if="message.isMe"
                  @click="startEdit(message)"
                  class="p-1 hover:bg-gray-100 rounded-full"
                >
                  <font-awesome-icon icon="edit" class="w-4 h-4 text-gray-500" />
                </button> -->
                <button
                  v-if="message.isMe"
                  @click="deleteMessage(message.id)"
                  class="p-1 hover:bg-gray-100 rounded-full" title="Supprimer pour moi"
                >
                  <font-awesome-icon icon="trash" class="w-4 h-4 text-red-500" />
                </button>
                <button
                  v-if="!message.isMe"
                  @click="startReply(message)"
                  class="p-1 hover:bg-gray-100 rounded-full"
                >
                  <font-awesome-icon icon="reply" class="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <!-- Zone de réponse -->
            <div
              v-if="replyingTo?.id === message.id"
              class="mt-3 bg-white rounded-xl p-3 shadow"
            >
              <input
                v-model="replyContent"
                @keyup.enter="confirmReply(message.id)"
                class="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-200"
                placeholder="Votre réponse..."
              />
              <div class="flex justify-end gap-2 mt-2">
                <button
                  @click="cancelReply"
                  class="text-xs text-gray-500 hover:text-gray-700"
                >
                  Annuler
                </button>
                <button
                  @click="confirmReply(message.id)"
                  class="text-xs text-blue-500 hover:text-blue-700"
                >
                  Répondre
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Zone de saisie de message -->
      <div class="mt-4">
        <div class="flex items-center gap-3">
          <input
            v-model="newMessage"
            @keyup.enter="sendMessage"
            class="flex-1 rounded-full px-5 py-3 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
            type="text"
            placeholder="Écrivez votre message..."
          />
          <button
            @click="sendMessage"
            class="rounded-full p-3 bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg transition"
          >
            <font-awesome-icon icon="paper-plane" class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// import des fonctions de vue
import { ref, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useToast } from "vue-toastification";
import { io } from "socket.io-client";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faPaperPlane,
  faEdit,
  faTrash,
  faReply,
} from "@fortawesome/free-solid-svg-icons";

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
  userId?: string;
}

// Props pour recevoir les messages externes
const props = defineProps<{
  callActive: boolean;
}>();

// Émettre des événements vers le composant parent
const emit = defineEmits<{
  (e: "message-sent", message: string): void;
}>();

// variables pour les messages
const messages = ref<Message[]>([]);
const newMessage = ref("");
const messagesContainer = ref<HTMLElement | null>(null);

// variable pour la connexion au socket
const socket = ref<any>(null);

//variables pour l'édition et la réponse des/aux messages
const editingMessage = ref<Message | null>(null);
const editContent = ref("");
const replyingTo = ref<Message | null>(null);
const replyContent = ref("");

// Fonction pour récupérer le nom de l'utilisateur à partir de sessionStorage
const getUserName = (message: Message) => {
  console.log("message", message);
  return message.userId;
};

// connexion au socket pour la communication en temps réel
const connectSocket = () => {
  socket.value = io("http://localhost:8080"); // URL du serveur

  socket.value.on("message", (data: { text: string; userId: string }) => {
    receiveMessage(data.text, undefined, data.userId);
  });

  // Nouveaux écouteurs socket
  socket.value.on("messageEdited", (data: { messageId: string; newContent: string }) => {
    const messageIndex = messages.value.findIndex((m) => m.id === data.messageId);
    if (messageIndex !== -1) {
      messages.value[messageIndex].text = data.newContent;
    }
  });

  socket.value.on("messageDeleted", (messageId: string) => {
    messages.value = messages.value.filter((m) => m.id !== messageId);
  });

  socket.value.on("messageReplied", (data: { replyTo: string; message: string }) => {
    receiveMessage(data.message, data.replyTo);
  });
};

// envoi du message
const userID = sessionStorage.getItem("userId");
const sendMessage = () => {
  if (!props.callActive) {
    toast.error("Impossible d'envoyer un message : appel non actif");
    return;
  }
  if (newMessage.value.trim()) {
    const lastMessage = messages.value[messages.value.length - 1];
    const newMsg: Message = {
      id: Date.now().toString(),
      text: newMessage.value,
      time: new Date().toLocaleTimeString(),
      isMe: true,
      userId: (lastMessage && lastMessage.isMe && lastMessage.userId) ? lastMessage.userId : (userID ? userID : ""),
    };
    messages.value.push(newMsg);
    socket.value.emit("message", { text: newMessage.value, userId: newMsg.userId });
    emit("message-sent", newMessage.value);
    newMessage.value = "";
    nextTick(() => {
      scrollToBottom();
    });
  }
};

// Réception des messages externes (d'autres participants)
const receiveMessage = (text: string, replyTo?: string, userId?: string) => {
  messages.value.push({
    id: Date.now().toString(),
    text,
    time: new Date().toLocaleTimeString(),
    isMe: false,
    replyTo,
    userId: userId ? userId : "",
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

  socket.value?.emit("editMessage", {
    messageId,
    newContent: editContent.value,
  });

  const messageIndex = messages.value.findIndex((m) => m.id === messageId);
  if (messageIndex !== -1) {
    messages.value[messageIndex].text = editContent.value;
  }

  cancelEdit();
//   toast.success("Message modifié");
};

// annulation de l'édition
const cancelEdit = () => {
  editingMessage.value = null;
  editContent.value = "";
};

// suppression du message
const deleteMessage = (messageId: string) => {
//   if (confirm("Voulez-vous vraiment supprimer ce message ?")) {
    socket.value?.emit("deleteMessage", messageId);
    messages.value = messages.value.filter((m) => m.id !== messageId);
    // toast.success("Message supprimé");
//   }
};

//  réponse au message
const startReply = (message: Message) => {
  replyingTo.value = message;
  replyContent.value = "";
};

// confirmation de la réponse
const confirmReply = (messageId: string) => {
  if (!replyContent.value.trim()) return;
  if (!props.callActive) {
    toast.error("Impossible de répondre : appel non actif");
    return;
  }

  // Ajouter le message localement
  const newMsg: Message = {
    id: Date.now().toString(),
    text: replyContent.value,
    time: new Date().toLocaleTimeString(),
    isMe: true,
    replyTo: messageId,
    // userId: userID ? userID : ""
  };
  messages.value.push(newMsg);

  // Envoi de la réponse via le socket
  socket.value?.emit("replyMessage", {
    replyTo: messageId,
    message: replyContent.value,
  });

  cancelReply();
  toast.success("Réponse envoyée");

  nextTick(() => {
    scrollToBottom();
  });
};

const cancelReply = () => {
  replyingTo.value = null;
  replyContent.value = "";
};

const findReplyMessage = (messageId: string) => {
  return messages.value.find((m) => m.id === messageId);
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
  receiveMessage,
});
</script>

<style scoped>
.message {
  margin-bottom: 10px;
}
.flex {
  display: flex;
}
.justify-end {
  justify-content: flex-end;
}
.justify-start {
  justify-content: flex-start;
}
</style>
