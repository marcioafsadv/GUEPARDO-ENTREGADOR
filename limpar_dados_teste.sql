-- ══════════════════════════════════════════════════════════════════════
-- SCRIPT DE LIMPEZA DE DADOS DE TESTE - GUEPARDO ENTREGADOR
-- ══════════════════════════════════════════════════════════════════════
-- Este script remove as entregas de teste, transações e zera as estatísticas
-- dos entregadores Guilherme, Diego e Alexsandro.
-- Execute este script no SQL Editor do seu console Supabase.

-- IDs dos entregadores:
-- Guilherme: 'b5ab6b11-0fbb-46ad-9629-5214820c1529'
-- Diego: '18162ee9-cc64-45d7-bd52-d140e1f320a5'
-- Alexsandro: '3c33f39e-539f-4ffa-95a3-2c996d612e3d'

-- 1. Remover transações dos entregadores
DELETE FROM public.transactions 
WHERE user_id IN (
  'b5ab6b11-0fbb-46ad-9629-5214820c1529', -- Guilherme
  '18162ee9-cc64-45d7-bd52-d140e1f320a5', -- Diego
  '3c33f39e-539f-4ffa-95a3-2c996d612e3d'  -- Alexsandro
);

-- 2. Remover solicitações de saque dos entregadores (se houver)
DELETE FROM public.withdrawal_requests 
WHERE user_id IN (
  'b5ab6b11-0fbb-46ad-9629-5214820c1529',
  '18162ee9-cc64-45d7-bd52-d140e1f320a5',
  '3c33f39e-539f-4ffa-95a3-2c996d612e3d'
);

-- 3. Remover entregas concluídas de teste dos entregadores
DELETE FROM public.deliveries 
WHERE driver_id IN (
  'b5ab6b11-0fbb-46ad-9629-5214820c1529',
  '18162ee9-cc64-45d7-bd52-d140e1f320a5',
  '3c33f39e-539f-4ffa-95a3-2c996d612e3d'
);

-- 4. Remover estatísticas diárias dos entregadores
DELETE FROM public.daily_stats 
WHERE user_id IN (
  'b5ab6b11-0fbb-46ad-9629-5214820c1529',
  '18162ee9-cc64-45d7-bd52-d140e1f320a5',
  '3c33f39e-539f-4ffa-95a3-2c996d612e3d'
);

-- 5. Atualizar o status dos entregadores para offline (opcional, garante que voltem ao lobby limpos)
UPDATE public.profiles 
SET is_online = false,
    current_lat = null,
    current_lng = null,
    last_location_update = null
WHERE id IN (
  'b5ab6b11-0fbb-46ad-9629-5214820c1529',
  '18162ee9-cc64-45d7-bd52-d140e1f320a5',
  '3c33f39e-539f-4ffa-95a3-2c996d612e3d'
);
