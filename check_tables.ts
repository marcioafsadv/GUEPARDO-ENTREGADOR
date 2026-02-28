
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable(tableName: string) {
    try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1);
        if (error) {
            console.log(`Table '${tableName}': Error - ${error.message}`);
        } else {
            console.log(`Table '${tableName}': Exists (Found ${data.length} rows)`);
            if (data.length > 0) console.log('Sample data:', data[0]);
        }
    } catch (e) {
        console.log(`Table '${tableName}': Exception - ${e}`);
    }
}

async function run() {
    await checkTable('orders');
    await checkTable('missions');
    await checkTable('deliveries');
    await checkTable('requests');
    await checkTable('calls');
}

run();
