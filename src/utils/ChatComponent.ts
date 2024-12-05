// Interface pour les messages
interface Message {
    id: string;
    text: string;
    time: string;
    isMe: boolean;
    replyTo?: string;
    userId?: string;
  }

  
const msg = sessionStorage.getItem("userId");

