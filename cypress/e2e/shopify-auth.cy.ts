describe('Shopify OAuth Flow', () => {
  beforeEach(() => {
    // Clear cookies and localStorage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should handle successful Shopify connection', () => {
    // Visit the onboarding page
    cy.visit('/onboarding/store');

    // Enter store URL
    cy.get('input[placeholder*="your-store.myshopify.com"]')
      .type('test-store.myshopify.com');

    // Click connect button
    cy.get('button').contains('Connect Store').click();

    // Verify loading state
    cy.get('button').contains('Connecting...').should('exist');

    // Mock Shopify OAuth callback
    cy.window().then((win) => {
      const state = win.localStorage.getItem('shopify_state');
      const mockCallback = {
        shop: 'test-store.myshopify.com',
        code: 'test_code',
        state,
        hmac: 'test_hmac',
        timestamp: Math.floor(Date.now() / 1000).toString()
      };

      // Simulate successful callback
      cy.visit(`/auth/callback?${new URLSearchParams(mockCallback).toString()}`);

      // Verify success message
      cy.contains('Successfully connected to Shopify').should('exist');

      // Verify redirect to next step
      cy.url().should('include', '/onboarding/ads');
    });
  });

  it('should handle invalid store URL', () => {
    cy.visit('/onboarding/store');

    // Enter invalid store URL
    cy.get('input[placeholder*="your-store.myshopify.com"]')
      .type('invalid-url');

    // Click connect button
    cy.get('button').contains('Connect Store').click();

    // Verify error message
    cy.contains('Please enter a valid Shopify store URL').should('exist');
  });

  it('should handle OAuth errors', () => {
    cy.visit('/onboarding/store');

    // Enter store URL
    cy.get('input[placeholder*="your-store.myshopify.com"]')
      .type('test-store.myshopify.com');

    // Click connect button
    cy.get('button').contains('Connect Store').click();

    // Mock invalid state parameter
    cy.visit('/auth/callback?shop=test-store.myshopify.com&code=test_code&state=invalid_state');

    // Verify error message
    cy.contains('Invalid state parameter').should('exist');
  });
});