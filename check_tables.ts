
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  const { error: aError } = await supabase.from('addresses').select('id').limit(1);
  const { error: vError } = await supabase.from('vehicles').select('id').limit(1);
  const { error: bError } = await supabase.from('bank_accounts').select('id').limit(1);
  
  console.log("Addresses error:", aError ? aError.message : "OK");
  console.log("Vehicles error:", vError ? vError.message : "OK");
  console.log("Bank Accounts error:", bError ? bError.message : "OK");
}

checkTables();
