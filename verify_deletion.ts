
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log("Verifying deletion of CPF 230.438.948-12...");
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('cpf', '230.438.948-12');
    
    if (error) {
        console.error("Error verifying:", error.message);
    } else {
        if (data && data.length > 0) {
            console.log("CRITICAL: Record still exists!");
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log("SUCCESS: Record deleted from profiles.");
        }
    }
}

verify();
