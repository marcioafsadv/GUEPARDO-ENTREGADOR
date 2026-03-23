
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
    console.log("=== DEBUG REGISTRATION ===");
    const targetCpf = '230.438.948-12';
    
    // 1. Check profiles by CPF
    console.log(`Checking profile for CPF: ${targetCpf}`);
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('cpf', targetCpf);
    
    if (pError) console.error("Error fetching profile:", pError);
    else console.log("Profiles found:", JSON.stringify(profiles, null, 2));

    // 2. Check for profiles with name 'D'
    console.log("Checking profiles with name 'D'");
    const { data: dProfiles, error: dError } = await supabase
        .from('profiles')
        .select('*')
        .or('name.eq.D,full_name.eq.D');

    if (dError) console.error("Error fetching D profiles:", dError);
    else console.log("D Profiles found:", JSON.stringify(dProfiles, null, 2));

    // 3. Check for recent registrations (last 24h)
    console.log("Checking recent registrations...");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent, error: rError } = await supabase
        .from('profiles')
        .select('*')
        .gt('created_at', yesterday);

    if (rError) console.error("Error fetching recent profiles:", rError);
    else console.log(`Found ${recent?.length || 0} recent profiles.`);

    // 4. Try to find the AUTH user for this CPF if possible (though anon key might not allow it)
    console.log("Attempting to find auth user via RPC if available...");
    // Some projects have a helper RPC to check CPF existence
    const { data: exists, error: eError } = await supabase.rpc('check_cpf_exists', { p_cpf: targetCpf });
    if (eError) console.log("RPC check_cpf_exists not found or failed:", eError.message);
    else console.log("RPC check_cpf_exists result:", exists);
}

debug();
