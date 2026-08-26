-- ============================================
-- CHAT_TABLES.sql
-- Tables + RLS pour la messagerie Parent ↔ Professeur ↔ Admin
-- ============================================
-- src/services/ChatService.js interroge déjà "conversations" et "messages" mais ces
-- tables n'existaient dans aucun fichier SQL du repo. Ce script les crée et verrouille
-- leur accès. À exécuter dans l'éditeur SQL Supabase, après supabase-security-rls.sql
-- (dépend de public.get_user_role()).

-- 1. TABLE conversations
-- Une conversation est une paire (user1, user2) — généralement un parent et un
-- professeur. L'admin n'est PAS un participant fixe de chaque conversation : il a un
-- accès transverse en lecture/écriture à toutes les conversations (policies plus bas),
-- ce qui lui permet de "participer" à n'importe quel échange sans changer ce modèle
-- à deux participants.
-- user1_id/user2_id référencent user_profiles (pas auth.users directement) : c'est
-- ce qui permet à ChatService.getUserConversations() d'embarquer
-- "user1:user1_id(id, first_name, last_name, email)" via PostgREST — auth.users n'a
-- pas ces colonnes, user_profiles.id référence de toute façon déjà auth.users(id).
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user1_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  user1_type TEXT NOT NULL,
  user2_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- 2. TABLE messages
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;

-- 3. RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- conversations : lecture/écriture pour les deux participants + admin (accès transverse)
DROP POLICY IF EXISTS "Lecture participant ou admin" ON conversations;
CREATE POLICY "Lecture participant ou admin" ON conversations FOR SELECT
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
    OR public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Création par un participant" ON conversations;
CREATE POLICY "Création par un participant" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Mise à jour participant ou admin" ON conversations;
CREATE POLICY "Mise à jour participant ou admin" ON conversations FOR UPDATE
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
    OR public.get_user_role() = 'admin'
  )
  WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
    OR public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Suppression admin seulement" ON conversations;
CREATE POLICY "Suppression admin seulement" ON conversations FOR DELETE
  USING (public.get_user_role() = 'admin');

-- messages : accessibles à qui peut voir la conversation parente (participant ou admin)
DROP POLICY IF EXISTS "Lecture participant ou admin" ON messages;
CREATE POLICY "Lecture participant ou admin" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR public.get_user_role() = 'admin'
  );

-- Envoi : l'expéditeur doit être soi-même (pas d'usurpation), et doit être participant
-- de la conversation OU admin (l'admin peut donc bien "participer" à n'importe quel
-- échange sans en être un participant permanent).
DROP POLICY IF EXISTS "Envoi par participant ou admin" ON messages;
CREATE POLICY "Envoi par participant ou admin" ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
      )
      OR public.get_user_role() = 'admin'
    )
  );

-- Marquer comme lu : participant ou admin (pas besoin d'être l'expéditeur)
DROP POLICY IF EXISTS "Marquer lu par participant ou admin" ON messages;
CREATE POLICY "Marquer lu par participant ou admin" ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR public.get_user_role() = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Suppression admin seulement" ON messages;
CREATE POLICY "Suppression admin seulement" ON messages FOR DELETE
  USING (public.get_user_role() = 'admin');

-- 4. Activer Supabase Realtime sur ces deux tables (nécessaire pour
-- ChatService.subscribeToMessages) — sans erreur si déjà fait.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================
-- FIN
-- ============================================
