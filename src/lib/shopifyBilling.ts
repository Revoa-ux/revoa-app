/**
 * Shopify Billing Configuration
 *
 * This module handles Shopify App subscription billing for Revoa.
 * Billing is processed through Shopify's native billing API.
 */

export const BILLING_CONFIG = {
  planName: 'Revoa Standard',
  price: 29.00,
  currencyCode: 'USD',
  interval: 'EVERY_30_DAYS' as const,
  trialDays: 14,
  test: process.env.NODE_ENV !== 'production', // Use test mode in development
} as const;

/**
 * GraphQL mutation to create an app subscription
 *
 * This should be called from your backend when a merchant installs the app
 * or when they complete onboarding.
 *
 * Example usage in a Shopify edge function or backend:
 *
 * ```typescript
 * const mutation = `
 *   mutation CreateAppSubscription($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int, $test: Boolean) {
 *     appSubscriptionCreate(
 *       name: $name
 *       lineItems: $lineItems
 *       returnUrl: $returnUrl
 *       trialDays: $trialDays
 *       test: $test
 *     ) {
 *       userErrors {
 *         field
 *         message
 *       }
 *       confirmationUrl
 *       appSubscription {
 *         id
 *         status
 *       }
 *     }
 *   }
 * `;
 *
 * const variables = {
 *   name: BILLING_CONFIG.planName,
 *   returnUrl: `${process.env.VITE_APP_URL}/billing/callback`,
 *   trialDays: BILLING_CONFIG.trialDays,
 *   test: BILLING_CONFIG.test,
 *   lineItems: [
 *     {
 *       plan: {
 *         appRecurringPricingDetails: {
 *           price: { amount: BILLING_CONFIG.price, currencyCode: BILLING_CONFIG.currencyCode },
 *           interval: BILLING_CONFIG.interval
 *         }
 *       }
 *     }
 *   ]
 * };
 *
 * // Execute the mutation with Shopify Admin API
 * const response = await shopify.graphql(mutation, variables);
 * ```
 */

export const APP_SUBSCRIPTION_CREATE_MUTATION = `
  mutation CreateAppSubscription($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int, $test: Boolean) {
    appSubscriptionCreate(
      name: $name
      lineItems: $lineItems
      returnUrl: $returnUrl
      trialDays: $trialDays
      test: $test
    ) {
      userErrors {
        field
        message
      }
      confirmationUrl
      appSubscription {
        id
        name
        status
        trialDays
        currentPeriodEnd
        lineItems {
          id
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                price {
                  amount
                  currencyCode
                }
                interval
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * GraphQL query to check current subscription status
 */
export const APP_SUBSCRIPTION_QUERY = `
  query GetCurrentAppSubscription {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        test
        trialDays
        currentPeriodEnd
        lineItems {
          id
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                price {
                  amount
                  currencyCode
                }
                interval
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * GraphQL mutation to cancel a subscription
 */
export const APP_SUBSCRIPTION_CANCEL_MUTATION = `
  mutation CancelAppSubscription($id: ID!) {
    appSubscriptionCancel(id: $id) {
      userErrors {
        field
        message
      }
      appSubscription {
        id
        status
      }
    }
  }
`;

export type SubscriptionStatus =
  | 'ACTIVE'      // Subscription is active and being charged
  | 'PENDING'     // Waiting for merchant confirmation
  | 'CANCELLED'   // Subscription has been cancelled
  | 'EXPIRED'     // Trial expired without activation
  | 'FROZEN'      // Paused by Shopify (e.g., merchant account issues)
  | 'DECLINED';   // Payment declined

export interface BillingSubscription {
  id: string;
  name: string;
  status: SubscriptionStatus;
  test: boolean;
  trialDays: number;
  currentPeriodEnd: string;
  price: {
    amount: number;
    currencyCode: string;
  };
  interval: string;
}

/**
 * Helper to determine if a merchant has an active subscription
 */
export function hasActiveSubscription(status: SubscriptionStatus): boolean {
  return status === 'ACTIVE' || status === 'PENDING';
}

/**
 * Helper to check if merchant is in trial period
 */
export function isInTrialPeriod(subscription: BillingSubscription): boolean {
  if (!subscription.currentPeriodEnd) return false;

  const now = new Date();
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const daysDiff = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return daysDiff <= subscription.trialDays && daysDiff > 0;
}
