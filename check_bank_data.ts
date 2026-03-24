
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3R3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBankAccounts() {
    console.log("Checking bank_accounts table...");
    try {
        const { data, error } = await supabase.from('bank_accounts').select('*').limit(5);
        if (error) {
            console.log(`Error: ${error.message}`);
        } else {
            console.log(`Table exists. Found ${data?.length} rows.`);
            if (data && data.length > 0) {
                console.log("Columns:", Object.keys(data[0]).join(', '));
                console.log("Data:", JSON.stringify(data, null, 2));
            } else {
                // Try to get columns even if empty by looking at a different query
                const { error: colError } = await supabase.from('bank_accounts').insert({}).select();
                // This will fail but might give column hint in error or if it semi-succeeds
                console.log("Bank Accounts table is empty.");
            }
        }
    } catch (e) {
        console.log(`Exception: ${e}`);
    }
}

checkBankAccounts();
