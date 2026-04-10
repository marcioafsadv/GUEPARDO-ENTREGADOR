
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedAlanData() {
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id, full_name');
  if (pError || !profiles) {
    console.log("Error or no profiles:", pError);
    return;
  }
  
  const alan = profiles.find((p: any) => p.full_name?.includes('Alan') || p.full_name?.includes('Allan'));
  if (!alan) {
    console.log("Alan not found.");
    return;
  }
  
  console.log("Found Alan:", alan.id);
  
  // 1. Bank
  const bankData = {
    user_id: alan.id,
    bank_name: 'Nubank',
    agency: '0001',
    account_number: '12345-6',
    account_type: 'Conta Corrente',
    pix_key: '92547837811'
  };

  const { error: bError } = await supabase.from('bank_accounts').upsert(bankData);
  if (bError) console.log("Failed bank_accounts:\n", JSON.stringify(bError, null, 2));
  else console.log("Seeded Bank Accounts successfully.");

  // 2. Address
  const addressData = {
    user_id: alan.id,
    zip_code: '13300-000',
    street: 'Rua das Primaveras',
    number: '123',
    complement: 'Apto 45',
    district: 'Centro',
    city: 'Itu',
    state: 'SP',
    reference: 'Próximo à praça'
  };

  const { error: aError } = await supabase.from('addresses').upsert(addressData);
  if (aError) console.log("Failed addresses:\n", JSON.stringify(aError, null, 2));
  else console.log("Seeded Addresses successfully.");

  // 3. Vehicles
  const vehicleData = {
    user_id: alan.id,
    type: 'moto',
    model: 'Honda CG 160',
    color: 'Vermelha',
    plate: 'ABC-1234',
    cnh_number: '12345678900'
  };

  const { error: vError } = await supabase.from('vehicles').upsert(vehicleData);
  if (vError) console.log("Failed vehicles:\n", JSON.stringify(vError, null, 2));
  else console.log("Seeded Vehicles successfully.");
  
  console.log("Done checking tables!");
}

seedAlanData();
