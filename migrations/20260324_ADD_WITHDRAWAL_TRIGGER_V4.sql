-- ====================================================================
-- GUEPARDO: TRIGGER DE BLOQUEIO DE SALDO (ANTECIPAÇÃO) - V4 (FINALÍSSIMA)
-- ====================================================================
-- Corrigido: Geração explícita de UUID para a coluna 'id' para evitar
-- erro de "null value in column id violates not-null constraint".

CREATE OR REPLACE FUNCTION public.handle_withdrawal_request_transaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.transactions (
        id, -- GERAÇÃO EXPLÍCITA DE UUID
        user_id,
        amount,
        type,
        status,
        created_at,
        date,
        time,
        week_id
    ) VALUES (
        gen_random_uuid(), -- GERANDO O UUID AQUI
        NEW.user_id,
        -NEW.amount, 
        'Saque',
        'pending',
        NEW.created_at,
        (NEW.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date,
        (NEW.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::time,
        'current' 
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-aplicar o trigger
DROP TRIGGER IF EXISTS tr_withdrawal_request_transaction ON public.withdrawal_requests;
CREATE TRIGGER tr_withdrawal_request_transaction
    AFTER INSERT ON public.withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_withdrawal_request_transaction();

-- Mantendo as permissões RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can view their own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Drivers can view their own withdrawal requests"
    ON public.withdrawal_requests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Drivers can insert their own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Drivers can insert their own withdrawal requests"
    ON public.withdrawal_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);
