
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyWithdrawalFields() {
  console.log("Fetching an existing user...");
  const { data: users, error: userError } = await supabase.from('profiles').select('id, full_name').limit(1);
  
  if (userError || !users || users.length === 0) {
      console.log("Cannot find user:", userError);
      return;
  }
  const userId = users[0].id;
  console.log(`Using user ${users[0].full_name} (${userId}) for the test`);

  console.log("\nAttempting to create a test withdrawal request...");
  const testData = {
    user_id: userId,
    amount: 1.00,
    pix_key: 'test_pix_123',
    pix_key_type: 'PIX',
    status: 'pending',
    bank_name: 'Banco Guepardo',
    bank_agency: '0001',
    bank_account: '12345-6',
    bank_type: 'corrente',
    // Mock created_at so it does not fail
    created_at: new Date().toISOString()
  };

  const { data: insertData, error: insertError } = await supabase.from('withdrawal_requests').insert([testData]).select();

  if (insertError) {
      console.error("Failed to insert withdrawal request:", insertError);
      return;
  }

  const newId = insertData[0].id;
  console.log("Successfully created test request:", newId);

  // Re-fetch to verify
  const { data: fetched, error: fetchError } = await supabase.from('withdrawal_requests').select('*').eq('id', newId).single();

  if (fetchError) {
      console.error("Failed to re-fetch request:", fetchError);
      return;
  }

  console.log("\nVerification Results:");
  console.log("- Bank Name:", fetched.bank_name);
  console.log("- Bank Agency:", fetched.bank_agency);
  console.log("- Bank Account:", fetched.bank_account);
  console.log("- Bank Type:", fetched.bank_type);

  if (
    fetched.bank_name === 'Banco Guepardo' &&
    fetched.bank_account === '12345-6'
  ) {
    console.log("\n✅ SUCCESS: The bank columns were successfully populated!");
  } else {
    console.log("\n❌ ERROR: The bank columns did not save properly.");
  }
}

verifyWithdrawalFields();
