class ChatService {
  constructor() {
    this.messages = new Map(); // Stockage temporaire des messages par conversation
  }

  // Générer un ID de conversation unique entre deux utilisateurs
  getConversationId(userId1, userId2) {
    return [userId1, userId2].sort().join('-');
  }

  // Sauvegarder un message
  saveMessage(fromUserId, toUserId, message) {
    const conversationId = this.getConversationId(fromUserId, toUserId);
    
    if (!this.messages.has(conversationId)) {
      this.messages.set(conversationId, []);
    }
    
    const messageWithId = {
      ...message,
      id: Date.now() + Math.random(),
      conversationId,
      timestamp: Date.now()
    };
    
    this.messages.get(conversationId).push(messageWithId);
    
    // Garder seulement les 100 derniers messages par conversation
    const messages = this.messages.get(conversationId);
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }
    
    return messageWithId;
  }

  // Récupérer l'historique des messages
  getMessages(userId1, userId2) {
    const conversationId = this.getConversationId(userId1, userId2);
    return this.messages.get(conversationId) || [];
  }

  // Nettoyer les anciens messages (appelé périodiquement)
  cleanOldMessages() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const [conversationId, messages] of this.messages.entries()) {
      const recentMessages = messages.filter(msg => msg.timestamp > oneDayAgo);
      
      if (recentMessages.length === 0) {
        this.messages.delete(conversationId);
      } else {
        this.messages.set(conversationId, recentMessages);
      }
    }
  }
}

export default new ChatService();