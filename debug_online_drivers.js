
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Simulate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envPath = path.resolve(__dirname, '.env.local');
console.log("Loading .env from:", envPath);

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;

        // Simple split by first =
        const idx = line.indexOf('=');
        if (idx === -1) return;

        const key = line.substring(0, idx).trim();
        let value = line.substring(idx + 1).trim();

        // Remove wrapping quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        process.env[key] = value;
    });
} else {
    console.log(".env.local file not found at", envPath);
    process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log(`URL: ${supabaseUrl}`);
if (!supabaseKey || !supabaseKey.startsWith('ey')) {
    console.log("WARNING: Key doesn't look like a standard JWT (doesn't start with 'ey')");
    console.log(`Key check: ${supabaseKey ? supabaseKey.substring(0, 5) + '...' : 'MISSING'}`);
} else {
    console.log("Key looks like a valid JWT.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOnlineDrivers() {
    console.log("Checking for online drivers...");

    try {
        const { data, error, count } = await supabase
            .from('profiles')
            .select('id, is_online, current_lat, current_lng, last_location_update', { count: 'exact' })
            .eq('is_online', true);

        if (error) {
            console.error("Error fetching profiles:", error);
            return;
        }

        console.log(`Found ${data.length} online drivers.`);

        if (data.length > 0) {
            data.forEach(driver => {
                console.log(`- Driver: ${driver.name} (ID: ${driver.id})`);
                console.log(`  Lat/Lng: ${driver.current_lat}, ${driver.current_lng}`);
                console.log(`  Updated: ${driver.last_location_update}`);

                const lastUpdate = new Date(driver.last_location_update);
                const now = new Date();
                const diffMinutes = (now.getTime() - lastUpdate.getTime()) / 60000;
                console.log(`  Age: ${diffMinutes.toFixed(2)} min`);
            });
        }

    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

checkOnlineDrivers();
