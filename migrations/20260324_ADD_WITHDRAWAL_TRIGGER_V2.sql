-- ====================================================================
-- GUEPARDO: TRIGGER DE BLOQUEIO DE SALDO (ANTECIPAÇÃO) - V2 (CORRIGIDA)
-- ====================================================================
-- Esta versão inclui campos obrigatórios como 'date', 'time' e 'week_id'
-- que são necessários para que a transação seja válida no banco de dados.

-- 1. Função que cria a transação a partir da solicitação
CREATE OR REPLACE FUNCTION public.handle_withdrawal_request_transaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.transactions (
        user_id,
        amount,
        type,
        status,
        created_at,
        date,
        time,
        week_id
    ) VALUES (
        NEW.user_id,
        -NEW.amount, -- Valor negativo para subtrair do saldo
        'Saque',
        'pending',
        NEW.created_at,
        (NEW.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date,
        to_char(NEW.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
        'current' -- ID da semana atual usado pelo app
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger que dispara após a inserção na withdrawal_requests
DROP TRIGGER IF EXISTS tr_withdrawal_request_transaction ON public.withdrawal_requests;
CREATE TRIGGER tr_withdrawal_request_transaction
    AFTER INSERT ON public.withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_withdrawal_request_transaction();

-- 3. Garantir Políticas de RLS para withdrawal_requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can view their own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Drivers can view their own withdrawal requests"
    ON public.withdrawal_requests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Drivers can insert their own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Drivers can insert their own withdrawal requests"
    ON public.withdrawal_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);
