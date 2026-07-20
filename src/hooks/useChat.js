// src/hooks/useChat.js
import { useState, useEffect } from "react";
import { chatService } from "../services/ChatService";

export function useChat() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);

  /**
   * Charger les conversations d'un utilisateur
   */
  const loadConversations = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      const result = await chatService.getUserConversations(userId);
      if (result.success) {
        setConversations(result.conversations);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ouvrir une conversation
   */
  const openConversation = async (conversationId) => {
    try {
      setLoading(true);
      const result = await chatService.getMessages(conversationId);
      if (result.success) {
        setMessages(result.messages);
        setCurrentConversation(conversationId);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envoyer un message
   */
  const sendMessage = async (conversationId, senderId, senderType, content) => {
    try {
      const result = await chatService.sendMessage(
        conversationId,
        senderId,
        senderType,
        content,
      );
      if (result.success) {
        setMessages([...messages, result.message]);
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  /**
   * Créer ou ouvrir une conversation
   */
  const startConversation = async (userId1, userId2, userType1, userType2) => {
    try {
      setLoading(true);
      const result = await chatService.getOrCreateConversation(
        userId1,
        userId2,
        userType1,
        userType2,
      );
      if (result.success) {
        await openConversation(result.conversation.id);
        return result;
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Marquer comme lu
   */
  const markAsRead = async (conversationId, userId) => {
    await chatService.markAllMessagesAsRead(conversationId, userId);
  };

  return {
    conversations,
    messages,
    currentConversation,
    loading,
    error,
    loadConversations,
    openConversation,
    sendMessage,
    startConversation,
    markAsRead,
  };
}
