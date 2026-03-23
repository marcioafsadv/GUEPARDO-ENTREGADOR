import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listColumns() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    
    let output = "";
    if (error) {
        output = `Error fetching profiles: ${error.message}`;
    } else if (data && data.length > 0) {
        output += "COLUMNS:\n";
        Object.keys(data[0]).sort().forEach(key => {
            output += `${key}\n`;
        });
        output += "\nSAMPLE DATA:\n";
        output += JSON.stringify(data[0], null, 2);
    } else {
        output = "Table 'profiles' is empty.";
    }
    
    fs.writeFileSync('columns_output.txt', output);
    console.log("Output written to columns_output.txt");
}

listColumns();
