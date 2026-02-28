
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        const idx = line.indexOf('=');
        if (idx === -1) return;
        const key = line.substring(0, idx).trim();
        let value = line.substring(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ID from debug_log.txt
const TARGET_ID = '3924743f-6be5-4d68-ad18-ccf75487d252';

async function patchDriver() {
    console.log(`Patching driver ${TARGET_ID} with name and vehicle...`);

    const { data, error } = await supabase
        .from('profiles')
        .update({
            name: 'Marcio (Teste Manual)',
            vehicle_type: 'moto',
            is_online: true,
            last_location_update: new Date().toISOString()
        })
        .eq('id', TARGET_ID)
        .select();

    if (error) {
        console.error("Patch Error:", error);
    } else {
        console.log("SUCCESS! Driver patched:", data);
    }
}

patchDriver();
