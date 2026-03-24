import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listRealTransactions() {
    console.log("Fetching real user from profiles...");
    const { data: users, error: userError } = await supabase.from('profiles').select('id, full_name').limit(5);
    
    if (userError) {
        console.error("User fetch error:", userError);
        return;
    }

    let output = "USERS FOUND:\n" + JSON.stringify(users, null, 2) + "\n\n";

    for (const user of users) {
        console.log(`Checking transactions for ${user.full_name} (${user.id})...`);
        const { data: txs, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .limit(3);
        
        if (txError) {
             output += `Error fetching txs for ${user.full_name}: ${txError.message}\n`;
        } else if (txs && txs.length > 0) {
             output += `TRANSACTIONS FOR ${user.full_name}:\n` + JSON.stringify(txs, null, 2) + "\n\n";
        } else {
             output += `No transactions found for ${user.full_name}\n`;
        }
    }
    
    fs.writeFileSync('real_transactions_output.txt', output);
    console.log("Output written to real_transactions_output.txt");
}

listRealTransactions();
