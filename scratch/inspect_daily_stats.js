import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseKey = 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDailyStats() {
  console.log('--- INSPECTING DAILY STATS ---');
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('earnings', 170)
    .limit(10);

  if (error) {
    console.error('Error fetching daily stats:', error.message);
  } else {
    console.log(`Found ${data.length} rows with earnings = 170:`);
    console.log(JSON.stringify(data, null, 2));
  }
}

inspectDailyStats();
