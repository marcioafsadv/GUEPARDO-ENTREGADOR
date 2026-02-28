
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
    console.log("Checking 'profiles' table for location columns...");

    // Try to select the specific columns. If they don't exist, this should error.
    const { data, error } = await supabase
        .from('profiles')
        .select('id, is_online, current_lat, current_lng, last_location_update')
        .limit(1);

    if (error) {
        console.error("Error confirming columns:", error.message);
        if (error.message.includes("does not exist") || error.code === '42703') {
            console.log("CONCLUSION: Columns are MISSING.");
        } else {
            console.log("CONCLUSION: Unknown error, possibly RLS or connectivity.");
        }
    } else {
        console.log("Success! Columns exist.");
        if (data.length > 0) {
            console.log("Sample row:", data[0]);
        } else {
            console.log("Table is empty, but columns appear to exist.");
        }
    }
}

checkColumns();
