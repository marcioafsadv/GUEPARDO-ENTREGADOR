
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDelivery() {
    console.log('🔍 Searching for delivery with displayId suffix: 9553 or items->displayId: 9553');
    
    // Fetch all active deliveries to find the right one
    const { data, error } = await supabase
        .from('deliveries')
        .select('*');

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    const mission = data.find(d => {
        const items = d.items || {};
        return items.displayId?.toString() === '9553' || d.id?.toString().endsWith('9553');
    });

    if (mission) {
        console.log('✅ Found Mission!');
        console.log('ID:', mission.id);
        console.log('Status:', mission.status);
        console.log('--- Top Level Columns ---');
        console.log('delivery_value:', mission.delivery_value);
        console.log('payment_method:', mission.payment_method);
        console.log('--- JSONB items ---');
        console.log('items.deliveryValue:', mission.items?.deliveryValue);
        console.log('items.paymentMethod:', mission.items?.paymentMethod);
    } else {
        console.log('❌ Mission not found in the list of active deliveries.');
        console.log('Active IDs:', data.map(d => d.items?.displayId || d.id.slice(-4)));
    }
}

debugDelivery();
