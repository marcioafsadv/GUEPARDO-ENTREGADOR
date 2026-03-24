
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAlanBank() {
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id, full_name');
  if (pError || !profiles || profiles.length === 0) {
    console.log("Error or no profiles:", pError);
    return;
  }
  
  const alan = profiles.find(p => p.full_name?.includes('Alan') || p.full_name?.includes('Allan') || p.name?.includes('Alan'));
  if (!alan) {
    console.log("Alan not found in profiles:", profiles);
    return;
  }
  
  console.log("Found Alan:", alan.id, alan.full_name);
  
  const { data: bankData, error: bError } = await supabase.from('bank_accounts').select('*').eq('user_id', alan.id);
  
  console.log("Bank data query error:", bError);
  console.log("Bank data result:", bankData);
}

checkAlanBank();
