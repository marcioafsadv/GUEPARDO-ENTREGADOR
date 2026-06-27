import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseKey = 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTriggers() {
  console.log('--- TRIGGERS AND FUNCTIONS INSPECTION ---');
  
  // We can query pg_trigger and pg_proc via a simple query if we have permissions
  // Note: Anon key might not have permissions to read pg_catalog tables, but let's try.
  // If pg_catalog is blocked, we can check if there are custom functions we can call or if we get an RLS/permission error.
  
  const queries = {
    triggers: `
      SELECT 
        tgname AS trigger_name,
        relname AS table_name,
        proname AS function_name
      FROM pg_trigger
      JOIN pg_class ON pg_class.oid = tgrelid
      JOIN pg_proc ON pg_proc.oid = tgfoid
      JOIN pg_namespace ON pg_namespace.oid = relnamespace
      WHERE nspname = 'public';
    `,
    functions: `
      SELECT 
        routine_name, 
        routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public';
    `
  };

  for (const [name, sql] of Object.entries(queries)) {
    try {
      // In Supabase, if we don't have direct SQL execution RPC, we can check what happens.
      // Wait, is there a custom SQL execution RPC? Let's check.
      // Usually, there is no direct SQL execution RPC unless defined.
      // Let's try to query public schemas or check if we can run it.
      const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
      if (error) {
        console.log(`Failed to run query '${name}' via RPC execute_sql:`, error.message);
      } else {
        console.log(`Query '${name}' results:`, data);
      }
    } catch (e) {
      console.log(`Error running query '${name}':`, e.message);
    }
  }
}

inspectTriggers();
