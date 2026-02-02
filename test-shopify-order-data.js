// Test script to check what Shopify returns for an order
// Run this in browser console on your Shopify admin page

const orderNumber = '1017'; // Change this to your order number (without #)

fetch(`/admin/api/2025-07/orders.json?name=${orderNumber}&status=any`, {
  headers: {
    'Accept': 'application/json'
  }
})
.then(r => r.json())
.then(data => {
  const order = data.orders[0];
  if (!order) {
    console.log('Order not found');
    return;
  }
  
  console.log('=== ORDER DATA ===');
  console.log('Customer Email:', order.email);
  console.log('Customer Object:', order.customer);
  console.log('Shipping Address:', order.shipping_address);
  console.log('Billing Address:', order.billing_address);
  console.log('Line Items:', order.line_items);
  console.log('\n=== FULL ORDER ===');
  console.log(JSON.stringify(order, null, 2));
})
.catch(err => console.error('Error:', err));
