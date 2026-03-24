
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3R3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAllTables() {
    console.log("Fetching all available tables via RPC or direct queries...");
    
    // Attempting to use a common RPC if it exists
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_tables');
    if (rpcError) {
        console.log("get_tables RPC not found or failed.");
    } else {
        console.log("RPC get_tables result:", rpcData);
    }

    // Checking common tables manually
    const tables = [
        'profiles', 'bank_accounts', 'addresses', 'vehicles', 
        'pre_cadastro', 'pre_registrations', 'registrations', 
        'temporary_registrations', 'couriers', 'entregadores',
        'withdrawal_requests', 'transactions'
    ];

    for (const table of tables) {
        const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error) {
            console.log(`Table exists: ${table} (Count: ${count})`);
        } else if (error.code !== '42P01') { // 42P01 is "relation does not exist"
            console.log(`Table ${table} might exist but returned error: ${error.message} (${error.code})`);
        }
    }
}

listAllTables();
