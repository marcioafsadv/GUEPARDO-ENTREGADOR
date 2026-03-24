
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkResources() {
    let output = "Checking for pre-registration related resources...\n\n";
    
    // 1. Check specific likely names
    const tablesToCheck = [
        'pre_cadastro',
        'pre_registrations',
        'onboarding',
        'onboarding_data',
        'temp_profiles',
        'registration_data',
        'couriers_pre',
        'pre_entregadores'
    ];
    
    for (const table of tablesToCheck) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('not found')) {
                    // Ignore not found
                } else {
                    output += `Table '${table}': ${error.message}\n`;
                }
            } else {
                output += `Table '${table}' exists! Found ${data?.length} rows.\n`;
                if (data && data.length > 0) output += `Sample: ${JSON.stringify(data[0], null, 2)}\n`;
            }
        } catch (e) {
            output += `Error checking '${table}': ${e}\n`;
        }
    }
    
    // 2. Check profiles columns
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        if (data && data.length > 0) {
            output += "\nProfiles Columns:\n";
            output += Object.keys(data[0]).sort().join(', ') + "\n";
            output += "\nProfiles Sample Data:\n";
            output += JSON.stringify(data[0], null, 2) + "\n";
        } else {
            output += "\nProfiles table is empty or error: " + (error?.message || "Empty") + "\n";
        }
    } catch (e) {
        output += `Error checking profiles: ${e}\n`;
    }

    // 3. Check bank_accounts columns
    try {
        const { data, error } = await supabase.from('bank_accounts').select('*').limit(1);
        if (data && data.length > 0) {
            output += "\nBank Accounts Columns:\n";
            output += Object.keys(data[0]).sort().join(', ') + "\n";
            output += "\nBank Accounts Sample Data:\n";
            output += JSON.stringify(data[0], null, 2) + "\n";
        } else {
            output += "\nBank Accounts table is empty or error: " + (error?.message || "Empty") + "\n";
        }
    } catch (e) {
        output += `Error checking bank_accounts: ${e}\n`;
    }
    
    fs.writeFileSync('diagnostic_output.txt', output);
    console.log("Diagnostic output written to diagnostic_output.txt");
}

checkResources();
