const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3R3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfileByCPF() {
  const cpf = '230.438.948-12'.replace(/\D/g, '');
  console.log(`Checking profiles for CPF: ${cpf}...`);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('cpf', cpf);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Profiles found:', JSON.stringify(data, null, 2));
}

checkProfileByCPF();
