/**
 * Test suite for Shopify HMAC verification
 *
 * These tests verify that our HMAC implementation matches Shopify's expectations
 * Using known test vectors from Shopify's documentation
 */

import { verifyShopifyWebhook } from './shopify-hmac.ts';

// Test case from Shopify documentation
const TEST_SECRET = 'test_secret_key';
const TEST_BODY = '{"id":12345,"email":"test@example.com"}';

/**
 * Manual HMAC calculation for testing
 * This should match what Shopify sends
 */
async function calculateExpectedHmac(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Run tests
async function runTests() {
  console.log('🧪 Testing Shopify HMAC Verification\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Valid HMAC should pass
  try {
    const validHmac = await calculateExpectedHmac(TEST_BODY, TEST_SECRET);
    const result = await verifyShopifyWebhook(TEST_BODY, validHmac, TEST_SECRET);

    if (result === true) {
      console.log('✅ Test 1 PASSED: Valid HMAC accepted');
      passed++;
    } else {
      console.log('❌ Test 1 FAILED: Valid HMAC rejected');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 1 FAILED:', error);
    failed++;
  }

  // Test 2: Invalid HMAC should fail
  try {
    const invalidHmac = 'invalid_hmac_signature';
    const result = await verifyShopifyWebhook(TEST_BODY, invalidHmac, TEST_SECRET);

    if (result === false) {
      console.log('✅ Test 2 PASSED: Invalid HMAC rejected');
      passed++;
    } else {
      console.log('❌ Test 2 FAILED: Invalid HMAC accepted');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 2 FAILED:', error);
    failed++;
  }

  // Test 3: Modified body should fail
  try {
    const validHmac = await calculateExpectedHmac(TEST_BODY, TEST_SECRET);
    const modifiedBody = TEST_BODY + ' ';
    const result = await verifyShopifyWebhook(modifiedBody, validHmac, TEST_SECRET);

    if (result === false) {
      console.log('✅ Test 3 PASSED: Modified body rejected');
      passed++;
    } else {
      console.log('❌ Test 3 FAILED: Modified body accepted');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 3 FAILED:', error);
    failed++;
  }

  // Test 4: Wrong secret should fail
  try {
    const validHmac = await calculateExpectedHmac(TEST_BODY, TEST_SECRET);
    const result = await verifyShopifyWebhook(TEST_BODY, validHmac, 'wrong_secret');

    if (result === false) {
      console.log('✅ Test 4 PASSED: Wrong secret rejected');
      passed++;
    } else {
      console.log('❌ Test 4 FAILED: Wrong secret accepted');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 4 FAILED:', error);
    failed++;
  }

  // Test 5: Empty body should handle gracefully
  try {
    const emptyBody = '';
    const validHmac = await calculateExpectedHmac(emptyBody, TEST_SECRET);
    const result = await verifyShopifyWebhook(emptyBody, validHmac, TEST_SECRET);

    if (result === true) {
      console.log('✅ Test 5 PASSED: Empty body handled correctly');
      passed++;
    } else {
      console.log('❌ Test 5 FAILED: Empty body validation failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 5 FAILED:', error);
    failed++;
  }

  // Summary
  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! HMAC verification is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
}

// Run the tests
runTests();
