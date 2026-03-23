
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listDrivers() {
    console.log("Listing all profiles...");
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, name, cpf, role, created_at');
    
    if (error) {
        console.error("Error fetching profiles:", error.message);
    } else {
        console.log(`Total profiles found: ${profiles?.length || 0}`);
        console.log(JSON.stringify(profiles, null, 2));
    }
}

listDrivers();
