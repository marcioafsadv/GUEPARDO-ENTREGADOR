-- ====================================================================
-- GUEPARDO: AJUSTE FINANCEIRO ENTREGA #7838 + TRIGGER AUTOMÁTICO DE GANHOS
-- Data: 14/10/2026
-- ====================================================================
-- Objetivo:
-- 1. Creditar imediatamente os R$ 8,78 da Entrega #7838 na carteira e nas estatísticas
--    do entregador Márcio Augusto Ferreira da Silva (ID: 14e34d4b-20e3-4804-bb91-f70b19f10b75).
-- 2. Criar Trigger definitivo no banco de dados (SECURITY DEFINER) para que
--    TODA entrega finalizada credite a carteira e o resumo diário automaticamente,
--    eliminando falhas de conexão, restrições de RLS do cliente ou fechamentos externos.
-- ====================================================================

-- --------------------------------------------------------------------
-- PARTE 1: CRÉDITO RETROATIVO DA ENTREGA #7838 (MÁRCIO AUGUSTO)
-- --------------------------------------------------------------------
DO $$
DECLARE
  v_driver_id UUID := '14e34d4b-20e3-4804-bb91-f70b19f10b75';
  v_delivery_id UUID := 'ca736782-0340-46c0-a254-0068f2d2614b';
  v_amount NUMERIC := 8.78;
  v_date DATE := '2026-10-14';
  v_time TIME := '17:25:25';
BEGIN
  -- 1.1 Inserir transação no extrato do entregador caso ainda não conste
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE user_id = v_driver_id 
      AND (
        type = 'Entrega #7838' 
        OR (details->>'orderId')::text = v_delivery_id::text
      )
  ) THEN
    INSERT INTO public.transactions (
      id,
      user_id,
      amount,
      type,
      status,
      week_id,
      date,
      time,
      details,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_driver_id,
      v_amount,
      'Entrega #7838',
      'COMPLETED',
      'current',
      v_date,
      v_time,
      jsonb_build_object(
        'storeName', 'Espaço Brinquedos e Utilidades',
        'orderId', v_delivery_id,
        'displayId', 7838,
        'duration', '15 min',
        'stops', 1,
        'timeline', jsonb_build_array(
          jsonb_build_object('time', '17:05', 'description', 'Pedido Aceito', 'status', 'done'),
          jsonb_build_object('time', '17:14', 'description', 'Chegou ao Estabelecimento', 'status', 'done'),
          jsonb_build_object('time', '17:25', 'description', 'Entrega Concluída', 'status', 'done')
        )
      ),
      '2026-10-14 20:25:25.158+00'::timestamptz
    );
  END IF;

  -- 1.2 Atualizar daily_stats do dia 14/10/2026 para o Márcio
  INSERT INTO public.daily_stats (user_id, date, earnings, finished, accepted, rejected)
  VALUES (v_driver_id, v_date, v_amount, 1, 1, 0)
  ON CONFLICT (user_id, date) DO UPDATE
  SET earnings = COALESCE(public.daily_stats.earnings, 0) + EXCLUDED.earnings,
      finished = COALESCE(public.daily_stats.finished, 0) + EXCLUDED.finished;

END;
$$;


-- --------------------------------------------------------------------
-- PARTE 2: TRIGGER AUTOMÁTICO DEFINITIVO (SECURITY DEFINER)
-- --------------------------------------------------------------------
-- Toda vez que uma corrida em public.deliveries for concluída (status = 'completed'),
-- o banco de dados credita a carteira e o resumo diário do entregador atomicamente.
CREATE OR REPLACE FUNCTION public.handle_delivery_completed_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_display_id TEXT;
  v_store_name TEXT;
  v_earnings NUMERIC;
  v_tz_time TIME;
  v_tz_date DATE;
  v_today_str TEXT;
BEGIN
  -- Só processa se o status for/virou 'completed'
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    
    -- Ignora entregas sem entregador ou com ganho zerado/nulo
    IF NEW.driver_id IS NULL OR COALESCE(NEW.earnings, 0) <= 0 THEN
      RETURN NEW;
    END IF;

    -- Extrai displayId e dados da entrega
    v_display_id := COALESCE(
      NEW.items->>'displayId',
      substring(NEW.id::text from length(NEW.id::text) - 3)
    );
    v_store_name := COALESCE(NEW.store_name, 'Estabelecimento');
    v_earnings := NEW.earnings;
    v_tz_date := (COALESCE(NEW.completed_at, NOW()) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date;
    v_tz_time := (COALESCE(NEW.completed_at, NOW()) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::time;
    v_today_str := to_char(COALESCE(NEW.completed_at, NOW()) AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');

    -- Deduplicação: se já existir transação vinculada a este orderId ou entrega recente, não duplicar
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE user_id = NEW.driver_id
        AND (
          (details->>'orderId')::text = NEW.id::text
          OR (type = 'Entrega #' || v_display_id AND created_at >= NOW() - INTERVAL '1 hour')
        )
    ) THEN
      RETURN NEW;
    END IF;

    -- 1. Cria a transação na carteira do entregador
    INSERT INTO public.transactions (
      id,
      user_id,
      amount,
      type,
      status,
      week_id,
      date,
      time,
      details,
      created_at
    ) VALUES (
      gen_random_uuid(),
      NEW.driver_id,
      v_earnings,
      'Entrega #' || v_display_id,
      'COMPLETED',
      'current',
      v_tz_date,
      v_tz_time,
      jsonb_build_object(
        'storeName', v_store_name,
        'orderId', NEW.id,
        'displayId', v_display_id,
        'stops', COALESCE(NEW.stop_number, 1),
        'timeline', jsonb_build_array(
          jsonb_build_object('time', v_today_str, 'description', 'Entrega Concluída', 'status', 'done')
        )
      ),
      COALESCE(NEW.completed_at, NOW())
    );

    -- 2. Atualiza estatísticas do dia (daily_stats)
    INSERT INTO public.daily_stats (user_id, date, earnings, finished, accepted, rejected)
    VALUES (NEW.driver_id, v_tz_date, v_earnings, 1, 1, 0)
    ON CONFLICT (user_id, date) DO UPDATE
    SET earnings = COALESCE(public.daily_stats.earnings, 0) + EXCLUDED.earnings,
        finished = COALESCE(public.daily_stats.finished, 0) + EXCLUDED.finished;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-aplicar o trigger em public.deliveries
DROP TRIGGER IF EXISTS tr_delivery_completed_payment ON public.deliveries;
CREATE TRIGGER tr_delivery_completed_payment
  AFTER INSERT OR UPDATE OF status ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_delivery_completed_payment();

COMMENT ON FUNCTION public.handle_delivery_completed_payment() IS
  'Credita automaticamente a carteira (transactions) e o resumo diário (daily_stats) do entregador quando a entrega for concluída.';
