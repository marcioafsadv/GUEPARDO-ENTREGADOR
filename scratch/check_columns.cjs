
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('No rows found, trying to get column names via RPC if possible...');
            // Since we can't easily get schema, let's try to insert a dummy row with vehicle_type
            const { error: insError } = await supabase
                .from('vehicles')
                .insert([{ user_id: '00000000-0000-0000-0000-000000000000', vehicle_type: 'moto', plate: 'TEST999', model: 'Test', color: 'Black' }]);
            
            if (insError) {
                console.log('Insert failed:', insError.message);
                if (insError.message.includes('column "vehicle_type" of relation "vehicles" does not exist')) {
                    console.log('COLUMN vehicle_type DOES NOT EXIST');
                }
            } else {
                console.log('Insert success! vehicle_type exists.');
                await supabase.from('vehicles').delete().eq('plate', 'TEST999');
            }
        }
    }
}

check();
