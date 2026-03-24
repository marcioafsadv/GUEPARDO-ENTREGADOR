
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3R3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMetadata() {
    console.log("Probing for schemas and tables...");
    
    // We can't query information_schema directly with anon key usually,
    // but we can try to access some views if they are exposed.
    
    const { data: schemas, error } = await supabase.from('pg_namespace').select('nspname');
    if (error) {
        console.log("Cannot list schemas directly (expected with anon key).");
    } else {
        console.log("Schemas found:", schemas.map(s => s.nspname));
    }

    // Checking for a table that might be an import log
    const { data: importLog, error: importError } = await supabase.from('import_logs').select('*').limit(1);
    if (!importError) console.log("Found import_logs table!");

    // Checking for 'entregadores' (plural)
    const { data: eData, error: eError } = await supabase.from('entregadores').select('*').limit(1);
    if (!eError) console.log("Found entregadores table!");
}

checkMetadata();
