import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeliveries() {
  console.log("🔍 Checking deliveries in DB...");
  
  const { data, error } = await supabase
    .from('deliveries')
    .select('id, status, driver_id, customer_name, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching deliveries:", error);
    return;
  }

  console.log(`Total deliveries found: ${data?.length || 0}`);
  
  const stats = (data || []).reduce((acc: Record<string, number>, d) => {
    const status = d.status as string;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  console.log("Stats by status:", stats);

  const assigned = data.filter(d => d.driver_id);
  console.log(`Assigned deliveries: ${assigned.length}`);
  
  const assignedByDriver = assigned.reduce((acc: Record<string, number>, d) => {
    const driverId = d.driver_id as string;
    acc[driverId] = (acc[driverId] || 0) + 1;
    return acc;
  }, {});
  
  console.log("Assigned by driver (top 5):", Object.entries(assignedByDriver).sort((a: [string, number], b: [string, number]) => b[1] - a[1]).slice(0, 5));

  const activeStatuses = ['pending', 'accepted', 'arrived_pickup', 'ready_for_pickup', 'picking_up', 'in_transit', 'arrived_at_customer', 'returning'];
  const activeAssigned = assigned.filter(d => activeStatuses.includes(d.status));
  console.log(`Active Assigned deliveries: ${activeAssigned.length}`);

  if (activeAssigned.length > 0) {
    console.log("Sample Active Assigned Delivery:", activeAssigned[0]);
  }
}

checkDeliveries();
