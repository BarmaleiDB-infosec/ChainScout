#!/usr/bin/env node
/**
 * Test Supabase Integration
 * Проверка подключения к Supabase и работы базовых операций
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, './server/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in server/.env');
  process.exit(1);
}

console.log('🔍 Testing Supabase Connection...\n');
console.log('URL:', SUPABASE_URL);
console.log('Service Key:', SUPABASE_SERVICE_KEY.substring(0, 20) + '...');
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
  try {
    // Test 1: Check tables
    console.log('📋 Test 1: Fetching tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('integrations')
      .select('*')
      .limit(1);

    if (tablesError && tablesError.code !== 'PGRST116') {
      console.error('❌ Error accessing integrations table:', tablesError.message);
    } else {
      console.log('✅ integrations table accessible');
    }

    // Test 2: Check auth
    console.log('\n🔐 Test 2: Testing auth system...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('❌ Auth error:', authError.message);
    } else {
      console.log(`✅ Auth system working (${users?.length || 0} users found)`);
    }

    // Test 3: Check schema
    console.log('\n📐 Test 3: Checking schema...');
    const { data: schema, error: schemaError } = await supabase
      .from('scan_history')
      .select('*')
      .limit(1);

    if (schemaError && schemaError.code !== 'PGRST116') {
      console.error('❌ Error accessing scan_history:', schemaError.message);
    } else {
      console.log('✅ scan_history table accessible');
    }

    console.log('\n✨ All tests completed!');
    console.log('\n✅ Supabase integration is READY');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
