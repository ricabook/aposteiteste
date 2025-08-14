
-- =========================
-- Notifications infra
-- =========================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM (
      'balance_credit',
      'bet_placed',
      'bet_closed',
      'poll_resolved',
      'poll_cancelled',
      'poll_approved',
      'withdrawal_confirmed'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "No direct inserts by clients"
ON public.notifications
FOR INSERT
TO PUBLIC
WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.notify(
  _user_id UUID,
  _type public.notification_type,
  _title TEXT,
  _body TEXT,
  _metadata JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (_user_id, _type, _title, _body, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.notify(UUID, public.notification_type, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify(UUID, public.notification_type, TEXT, TEXT, JSONB) TO PUBLIC;

CREATE OR REPLACE FUNCTION public.tg_wallet_tx_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  amt NUMERIC;
  ttype TEXT;
  title TEXT;
  body TEXT;
BEGIN
  amt := COALESCE(NEW.amount, 0);
  ttype := COALESCE(NEW.transaction_type, '');

  IF amt > 0 AND ttype IN ('deposit','bet_payout','admin_adjustment','refund') THEN
    title := 'Você recebeu R$ ' || TO_CHAR(amt, 'FM9999990D00');
    body  := CASE ttype
      WHEN 'deposit'         THEN 'Depósito confirmado no seu saldo.'
      WHEN 'bet_payout'      THEN 'Pagamento recebido por aposta.'
      WHEN 'admin_adjustment'THEN 'Ajuste positivo realizado por um admin.'
      WHEN 'refund'          THEN 'Você recebeu um reembolso.'
      ELSE 'Crédito recebido.'
    END;

    PERFORM public.notify(
      NEW.user_id,
      'balance_credit',
      title,
      body,
      jsonb_build_object(
        'transaction_id', NEW.id,
        'transaction_type', ttype,
        'amount', amt
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_tx_notify ON public.wallet_transactions;
CREATE TRIGGER wallet_tx_notify
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.tg_wallet_tx_notify();

CREATE OR REPLACE FUNCTION public.tg_bet_placed_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  p_title TEXT;
BEGIN
  SELECT title INTO p_title FROM public.polls WHERE id = NEW.poll_id;
  PERFORM public.notify(
    NEW.user_id,
    'bet_placed',
    'Aposta realizada',
    'Você apostou na enquete: ' || COALESCE(p_title, ''),
    jsonb_build_object(
      'bet_id', NEW.id,
      'poll_id', NEW.poll_id,
      'option', NEW.option_chosen,
      'amount', NEW.amount,
      'odds', NEW.odds
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bet_placed_notify ON public.bets;
CREATE TRIGGER bet_placed_notify
AFTER INSERT ON public.bets
FOR EACH ROW EXECUTE FUNCTION public.tg_bet_placed_notify();

CREATE OR REPLACE FUNCTION public.tg_bet_closed_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  p_title TEXT;
BEGIN
  IF COALESCE(OLD.is_closed, FALSE) = FALSE AND COALESCE(NEW.is_closed, FALSE) = TRUE THEN
    SELECT title INTO p_title FROM public.polls WHERE id = NEW.poll_id;
    PERFORM public.notify(
      NEW.user_id,
      'bet_closed',
      'Aposta encerrada',
      'Sua aposta em "' || COALESCE(p_title, '') || '" foi encerrada com sucesso.',
      jsonb_build_object(
        'bet_id', NEW.id,
        'poll_id', NEW.poll_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bet_closed_notify ON public.bets;
CREATE TRIGGER bet_closed_notify
AFTER UPDATE OF is_closed ON public.bets
FOR EACH ROW EXECUTE FUNCTION public.tg_bet_closed_notify();

CREATE OR REPLACE FUNCTION public.tg_poll_resolved_or_cancelled_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  ntype public.notification_type;
  p_title TEXT;
BEGIN
  IF (COALESCE(OLD.is_resolved, FALSE) = FALSE AND COALESCE(NEW.is_resolved, FALSE) = TRUE)
     OR (OLD.winning_option IS DISTINCT FROM NEW.winning_option AND NEW.winning_option = 'cancelled') THEN

    SELECT title INTO p_title FROM public.polls WHERE id = NEW.id;
    ntype := CASE WHEN NEW.winning_option = 'cancelled' THEN 'poll_cancelled' ELSE 'poll_resolved' END;

    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    SELECT DISTINCT
      b.user_id,
      ntype,
      CASE WHEN ntype = 'poll_cancelled'
           THEN 'Enquete cancelada'
           ELSE 'Enquete resolvida'
      END AS title,
      CASE WHEN ntype = 'poll_cancelled'
           THEN 'A enquete "' || COALESCE(p_title,'') || '" foi cancelada.'
           ELSE 'A enquete "' || COALESCE(p_title,'') || '" foi resolvida. Opção vencedora: ' || COALESCE(NEW.winning_option,'')
      END AS body,
      jsonb_build_object('poll_id', NEW.id, 'winning_option', NEW.winning_option)
    FROM public.bets b
    WHERE b.poll_id = NEW.id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS poll_resolve_notify ON public.polls;
CREATE TRIGGER poll_resolve_notify
AFTER UPDATE OF is_resolved, winning_option ON public.polls
FOR EACH ROW EXECUTE FUNCTION public.tg_poll_resolved_or_cancelled_notify();

CREATE OR REPLACE FUNCTION public.tg_poll_approved_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF COALESCE(OLD.is_active, TRUE) = FALSE AND COALESCE(NEW.is_active, FALSE) = TRUE THEN
    PERFORM public.notify(
      NEW.created_by,
      'poll_approved',
      'Sua enquete foi aprovada',
      'A enquete "' || COALESCE(NEW.title,'') || '" está ativa no site.',
      jsonb_build_object('poll_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS poll_approved_notify ON public.polls;
CREATE TRIGGER poll_approved_notify
AFTER UPDATE OF is_active ON public.polls
FOR EACH ROW EXECUTE FUNCTION public.tg_poll_approved_notify();

CREATE OR REPLACE FUNCTION public.tg_withdrawal_confirmed_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'confirmed' THEN
    PERFORM public.notify(
      NEW.user_id,
      'withdrawal_confirmed',
      'Saque aprovado',
      'Seu saque de R$ ' || TO_CHAR(NEW.amount, 'FM9999990D00') || ' foi aprovado.',
      jsonb_build_object('withdrawal_id', NEW.id, 'amount', NEW.amount)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS withdrawal_confirmed_notify ON public.withdrawals;
CREATE TRIGGER withdrawal_confirmed_notify
AFTER UPDATE OF status ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.tg_withdrawal_confirmed_notify();

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
