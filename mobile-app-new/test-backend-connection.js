#!/usr/bin/env node

/**
 * Backend Connection Test Script
 * Tests connectivity to deployed backend at 3.27.11.106:9090
 */

const API_URL = 'http://3.27.11.106:9090/api';

async function testEndpoint(name, endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        const data = await response.json();
        const status = response.ok ? '✅' : '⚠️';
        console.log(`${status} ${name}: ${response.status} ${response.statusText}`);
        if (options.showData) {
            console.log('   Response:', JSON.stringify(data, null, 2));
        }
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        return { ok: false, error: error.message };
    }
}

async function runTests() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  SmartParcel Backend Connection Test');
    console.log('  Backend: http://3.27.11.106:9090');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test 1: Health Check
    console.log('📡 Testing Health Endpoint...');
    await testEndpoint('Health Check', '/../health', { showData: true });

    console.log('\n🔐 Testing Auth Endpoints...');
    // Test 2: Login (expected to fail with invalid creds)
    await testEndpoint('Login (invalid)', '/auth/login', {
        method: 'POST',
        body: { username: 'test', password: 'test' }
    });

    // Test 3: Login with default user
    const loginResult = await testEndpoint('Login (zamn)', '/auth/login', {
        method: 'POST',
        body: { username: 'zamn', password: 'admin123' },
        showData: true
    });

    console.log('\n📦 Testing Package Endpoints (No Auth)...');
    // Test 4: Get Packages (will fail without auth)
    await testEndpoint('Get Packages', '/packages');

    console.log('\n🔧 Testing Device Endpoints (No Auth)...');
    // Test 5: Device Status
    await testEndpoint('Device Status', '/device/status');

    // Test 6: Device Settings
    await testEndpoint('Device Settings', '/device/settings');

    console.log('\n🤖 Testing AI Endpoints...');
    // Test 7: AI Health
    await testEndpoint('AI Health', '/ai/health', { showData: true });

    // Test 8: AI Stats
    await testEndpoint('AI Stats', '/ai/stats', { showData: true });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Backend connection test completed!');
    console.log('═══════════════════════════════════════════════════════');
}

runTests().catch(console.error);
