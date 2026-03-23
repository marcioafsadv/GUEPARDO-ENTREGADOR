import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3R3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmail() {
  console.log('Testing if marcioafsadv@gmail.com exists in Auth...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'marcioafsadv@gmail.com',
    password: 'wrong-password-on-purpose'
  });

  if (error) {
    console.log('Result:', error.message);
    if (error.message.includes('Invalid login credentials')) {
      console.log('CONFIRMED: Email is registered.');
    } else if (error.message.includes('User not found') || error.message.includes('No user found')) {
      console.log('CONFIRMED: Email is NOT registered.');
    }
  } else {
    // Should not happen with wrong password
    console.log('Signed in successfully? Strange.');
  }
}

testEmail();
