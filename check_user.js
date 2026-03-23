
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUser() {
    const cpf = '230.438.948-12';
    console.log(`Checking user with CPF: ${cpf}`);

    const { data: profile1, error: error1 } = await supabase
        .from('profiles')
        .select('*')
        .eq('cpf', cpf);

    if (error1) console.error("Error checking profiles by CPF:", error1.message);
    else console.log("Profiles by CPF:", JSON.stringify(profile1, null, 2));

    const { data: profile2, error: error2 } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', '(11) 98749-9545');

    if (error2) console.error("Error checking profiles by Phone:", error2.message);
    else console.log("Profiles by Phone:", JSON.stringify(profile2, null, 2));
}

checkUser();
