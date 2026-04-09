
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('🔍 Checking columns for table: deliveries');
    const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error.message);
    } else if (data && data.length > 0) {
        console.log('✅ Columns found:', Object.keys(data[0]).join(', '));
    } else {
        console.log('⚠️ Table is empty, checking via workaround...');
        // Try to insert a dummy row or check system catalogs if possible (unlikely with anon key)
    }
}

checkSchema();
