
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('Checking database for "carro" vehicle type...');
    // Try to insert a 'carro' and see if it fails
    const { data, error } = await supabase
        .from('vehicles')
        .insert([{ 
            user_id: '00000000-0000-0000-0000-000000000000', 
            vehicle_type: 'carro',
            plate: 'TEST001',
            model: 'Test',
            year: 2024,
            color: 'Black'
        }])
        .select();

    if (error) {
        console.log('Error inserting carro:', error.message);
        if (error.message.includes('check constraint') || error.message.includes('invalid input value for enum')) {
            console.log('Database NEEDS migration for "carro"');
        } else {
            console.log('Other error:', error.code, error.details);
        }
    } else {
        console.log('Database accepts "carro"');
        // Clean up
        await supabase.from('vehicles').delete().eq('plate', 'TEST001');
    }
}

check();
