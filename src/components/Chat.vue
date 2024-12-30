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
          'bg-orange-100 text-orange-900 border border-orange-300':
            !props.callActive,
        }"
      >
        {{ props.callActive ? "Appel en cours" : "Appel déconnecté" }}
      </div>
      <span v-if="getUnreadCount > 0" class="ml-2 text-red-500 font-bold">
        ({{ getUnreadCount }}) Messages non lus
      </span>

      <span @click="inviteUser">...</span>

      <div v-if="inviteModal">
        <input type="text" v-model="inviteeUsers">
        <button>Inviter</button>
        <button>Annuler</button>
      </div>
      <!-- Zone des messages -->
      <div
        class="flex-1 overflow-y-auto p-5 my-5 bg-white rounded-2xl shadow-inner"
        ref="messagesContainer"
      >
        <div
          v-for="(message, index) in messages"
          :key="message.id"
        >
          <!-- Affichage de l'heure de la discussion -->
          <div
            v-if="shouldShowTime(index)"
            class="text-center text-gray-500 text-xs my-2"
          >
            {{ formatTime(message.time) }}
          </div>

          <div
            :class="[
              'message flex items-start mb-3',
              message.isMe ? 'justify-end' : 'justify-start',
            ]"
          >
            <div class="relative max-w-[70%] group">
              <!-- Affichage du nom de l'utilisateur sans icône de profil -->
              <div
                v-if="
                  index === 0 || messages[index - 1].userId !== message.userId
                "
                class="text-xs text-gray-600 mb-1 flex items-center space-x-2"
              >
                <span>{{ getUserId(message) }}</span>
              </div>

              <!-- Message principal -->
              <div>
                <div
                  :class="[
                    'p-3 rounded-2xl text-sm max-w-md break-words shadow-lg',
                    message.isMe
                      ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-white self-end'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-200 self-start',
                    message.isRead ? '' : 'border border-green-700 blink',
                  ]"
                >
                  <!-- Partie "A répondu à ..." -->
                  <div
                    v-if="message.replyTo"
                    class="bg-gray-50 p-2 rounded-lg mb-2 text-sm"
                  >
                    <div class="text-gray-500 text-xs mb-1">En réponse à :</div>
                    <strong class="text-gray-700">{{
                      findReplyMessage(message.replyTo)?.text ||
                      "Message non trouvé"
                    }}</strong>
                  </div>
                  <!-- Texte principal -->
                  <span class="block">{{ message.text }}</span>
                </div>

                <!-- Actions sur le(s) message(s) -->
                <div
                  v-if="message.isMe || !message.isMe"
                  class="absolute top-0 right-0 hidden group-hover:flex gap-1"
                >
                  <!-- Icône de réponse, affichée uniquement pour les messages des autres -->
                  <button
                    v-if="!message.isMe"
                    @click.stop="startReply(message)"
                    class="p-1 hover:bg-gray-100"
                    title="Répondre"
                  >
                    <font-awesome-icon
                      icon="reply"
                      class="w-4 h-4 text-blue-500"
                    />
                  </button>
                  <!-- bouton d'édition de message pour moi -->
                  <button
                    v-if="message.isMe"
                    @click="startEdit(message)"
                    class="p-1 hover:bg-gray-100"
                    title="Modifier le message"
                  >
                    <font-awesome-icon
                      icon="edit"
                      class="w-4 h-4 text-white-500"
                    />
                  </button>
                  <!-- Bouton de suppression de message pour moi -->
                  <button
                    v-if="message.isMe"
                    @click="deleteMessage(message.id, true)"
                    class="p-1 hover:bg-gray-100 rounded-full"
                    title="Supprimer pour tous"
                  >
                    <font-awesome-icon
                      icon="trash"
                      class="w-4 h-4 text-red-500"
                    />
                  </button>
                </div>
                <!-- Zone d'édition du message -->
                <div v-if="editingMessage && editingMessage.id === message.id">
                  <input
                    v-model="editContent"
                    @keyup.enter="confirmEdit(message.id)"
                    class="border rounded p-1"
                    placeholder="Modifier votre message..."
                  />
                  <button @click="cancelEdit" class="text-red-500">
                    Annuler
                  </button>
                </div>
              </div>

              <!-- Zone de réponse -->
              <div
                v-if="replyingTo?.id === message.id"
                class="mt-3 bg-white rounded-lg p-3 shadow-md"
              >
                <!-- Indiquer que l'utilisateur a répondu à un message -->
                <!-- <div class="text-gray-600 mb-2">
                  <strong>A répondu à :</strong>
                  {{
                    findReplyMessage(replyingTo.replyTo)?.text || "Message introuvable"
                  }}
                </div> -->

                <!-- Afficher le contenu de la réponse -->
                <div class="text-gray-900">
                  {{ replyContent }}
                </div>

                <div class="flex items-center space-x-2 mt-2">
                  <!-- Afficher le nom de l'utilisateur qui répond -->
                  <span>{{ getUserId(replyingTo) }}</span>
                </div>

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
      </div>

      <!-- Zone de saisie de message -->
      <div class="mt-4">
        <div class="flex flex-col">
          <div class="flex items-center gap-3">
            <input
              v-model="newMessage"
              @keyup.enter="sendMessage"
              class="flex-1 rounded-full px-5 py-3 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              type="text"
              placeholder="Écrivez votre message..."
            />
            <button @click="sendMessage" class="p-3 text-blue">
              <svg
                data-v-8765cc6e
                class="svg-inline--fa fa-paper-plane w-5 h-5"
                aria-hidden="true"
                focusable="false"
                data-prefix="fas"
                data-icon="paper-plane"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
              >
                <path
                  class
                  fill="#3B82F6"
                  d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480l0-83.6c0-4 1.5-7.8 4.2-10.8L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <ConfirmDelete
      v-if="isModalVisible"
      :isVisible="isModalVisible"
      @confirm="handleDelete"
      @cancel="isModalVisible = false"
    />
    <CustomNotification
      v-if="notificationVisible"
      :message="notificationMessage"
      :type="notificationType"
    />
  </div>
</template>

<script lang="ts" setup>
// import des fonctions de vue
import {
  ref,
  nextTick,
  onMounted,
  onBeforeUnmount,
  computed,
  watch,
} from "vue";
import { io } from "socket.io-client";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faPaperPlane,
  faEdit,
  faTrash,
  faReply,
} from "@fortawesome/free-solid-svg-icons";
import * as ConfirmDelete from "./ConfirmDelete.vue";
import * as ChatComponent from "../utils/ChatComponent";
// import "../utils/ChatComponent";
import * as CustomNotification from "./CustomNotification.vue";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { TUICallKitServer } from "@tencentcloud/call-uikit-vue";


const props = defineProps<{
  callActive: boolean;
}>();
const isModalVisible = ref(false);
const inviteModal = ref(false);
// icônes
library.add(faPaperPlane, faEdit, faTrash, faReply);
// notification(s)

// Émettre des événements vers le composant parent
const emit = defineEmits<{
  (e: "message-sent", message: string): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
  (e: "unread-count-changed", unreadCount: number): void;
}>();

// variables pour les messages
const messages = ref<ChatComponent.Message[]>([]);
const newMessage = ref("");
const messagesContainer = ref<HTMLElement | null>(null);

const inviteeUsers = ref([]);
// variable pour la connexion au socket
const socket = ref<any>(null);

//variables pour l'édition et la réponse des/aux messages
const editingMessage = ref<ChatComponent.Message | null>(null);
const editContent = ref("");
const replyingTo = ref<ChatComponent.Message | null>(null);
const replyContent = ref("");

// Fonction pour récupérer le nom de l'utilisateur à partir de sessionStorage
const getUserId = (message: ChatComponent.Message) => {
  return message.userId;
};

const getReplyingToUserId = (messageId: string) => {
  const replyingToMessage = messages.value.find(
    (m: ChatComponent.Message) => m.userId === messageId
  );
};
// connexion au socket pour la communication en temps réel
const connectSocket = () => {
  socket.value = io("http://localhost:8080"); // URL du serveur

  socket.value.on("message", (data: ChatComponent.Message) => {
    receiveMessage(data.text, undefined, data.userId, data.conversationId);
  });

  // Socket d'édition de message
  socket.value.on("messageEdited", (updatedMessage: ChatComponent.Message) => {
    // Vérifiez si le message existe déjà
    const messageIndex = messages.value.findIndex(
      (m: ChatComponent.Message) =>
        m.text === updatedMessage.text && m.userId === updatedMessage.userId
    );
    if (messageIndex !== -1) {
      // Remplacer l'ancien message par le message modifié
      messages.value[messageIndex].text = updatedMessage.newContent; // Mettre à jour le message complet
    } else {
      // on ne fait rien si le message n'existe pas
    }
  });

  socket.value.on("messageDeleted", (deletedMessageId: string) => {
    // Mettre à jour la liste des messages affichés en filtrant par ID
    messages.value = messages.value.filter(
      (m: ChatComponent.Message) => m.id !== deletedMessageId
    );
  });

  socket.value.on("messageReplied", (data: ChatComponent.Message) => {
    // Ajoutez le message à la liste des messages
    const newMessage: ChatComponent.Message = {
      id: Date.now().toString(),
      text: data.message,
      time: new Date().toLocaleTimeString(),
      isMe: false,
      replyTo: data.replyTo,
      userId: data.userId,
      isRead: false,
    };

    messages.value.push(newMessage);
  });

  socket.value.on("messageDeleted", (messageId: string) => {
    messages.value = messages.value.filter(
      (m: ChatComponent.Message) => m.id !== messageId
    );
  });

  socket.value.on("deleteMessageForEveryOne", (messageId: string) => {
    messages.value = messages.value.filter(
      (m: ChatComponent.Message) => m.id !== messageId
    );
  });
};


const conversationId = ref("");
conversationId.value = uuidv4();

const inviteUser = async () => {
  inviteModal.value = true;
}
// envoi du message
const userID = sessionStorage.getItem("userId");

// todo: envoyer e
const sendMessage = () => {
  if (!props.callActive) {
    showNotification(
      "Impossible d'envoyer un message : appel non actif",
      "error"
    );
    return;
  }
  if (newMessage.value.trim()) {
    const newMsg = {
      id: Date.now().toString(),
      text: newMessage.value,
      time: new Date().toLocaleTimeString(),
      isMe: true,
      userId: userID,
      isRead: true,
    };
    messages.value.push(newMsg);

    // Mettre à jour le localStorage avec le nouveau message
    const storedMessages = JSON.parse(localStorage.getItem("messages") || "[]");
    storedMessages.push(newMsg); // Ajouter le message sans filtrer par userId
    localStorage.setItem("messages", JSON.stringify(storedMessages));

    socket.value.emit("message", {
      text: newMessage.value,
      receiverId: "",
      userId: userID,
    });
    emit("message-sent", newMessage.value);
    markAllAsRead();
    newMessage.value = "";
    nextTick(() => {
      scrollToBottom();
    });
  }
};

// Réception des messages externes (d'autres participants)
const receiveMessage = (
  text: string,
  replyTo?: string,
  userId?: string,
  isRead?: boolean
) => {
  const newMessage: ChatComponent.Message = {
    id: Date.now().toString(),
    text,
    time: new Date().toLocaleTimeString(),
    isMe: false,
    replyTo,
    userId: userId ? userId : "",
    isRead: false,
  };

  messages.value.push(newMessage);

  // Mettre à jour le localStorage avec le nouveau message
  const storedMessages = JSON.parse(localStorage.getItem("messages") || "[]");
  storedMessages.push(newMessage); // Ajouter le message sans filtrer par userId
  localStorage.setItem("messages", JSON.stringify(storedMessages));
  emitUnreadCount();
  nextTick(() => {
    scrollToBottom();
  });
};

// début d'édition du message
const startEdit = (message: ChatComponent.Message) => {
  editingMessage.value = message;
  editContent.value = message.text;
};

// confirmation de l'édition
const confirmEdit = (messageId: string) => {
  if (!editContent.value.trim()) return;

  // Récupérer le message à modifier
  const messageToEdit = messages.value.find(
    (m: ChatComponent.Message) => m.id === messageId
  );
  if (!messageToEdit) return;

  // Émettre l'événement de modification du message via le socket
  socket.value?.emit("editMessage", {
    text: messageToEdit.text, // Texte original
    userId: messageToEdit.userId, // ID de l'utilisateur
    newContent: editContent.value, // Nouveau contenu du message
  });

  // Mettre à jour localement
  const messageIndex = messages.value.findIndex(
    (m: ChatComponent.Message) => m.id === messageId
  );
  if (messageIndex !== -1) {
    messages.value[messageIndex].text = editContent.value; // Mettre à jour localement
  }

  cancelEdit();
};

// annulation de l'édition
const cancelEdit = () => {
  editingMessage.value = null;
  editContent.value = "";
};

const messageToDelete = ref<any>();
const forEvery = ref(false);
// suppression du message
const deleteMessage = (messageId: string, forEveryone: boolean = false) => {
  messageToDelete.value = messageId;
  forEvery.value = forEveryone;
  isModalVisible.value = true;
};

const handleDelete = () => {
  const messageToDeleteData = messages.value.find(
    (m: ChatComponent.Message) => m.id === messageToDelete.value
  );

  if (!messageToDeleteData) {
    return;
  }

  const { text, userId } = messageToDeleteData;

  // Émettre l'événement de suppression selon l'option choisie
  socket.value?.emit("deleteMessage", {
    text,
    userId,
    forEveryOne: forEvery.value,
  });

  // Mettre à jour la liste des messages affichés
  messages.value = messages.value.filter(
    (m: ChatComponent.Message) => m.id !== messageToDelete.value
  );
  messageToDelete.value = null;
  isModalVisible.value = false;
};

const replyingUserId = ref("");
//  réponse au message
const startReply = (message: Message) => {
  replyingTo.value = message;
  replyContent.value = "";
  replyingUserId.value = sessionStorage.getItem("userId") || "";
};

// confirmation de la réponse
const confirmReply = (messageId: string) => {
  console.log("confirmation message", messageId);
  if (!replyContent.value.trim()) return;
  if (!props.callActive) {
    showNotification("Impossible de répondre : appel non actif", "error");
    return;
  }

  // Ajouter le message localement
  const newMsg: ChatComponent.Message = {
    // TODO : utiliser l'objet id renvoyé par Mongo au lieu du Date.now
    id: Date.now().toString(),
    text: replyContent.value, // On garde le texte de la réponse séparé
    time: new Date().toLocaleTimeString(),
    isMe: true,
    replyTo: messageId, // ID du message auquel on répond
    userId: replyingUserId.value,
    isRead: true,
  };
  // const newText = `En réponse à : ${findReplyMessage(messageId)?.text} ${newMsg.text}`; // Ajouter le texte de la réponse au message
  // Envoi de la réponse via le socket
  socket.value?.emit("replyMessage", {
    replyTo: messageId,
    userId: userID,
    message: newMsg.text 
  });

  messages.value.push(newMsg);
  cancelReply();
  nextTick(() => {
    scrollToBottom();
  });
};

const showDialogVisible = ref(false);
const dialogMessage = ref("");

// Fonction pour afficher la boîte de dialogue
const showDialog = (message: string, onConfirm: () => void) => {
  dialogMessage.value = message;
  showDialogVisible.value = true;

  // Gérer la confirmation
  const confirmHandler = () => {
    onConfirm();
    showDialogVisible.value = false;
  };

  // Gérer l'annulation
  const cancelHandler = () => {
    showDialogVisible.value = false;
  };
};

const cancelReply = () => {
  replyingTo.value = null;
  replyContent.value = "";
};

const findReplyMessage = (messageId: string) => {
  console.log("messageId", messageId);
  console.log("messages", messages.value);
  return messages.value.find(
    (m: ChatComponent.Message) => m.id <= messageId + 2 || m.id >= messageId + 2
  );
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const markAllAsRead = () => {
  messages.value.forEach((message: ChatComponent.Message) => {
    message.isRead = true; // Marquer chaque message comme lu
  });
};

// Écouter les clics pour masquer le menu contextuel
onMounted(() => {
  connectSocket();
  openChat();
  markAllAsRead();
});

onBeforeUnmount(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});

// Exposer la méthode receiveMessage pour le composant parent
defineExpose({
  receiveMessage,
});

const notificationVisible = ref(false);
const notificationMessage = ref("");
const notificationType = ref("info");
// Fonction pour afficher la notification
const showNotification = (message: string, type = "info") => {
  notificationMessage.value = message;
  notificationType.value = type;
  notificationVisible.value = true;

  setTimeout(() => {
    notificationVisible.value = false; // Masquer après 5 secondes
  }, 5000); // Afficher pendant 5 secondes
};

// Fonction pour déterminer si l'heure doit être affichée
const shouldShowTime = (index: number): boolean => {
  if (index === 0) return true; // Toujours afficher pour le premier message

  // Accéder à messages.value pour obtenir le tableau de messages
  const currentTime = messages.value[index].time; // Récupérer l'heure directement
  const previousTime = messages.value[index - 1].time; // Récupérer l'heure du message précédent

  // Vérifiez si les heures sont valides
  if (!currentTime || !previousTime) {
    return false; // Ne pas afficher l'heure si elle est invalide
  }

  // Convertir les heures en objets Date pour comparer
  const currentDate = new Date(`1970-01-01T${currentTime}Z`); // Utiliser une date fixe pour la comparaison
  const previousDate = new Date(`1970-01-01T${previousTime}Z`); // Utiliser une date fixe pour la comparaison

  const timeDifference =
    (currentDate.getTime() - previousDate.getTime()) / 1000 / 60; // Différence en minutes
  return timeDifference >= 5; // Afficher si plus de 5 minutes se sont écoulées
};

// Fonction pour formater l'heure
const formatTime = (time: string): string => {
  // Ici, nous supposons que le format est déjà correct (HH:mm:ss)
  return time; // Retourner l'heure directement
};

// Fonction pour marquer un message comme lu
const markAsRead = (messageId: string) => {
  const message = messages.value.find(
    (msg: ChatComponent.Message) => msg.id === messageId
  );
  if (message) {
    message.isRead = true; // Marquer le message comme lu
  }
};

const openChat = () => {
  // Marquer tous les messages comme lus
  messages.value.forEach((message: ChatComponent.Message) => {
    message.isRead = true;
  });
};

const getUnreadCount = computed(() => {
  // Compter les messages non lus
  const unreadCount = messages.value.filter(
    (message: ChatComponent.Message) => !message.isRead
  ).length;
  return unreadCount;
});

const isChatVisible = ref(false);

// Méthode pour ouvrir/fermer la messagerie
const toggleChat = () => {
  isChatVisible.value = !isChatVisible.value;
};
const emitUnreadCount = () => {
  const unreadCount = getUnreadCount.value; // Obtenez le nombre de messages non lus
  emit("unread-count-changed", unreadCount); // Émettez l'événement
};
// Émettre le nombre de messages non lus lorsque cela change
watch(getUnreadCount, (newCount) => {
  emit("unread-count-changed", newCount);
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
.border-yellow-500 {
  border-color: #fbbf24; /* Couleur pour les messages non lus */
}
@keyframes blink {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.05); /* Augmente légèrement la taille */
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.blink {
  animation: blink 1s infinite;
}
</style>
