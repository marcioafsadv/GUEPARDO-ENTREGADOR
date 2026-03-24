import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testOnlyWithdrawal() {
    console.log("Fetching a real user...");
    const { data: users, error: userError } = await supabase.from('profiles').select('id, full_name').limit(1);
    
    if (userError || !users || users.length === 0) {
        console.error("User fetch error:", userError);
        return;
    }
    const userId = users[0].id;
    console.log(`Using user ${users[0].full_name} (${userId})`);

    const testData = {
        user_id: userId,
        amount: 1.23,
        pix_key: 'test_pix_only_withdrawal',
        pix_key_type: 'email',
        status: 'pending',
        bank_name: 'Banco de Teste',
        bank_agency: '9999',
        bank_account: '99999-9',
        bank_type: 'corrente'
    };

    console.log("Attempting to insert into withdrawal_requests ONLY...");
    const { data, error } = await supabase.from('withdrawal_requests').insert([testData]).select();
    
    let output = "";
    if (error) {
        output = `Withdrawal Request Insert Error: ${error.message}\nCode: ${error.code}\nHint: ${error.hint}`;
    } else {
        output = "Successfully inserted into withdrawal_requests!\n" + JSON.stringify(data, null, 2);
    }
    
    fs.writeFileSync('test_only_withdrawal_output.txt', output);
    console.log("Output written to test_only_withdrawal_output.txt");
}

testOnlyWithdrawal();
