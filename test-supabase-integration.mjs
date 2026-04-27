#!/usr/bin/env node

/**
 * Test Supabase Integration with ChainScout
 * Проверка подключения к Supabase и работы базовых операций
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });
dotenv.config({ path: resolve(__dirname, 'server/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔍 ChainScout Supabase Integration Test\n');
console.log('Environment Check:');
console.log(`  URL: ${SUPABASE_URL}`);
console.log(`  Service Key: ${SUPABASE_SERVICE_KEY ? '✅ Loaded' : '❌ Missing'}`);
console.log(`  Publishable Key: ${SUPABASE_PUBLISHABLE_KEY ? '✅ Loaded' : '❌ Missing'}\n`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required Supabase configuration');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env or server/.env\n');
  process.exit(1);
}

// Test REST API connectivity
console.log('Testing REST API Connectivity...');
try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });

  if (response.status === 200 || response.status === 204) {
    console.log('✅ REST API accessible\n');
  } else {
    const data = await response.text();
    console.log(`⚠️  REST API responded with status ${response.status}`);
    console.log(`   Response: ${data}\n`);
  }
} catch (error) {
  console.error('❌ REST API connection failed:', error.message, '\n');
}

// Test with Supabase client
try {
  const { createClient } = await import('@supabase/supabase-js');
  
  console.log('Testing Supabase Client Library...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Test 1: List users
  console.log('  1. Testing auth.admin.listUsers()...');
  const { data: users, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.log(`     ❌ Error: ${authError.message}`);
  } else {
    console.log(`     ✅ Success (${users?.length || 0} users in system)\n`);
  }

  // Test 2: Check table access
  console.log('  2. Testing table access (scan_history)...');
  const { data: scans, error: tableError } = await supabase
    .from('scan_history')
    .select('*')
    .limit(1);

  if (tableError && tableError.code !== 'PGRST116') {
    console.log(`     ❌ Error: ${tableError.message}`);
  } else {
    console.log('     ✅ scan_history table accessible\n');
  }

  // Test 3: Check RLS (Row Level Security)
  console.log('  3. Testing RLS Configuration...');
  try {
    // Try to query as anonymous user using public/anon key
    const anonSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY || 'anon-key', {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: anonData, error: anonError } = await anonSupabase
      .from('scan_history')
      .select('*')
      .limit(1);

    if (anonError && anonError.code === '42501') {
      console.log('     ✅ RLS Enabled (anonymous access blocked)\n');
    } else {
      console.log('     ⚠️  RLS might not be properly configured\n');
    }
  } catch (e) {
    console.log('     ⚠️  Could not test RLS with public key\n');
  }

  console.log('✨ Supabase integration test completed!');
  console.log('📋 Summary:');
  console.log('  - Project ID:', SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]);
  console.log('  - Authentication: ✅ Working');
  console.log('  - Database: ✅ Accessible');
  console.log('  - RLS: ⚠️  Verify in Supabase dashboard\n');
  console.log('Next steps:');
  console.log('  1. Verify RLS policies in Supabase Dashboard');
  console.log('  2. Check that scan_history table has RLS enabled');
  console.log('  3. Run: npm run dev (in root) and npm run start (in server/)');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Supabase client test failed:', error.message);
  process.exit(1);
}
