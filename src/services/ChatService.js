// src/services/ChatService.js
/**
 * Service Chat - Parent ↔ Enseignant
 * Gestion des messages et conversations
 */

import { supabase } from "../config/supabase";

export class ChatService {
  /**
   * Créer ou récupérer une conversation
   */
  async getOrCreateConversation(
    userId1,
    userId2,
    userType1 = "parent",
    userType2 = "teacher",
  ) {
    try {
      // Créer un ID de conversation unique et stable
      const conversationId = this.generateConversationId(userId1, userId2);

      // Chercher si la conversation existe
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        return { success: true, conversation: data };
      }

      // Créer une nouvelle conversation
      const newConversation = {
        id: conversationId,
        user1_id: userId1,
        user2_id: userId2,
        user1_type: userType1,
        user2_type: userType2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: created, error: createError } = await supabase
        .from("conversations")
        .insert([newConversation])
        .select()
        .single();

      if (createError) throw createError;

      console.log("✅ Conversation créée:", created.id);
      return { success: true, conversation: created };
    } catch (error) {
      console.error("❌ Erreur conversation:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Générer un ID de conversation stable
   */
  generateConversationId(userId1, userId2) {
    const sorted = [userId1, userId2].sort();
    return `conv_${sorted[0]}_${sorted[1]}`;
  }

  /**
   * Envoyer un message
   */
  async sendMessage(conversationId, senderId, senderType, message) {
    try {
      if (!message || !message.trim()) {
        throw new Error("Message vide");
      }

      const newMessage = {
        conversation_id: conversationId,
        sender_id: senderId,
        sender_type: senderType,
        content: message.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("messages")
        .insert([newMessage])
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      console.log("✅ Message envoyé:", data.id);
      return { success: true, message: data };
    } catch (error) {
      console.error("❌ Erreur envoi message:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer les messages d'une conversation
   */
  async getMessages(conversationId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) throw error;

      return { success: true, messages: data || [] };
    } catch (error) {
      console.error("❌ Erreur récupération messages:", error);
      return { success: false, error: error.message, messages: [] };
    }
  }

  /**
   * Marquer un message comme lu
   */
  async markMessageAsRead(messageId) {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("id", messageId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("❌ Erreur marquer message:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Marquer tous les messages comme lus
   */
  async markAllMessagesAsRead(conversationId, userId) {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("❌ Erreur marquer tous lus:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer les conversations d'un utilisateur
   */
  async getUserConversations(userId) {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          user1:user1_id(id, first_name, last_name, email),
          user2:user2_id(id, first_name, last_name, email)
        `,
        )
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return { success: true, conversations: data || [] };
    } catch (error) {
      console.error("❌ Erreur conversations:", error);
      return { success: false, error: error.message, conversations: [] };
    }
  }

  /**
   * Compter les messages non-lus
   */
  async getUnreadCount(conversationId, userId) {
    try {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact" })
        .eq("conversation_id", conversationId)
        .eq("is_read", false)
        .neq("sender_id", userId);

      if (error) throw error;

      return { success: true, unreadCount: count || 0 };
    } catch (error) {
      console.error("❌ Erreur unread count:", error);
      return { success: false, error: error.message, unreadCount: 0 };
    }
  }

  /**
   * Supprimer une conversation
   */
  async deleteConversation(conversationId) {
    try {
      const { error: msgError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId);

      if (msgError) throw msgError;

      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      console.log("✅ Conversation supprimée");
      return { success: true };
    } catch (error) {
      console.error("❌ Erreur suppression:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Chercher des conversations
   */
  async searchConversations(userId, searchTerm) {
    try {
      if (!searchTerm || searchTerm.length < 2)
        return { success: true, conversations: [] };

      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          user1:user1_id(id, first_name, last_name, email),
          user2:user2_id(id, first_name, last_name, email)
        `,
        )
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (error) throw error;

      const filtered =
        data?.filter((conv) => {
          const otherUser = conv.user1_id === userId ? conv.user2 : conv.user1;
          const fullName =
            `${otherUser.first_name} ${otherUser.last_name}`.toLowerCase();
          return fullName.includes(searchTerm.toLowerCase());
        }) || [];

      return { success: true, conversations: filtered };
    } catch (error) {
      console.error("❌ Erreur recherche:", error);
      return { success: false, error: error.message, conversations: [] };
    }
  }

  /**
   * Subscribe aux nouveaux messages (Realtime)
   */
  subscribeToMessages(conversationId, callback) {
    try {
      const subscription = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            console.log("📨 Nouveau message:", payload.new);
            callback(payload.new);
          },
        )
        .subscribe();

      return subscription;
    } catch (error) {
      console.error("❌ Erreur subscription:", error);
      return null;
    }
  }
}

export const chatService = new ChatService();
