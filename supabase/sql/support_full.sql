
-- SUPPORT MODULE (Tickets + Messages) — Run in Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE public.ticket_status AS ENUM ('aberto', 'resolvido');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_author_role') THEN
    CREATE TYPE public.ticket_author_role AS ENUM ('user', 'admin');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  assunto TEXT NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'aberto',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  autor_role public.ticket_author_role NOT NULL,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id, created_at);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Policies: tickets
DROP POLICY IF EXISTS "tickets_select_access" ON public.tickets;
CREATE POLICY "tickets_select_access"
ON public.tickets FOR SELECT
USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "tickets_insert_owner_or_admin" ON public.tickets;
CREATE POLICY "tickets_insert_owner_or_admin"
ON public.tickets FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "tickets_update_admin_only" ON public.tickets;
CREATE POLICY "tickets_update_admin_only"
ON public.tickets FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "tickets_delete_admin_only" ON public.tickets;
CREATE POLICY "tickets_delete_admin_only"
ON public.tickets FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Policies: ticket_messages
DROP POLICY IF EXISTS "ticket_messages_select_access" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select_access"
ON public.ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
      AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

DROP POLICY IF EXISTS "ticket_messages_insert_open_and_role" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_open_and_role"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
      AND t.status = 'aberto'
      AND (
        (t.user_id = auth.uid() AND autor_role = 'user')
        OR (public.has_role(auth.uid(), 'admin') AND autor_role = 'admin')
      )
  )
);

-- Note: updates/deletes diretos em ticket_messages não são necessários; usamos insert-only histórico.
