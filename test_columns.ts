
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testColumns() {
  const columnsToTest = ['id', 'user_id', 'bank_name', 'agency', 'account_number', 'account_type', 'pix_key'];
  
  for (const col of columnsToTest) {
    const { error } = await supabase.from('bank_accounts').select(col).limit(1);
    console.log(`Column '${col}':`, error ? error.message : "EXISTS");
  }
}

testColumns();
