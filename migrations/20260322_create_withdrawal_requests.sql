-- 1. Criar a tabela de solicitações de saque (Repasses)
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    pix_key TEXT NOT NULL,
    pix_key_type TEXT, -- cpf, cnpj, email, phone, evp
    status TEXT DEFAULT 'pending' NOT NULL, -- pending, processing, completed, failed
    created_at timestamptz DEFAULT now() NOT NULL,
    processed_at timestamptz,
    external_payout_id text,
    error_message text
);

-- 2. Habilitar RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS
-- Entregadores podem ver suas próprias solicitações
CREATE POLICY "Drivers can view their own withdrawal requests"
    ON public.withdrawal_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Entregadores podem inserir suas próprias solicitações
CREATE POLICY "Drivers can insert their own withdrawal requests"
    ON public.withdrawal_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins (regras baseadas na tabela profiles) podem gerenciar tudo
CREATE POLICY "Admins can manage all withdrawal requests"
    ON public.withdrawal_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            -- Ajuste o campo de role se necessário (comum é 'role' ou 'is_admin')
            -- AND (profiles.role = 'admin' OR profiles.is_admin = true)
        )
    );

-- 4. Garantir que a tabela de transações suporte o status 'pending' e o tipo 'Saque'
-- (A tabela já existe, estamos apenas garantindo a lógica de uso)
-- O Entregador APP vai inserir um registro em 'transactions' com:
-- type: 'Saque', amount: -VALOR, status: 'pending'
