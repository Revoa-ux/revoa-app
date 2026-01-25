/**
 * Shopify GraphQL API Helper
 *
 * IMPORTANT: Shopify requires new public apps to use GraphQL Admin API only.
 * REST Admin API is deprecated for apps submitted to the App Store.
 */

const SHOPIFY_API_VERSION = '2026-01';

export interface GraphQLResponse<T = any> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface GraphQLError extends Error {
  errors: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

/**
 * Execute a GraphQL query or mutation against Shopify Admin API
 */
export async function shopifyGraphQL<T = any>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

  console.log('[Shopify GraphQL]', {
    shop,
    apiVersion: SHOPIFY_API_VERSION,
    operationType: query.trim().startsWith('mutation') ? 'mutation' : 'query',
    hasVariables: !!variables
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify GraphQL HTTP error: ${response.status} ${response.statusText}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    const error = new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`) as GraphQLError;
    error.errors = result.errors;
    throw error;
  }

  return result.data;
}

/**
 * Get API version being used
 */
export function getApiVersion(): string {
  return SHOPIFY_API_VERSION;
}

/**
 * GraphQL Queries
 */
export const QUERIES = {
  GET_SHOP_INFO: `
    query getShopInfo {
      shop {
        email
        contactEmail
        name
        myshopifyDomain
      }
    }
  `,

  GET_CUSTOMER: `
    query getCustomer($id: ID!) {
      customer(id: $id) {
        id
        email
        firstName
        lastName
        phone
        state
      }
    }
  `,

  GET_ORDERS: `
    query getOrders($first: Int!, $after: String, $query: String) {
      orders(first: $first, after: $after, query: $query) {
        edges {
          node {
            id
            name
            createdAt
            processedAt
            cancelledAt
            cancelReason
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            subtotalPriceSet {
              shopMoney {
                amount
              }
            }
            totalTaxSet {
              shopMoney {
                amount
              }
            }
            totalDiscountsSet {
              shopMoney {
                amount
              }
            }
            email
            phone
            note
            tags
            customAttributes {
              key
              value
            }
            shippingAddress {
              address1
              address2
              city
              province
              provinceCode
              zip
              country
              countryCode
              firstName
              lastName
              phone
            }
            billingAddress {
              address1
              address2
              city
              province
              provinceCode
              zip
              country
              countryCode
              firstName
              lastName
              phone
            }
            lineItems(first: 100) {
              edges {
                node {
                  id
                  name
                  title
                  variantTitle
                  sku
                  quantity
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                    }
                  }
                  product {
                    id
                  }
                }
              }
            }
            shippingLines(first: 10) {
              edges {
                node {
                  title
                  originalPriceSet {
                    shopMoney {
                      amount
                    }
                  }
                }
              }
            }
          }
          cursor
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,

  GET_ORDER: `
    query getOrder($id: ID!) {
      order(id: $id) {
        id
        name
        createdAt
        processedAt
        cancelledAt
        cancelReason
        displayFinancialStatus
        displayFulfillmentStatus
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        note
        tags
        shippingAddress {
          city
          province
          country
        }
        billingAddress {
          city
          province
          country
        }
        lineItems(first: 100) {
          edges {
            node {
              id
              name
              title
              variantTitle
              sku
              quantity
              originalUnitPriceSet {
                shopMoney {
                  amount
                }
              }
            }
          }
        }
      }
    }
  `,

  GET_WEBHOOK_SUBSCRIPTIONS: `
    query getWebhookSubscriptions($first: Int!) {
      webhookSubscriptions(first: $first) {
        edges {
          node {
            id
            topic
            endpoint {
              __typename
              ... on WebhookHttpEndpoint {
                callbackUrl
              }
            }
          }
        }
      }
    }
  `,

  GET_FULFILLMENTS: `
    query getFulfillments($orderId: ID!) {
      order(id: $orderId) {
        id
        fulfillments(first: 100) {
          edges {
            node {
              id
              status
              trackingInfo {
                number
                company
                url
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    }
  `
};

/**
 * GraphQL Mutations
 */
export const MUTATIONS = {
  WEBHOOK_SUBSCRIPTION_CREATE: `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  ORDER_CANCEL: `
    mutation orderCancel($orderId: ID!, $refund: Boolean!, $reason: OrderCancelReason!) {
      orderCancel(orderId: $orderId, refund: $refund, reason: $reason) {
        order {
          id
          displayFinancialStatus
          displayFulfillmentStatus
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  REFUND_CREATE: `
    mutation refundCreate($input: RefundInput!) {
      refundCreate(input: $input) {
        refund {
          id
          totalRefundedSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  ORDER_UPDATE: `
    mutation orderUpdate($input: OrderInput!) {
      orderUpdate(input: $input) {
        order {
          id
          shippingAddress {
            address1
            address2
            city
            province
            zip
            country
          }
          billingAddress {
            address1
            address2
            city
            province
            zip
            country
          }
          email
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  FULFILLMENT_CREATE_V2: `
    mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
      fulfillmentCreateV2(fulfillment: $fulfillment) {
        fulfillment {
          id
          status
          trackingInfo {
            number
            company
            url
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `
};
