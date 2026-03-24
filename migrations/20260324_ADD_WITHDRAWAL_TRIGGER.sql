-- ====================================================================
-- GUEPARDO: TRIGGER DE BLOQUEIO DE SALDO (ANTECIPAÇÃO)
-- ====================================================================
-- Este script automatiza a criação de uma transação "Pendente" sempre que
-- um entregador solicita um repasse. Isso evita que o app precise de 
-- permissões de escrita na tabela de transações (mais seguro).

-- 1. Função que cria a transação a partir da solicitação
CREATE OR REPLACE FUNCTION public.handle_withdrawal_request_transaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.transactions (
        user_id,
        amount,
        type,
        status,
        created_at
    ) VALUES (
        NEW.user_id,
        -NEW.amount, -- Valor negativo para subtrair do saldo
        'Saque',
        'pending',
        NEW.created_at
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

-- 3. (OPCIONAL) Ajuste de RLS para garantir que o entregador possa ver suas solicitações
-- Se já existir, o Supabase apenas ignorará.
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can insert their own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Drivers can insert their own withdrawal requests"
    ON public.withdrawal_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);
