import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listTransactionColumns() {
    console.log("Fetching transactions...");
    const { data, error } = await supabase.from('transactions').select('*').limit(1);
    
    let output = "";
    if (error) {
        output = `Error fetching transactions: ${error.message}\nCode: ${error.code}\nHint: ${error.hint}`;
    } else if (data && data.length > 0) {
        output += "COLUMNS IN 'transactions' TABLE:\n";
        Object.keys(data[0]).sort().forEach(key => {
            output += `${key}\n`;
        });
        output += "\nSAMPLE DATA:\n";
        output += JSON.stringify(data[0], null, 2);
    } else {
        output = "Table 'transactions' is empty. Testing insert with minimal data...";
        // Se a tabela estiver vazia, vamos tentar um insert de teste e ver qual o erro real
        const { error: insError } = await supabase.from('transactions').insert([{ user_id: '00000000-0000-0000-0000-000000000000' }]);
        if (insError) {
             output += `\nInsert Test Error: ${insError.message}\nCode: ${insError.code}\nHint: ${insError.hint}`;
        }
    }
    
    fs.writeFileSync('transactions_columns_output.txt', output);
    console.log("Output written to transactions_columns_output.txt");
}

listTransactionColumns();
