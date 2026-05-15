
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log('Testing "carro" insertion...');
    const { error } = await supabase
        .from('vehicles')
        .insert([{ 
            user_id: '00000000-0000-0000-0000-000000000000', 
            vehicle_type: 'carro', 
            plate: 'TESTCAR', 
            model: 'Test', 
            color: 'Black',
            cnh_number: '00000000000'
        }]);

    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Success! "carro" is accepted.');
        await supabase.from('vehicles').delete().eq('plate', 'TESTCAR');
    }
}

test();
