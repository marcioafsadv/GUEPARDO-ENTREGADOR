const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function searchDriver() {
  console.log("Searching for profile with name containing 'Jefferson'...");
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or('name.ilike.%Jefferson%,full_name.ilike.%Jefferson%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Profiles found:', JSON.stringify(data, null, 2));
}

searchDriver();
