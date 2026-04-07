-- Migration: Adiciona o status 'picking_up' na tabela deliveries
-- Isso corrige o bug onde o app travava entre ARRIVED_AT_STORE e GOING_TO_CUSTOMER
-- porque não havia status intermediário para a tela de confirmação de código de coleta.

-- 1. Verificar e alterar o check constraint existente (se houver)
DO $$
BEGIN
    -- Remover constraint existente de status se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'deliveries' 
        AND constraint_name = 'deliveries_status_check'
    ) THEN
        ALTER TABLE deliveries DROP CONSTRAINT deliveries_status_check;
    END IF;

    -- Remover outras variações comuns de nome de constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'deliveries' 
        AND constraint_name = 'deliveries_status_fkey'
    ) THEN
        ALTER TABLE deliveries DROP CONSTRAINT deliveries_status_fkey;
    END IF;
END$$;

-- 2. Adicionar novo constraint incluindo 'picking_up'
ALTER TABLE deliveries 
ADD CONSTRAINT deliveries_status_check 
CHECK (status IN (
    'pending',
    'accepted',
    'arrived_pickup',
    'picking_up',
    'in_transit',
    'arrived_at_customer',
    'returning',
    'completed',
    'cancelled'
));

-- 3. Garantir que pedidos existentes com arrived_pickup não são afetados
-- (nenhuma atualização de dados necessária, apenas o schema)

-- 4. Adicionar picking_up ao filtro de active deliveries (já coberto pelo getActiveDelivery)
-- Comentário informativo para o getActiveDelivery em supabase.ts:
-- Lembrar de adicionar 'picking_up' na lista de status ativos no frontend.
