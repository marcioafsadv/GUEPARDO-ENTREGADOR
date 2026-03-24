
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedAlanBank() {
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
  
  console.log("Found Alan:", alan.id);
  
  // Try calling upsert via normal REST.
  // We need to bypass RLS if possible. If this is run via anon key, it will fail RLS if the user isn't logged in.
  // Wait, I can try it, but since I don't have the service key, the anon key could hit an RLS block.
  // Let's test it anyway.
  
  const testData = {
    user_id: alan.id,
    bank_name: 'Nubank',
    agency: '0001',
    account_number: '000000-0',
    account_type: 'Conta Corrente',
    pix_key: 'alan.elias@guepardo.com'
  };

  const { data: bData, error: bError } = await supabase
    .from('bank_accounts')
    .upsert(testData)
    .select();
    
  if (bError) {
      console.log("Failed to insert into bank_accounts (likely RLS):", bError.message);
  } else {
      console.log("Successfully seeded Alan's bank data!");
  }
}

seedAlanBank();
