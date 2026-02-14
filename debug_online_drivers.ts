
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOnlineDrivers() {
    console.log("Checking for online drivers in 'profiles' table...");

    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, is_online, current_lat, current_lng, last_location_update')
        .eq('is_online', true);

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log(`Found ${data.length} online drivers:`);
    data.forEach(driver => {
        console.log(`- [${driver.name || 'Unknown'}] ID: ${driver.id}`);
        console.log(`  Location: ${driver.current_lat}, ${driver.current_lng}`);
        console.log(`  Last Update: ${driver.last_location_update}`);

        // Check if update is recent (within last 5 minutes)
        const lastUpdate = new Date(driver.last_location_update);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastUpdate.getTime()) / 60000;
        console.log(`  Time since update: ${diffMinutes.toFixed(2)} minutes`);
    });
}

checkOnlineDrivers();
