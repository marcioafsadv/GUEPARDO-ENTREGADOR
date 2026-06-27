-- ====================================================================
-- GUEPARDO: BACKFILL - Criar transações para Turnos Fixos já existentes
-- ====================================================================
-- Execute este script no SQL Editor do Supabase para corrigir
-- os registros de Turno Fixo que existiam ANTES do trigger ser instalado.
-- O script é seguro e idempotente (pode ser rodado várias vezes sem duplicar).
-- ====================================================================

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
)
SELECT 
    gen_random_uuid(),
    ds.user_id,
    ds.earnings,
    'Turno Fixo',
    'completed',
    NOW(),
    ds.date,
    NOW()::time,
    'current'
FROM public.daily_stats ds
WHERE ds.earnings = 170   -- Valor da diária do Turno Fixo
  AND NOT EXISTS (         -- Evita duplicações
    SELECT 1 
    FROM public.transactions t
    WHERE t.user_id = ds.user_id
      AND t.type = 'Turno Fixo'
      AND t.date = ds.date
  );

-- Verificar resultado: deve mostrar as transações criadas
SELECT 
    t.id,
    p.full_name,
    t.amount,
    t.type,
    t.date,
    t.created_at
FROM public.transactions t
LEFT JOIN public.profiles p ON p.id = t.user_id
WHERE t.type = 'Turno Fixo'
ORDER BY t.date DESC;
