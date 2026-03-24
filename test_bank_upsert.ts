
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBankUpsert() {
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id, full_name');
  if (pError || !profiles) {
    console.log("Error or no profiles:", pError);
    return;
  }
  
  const alan = profiles.find(p => p.full_name?.includes('Alan') || p.full_name?.includes('Allan') || p.name?.includes('Alan'));
  if (!alan) {
    console.log("Alan not found.");
    return;
  }
  
  const payload = {
    user_id: alan.id,
    bank_name: 'Banco do Brasil',
    agency: '1880-5',
    account_number: '34010-3',
    account_type: 'Conta Corrente',
    pix_key: '11987499545'
  };

  console.log("Upserting payload:", payload);
  const { data, error } = await supabase
    .from('bank_accounts')
    .upsert(payload, { onConflict: 'user_id' }) // Adding onConflict just in case that's the 400
    .select();

  console.log("Error from upsert with onConflict:");
  console.log(JSON.stringify(error, null, 2));

  console.log("Trying without onConflict:");
  const { error: err2 } = await supabase
    .from('bank_accounts')
    .upsert(payload)
    .select();
  console.log(JSON.stringify(err2, null, 2));
}

testBankUpsert();
