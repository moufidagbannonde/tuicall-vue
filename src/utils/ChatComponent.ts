// Définition de l'interface Message
interface Message {
    id: string;
    text: string;
    time: string; // Format de l'heure
    isMe: boolean; // Indique si le message a été envoyé par l'utilisateur
    userId: string; // ID de l'utilisateur
    isRead: boolean; // Indique si le message a été lu
    replyTo?: string;
  }

const msg = sessionStorage.getItem("userId");