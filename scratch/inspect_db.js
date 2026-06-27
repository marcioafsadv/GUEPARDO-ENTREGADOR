import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseKey = 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const userId = '14e34d4b-20e3-4804-bb91-f70b19f10b75';
  console.log(`--- DELIVERIES FOR USER ${userId} ---`);
  
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('driver_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching deliveries:', error.message);
  } else {
    console.log(`Found ${deliveries.length} deliveries:`);
    deliveries.forEach(d => {
      console.log(`ID: ${d.id}, CreatedAt: ${d.created_at}, Store: ${d.store_name}, Earnings: ${d.earnings}, Status: ${d.status}, Items:`, JSON.stringify(d.items));
    });
  }
}

inspect();
