-- ====================================================================
-- GUEPARDO: TRIGGER DE SINCRONIZAÇÃO DE TURNO FIXO PARA SALDO
-- ====================================================================
-- Descrição: Este trigger detecta quando o Guepardo Lojista finaliza o turno
-- do entregador (atualizando daily_stats.earnings com o valor da diária) e
-- cria automaticamente a transação correspondente na carteira do entregador,
-- tornando o valor disponível para saque (Saldo Disponível).
--
-- Lógica de deduplicação:
--   - Entregas avulsas normais: o APP cria a transação ANTES de chamar updateDailyStats.
--     Portanto, se já existe uma transação com o mesmo valor nos últimos 60 segundos,
--     o trigger NÃO cria uma nova (evita duplicação).
--   - Turno fixo (Lojista finaliza o turno): o Lojista atualiza diretamente o
--     daily_stats sem criar uma transação. O trigger cria a transação automaticamente.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.sync_shift_payment_to_transactions()
RETURNS TRIGGER AS $$
DECLARE
    diff NUMERIC;
    transaction_type TEXT;
BEGIN
    -- Calcula a diferença de ganhos adicionada nesta atualização
    IF TG_OP = 'INSERT' THEN
        diff := COALESCE(NEW.earnings, 0);
    ELSE
        diff := COALESCE(NEW.earnings, 0) - COALESCE(OLD.earnings, 0);
    END IF;

    -- Só processa se houve um aumento real nos ganhos
    IF diff <= 0 THEN
        RETURN NEW;
    END IF;

    -- Verifica se já existe uma transação recente com o mesmo valor para este usuário.
    -- Janela de 60 segundos: o app cria a transação ANTES de atualizar daily_stats,
    -- então se existir uma transação com o mesmo diff nos últimos 60s, é uma entrega
    -- normal e não devemos duplicar.
    IF EXISTS (
        SELECT 1 FROM public.transactions 
        WHERE user_id = NEW.user_id 
          AND amount = diff 
          AND created_at >= NOW() - INTERVAL '60 seconds'
    ) THEN
        -- Já existe transação recente com este valor → é uma entrega avulsa normal, pular.
        RETURN NEW;
    END IF;

    -- Determina o tipo de transação baseado no valor
    IF diff = 170.00 THEN
        transaction_type := 'Turno Fixo';
    ELSIF diff > 100 THEN
        transaction_type := 'Diária Turno Fixo';
    ELSE
        transaction_type := 'Ajuste de Ganhos';
    END IF;

    -- Cria a transação de crédito na carteira do entregador
    INSERT INTO public.transactions (
        id,
        user_id,
        amount,
        type,
        status,
        created_at,
        date,
        time,
        week_id
    ) VALUES (
        gen_random_uuid(),
        NEW.user_id,
        diff,
        transaction_type,
        'completed',
        NOW(),
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date,
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::time,
        'current'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplica o trigger na tabela 'daily_stats'
DROP TRIGGER IF EXISTS tr_sync_shift_payment_to_transactions ON public.daily_stats;
CREATE TRIGGER tr_sync_shift_payment_to_transactions
    AFTER INSERT OR UPDATE ON public.daily_stats
    FOR EACH ROW EXECUTE FUNCTION public.sync_shift_payment_to_transactions();

-- Garante que o trigger tem permissão de leitura nas transações (SECURITY DEFINER já faz isso)
COMMENT ON FUNCTION public.sync_shift_payment_to_transactions() IS 
    'Detecta pagamento de turno fixo no daily_stats e cria transação correspondente na carteira do entregador';
