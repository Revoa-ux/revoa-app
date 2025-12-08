import { supabase } from '../supabase';

// Utility functions for handling Shopify GraphQL IDs
export const extractNumericId = (graphqlId: string): string => {
  // GraphQL IDs are in format: gid://shopify/Product/123456789
  // Extract just the numeric part
  const parts = graphqlId.split('/');
  return parts[parts.length - 1];
};

export const buildGraphQLId = (resourceType: string, numericId: string): string => {
  // Convert numeric ID back to GraphQL format
  return `gid://shopify/${resourceType}/${numericId}`;
};

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

export interface Product {
  id: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  status: string;
  totalInventory: number;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        compareAtPrice: string | null;
        sku: string | null;
        inventoryQuantity: number;
      };
    }>;
  };
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText: string | null;
      };
    }>;
  };
}

export interface Order {
  id: string;
  name: string;
  createdAt: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  subtotalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  totalTaxSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  totalShippingPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  lineItems: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        quantity: number;
        originalUnitPriceSet: {
          shopMoney: {
            amount: string;
          };
        };
        sku: string | null;
        product: {
          id: string;
        };
        variant: {
          id: string;
        } | null;
      };
    }>;
  };
}

export interface Return {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  order: {
    id: string;
    name: string;
  };
  totalQuantity: number;
  refunds: {
    edges: Array<{
      node: {
        id: string;
        createdAt: string;
        totalRefundedSet: {
          shopMoney: {
            amount: string;
            currencyCode: string;
          };
        };
        refundLineItems: {
          edges: Array<{
            node: {
              quantity: number;
              lineItem: {
                id: string;
                title: string;
                sku: string | null;
              };
              priceSet: {
                shopMoney: {
                  amount: string;
                };
              };
            };
          }>;
        };
      };
    }>;
  };
}

export const executeGraphQL = async <T>(
  query: string,
  variables?: Record<string, any>
): Promise<GraphQLResponse<T>> => {
  console.log('[GraphQL] === EXECUTING GRAPHQL QUERY ===');
  console.log('[GraphQL] Variables:', JSON.stringify(variables, null, 2));

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('[GraphQL] ERROR: No session found');
    throw new Error('Not authenticated');
  }
  console.log('[GraphQL] Session found, user:', session.user?.id);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/shopify-proxy?endpoint=/graphql.json`;
  console.log('[GraphQL] Request URL:', url);

  console.log('[GraphQL] Making fetch request...');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  console.log('[GraphQL] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GraphQL] ERROR: Request failed');
    console.error('[GraphQL] Status:', response.status);
    console.error('[GraphQL] Error:', errorText);
    throw new Error(`GraphQL request failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  if (result.errors) {
    console.error('[GraphQL] GraphQL returned errors:', result.errors);
  } else {
    console.log('[GraphQL] ✓ Query successful');
  }

  return result;
};

export const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          descriptionHtml
          vendor
          productType
          createdAt
          updatedAt
          publishedAt
          status
          totalInventory
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                sku
                inventoryQuantity
              }
            }
          }
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
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
`;

export const PRODUCTS_COUNT_QUERY = `
  query GetProductsCount {
    productsCount(query: "", limit: null) {
      count
    }
  }
`;

export const ORDERS_QUERY = `
  query GetOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query) {
      edges {
        node {
          id
          name
          createdAt
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalTaxSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalShippingPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          displayFinancialStatus
          displayFulfillmentStatus
          lineItems(first: 250) {
            edges {
              node {
                id
                title
                quantity
                originalUnitPriceSet {
                  shopMoney {
                    amount
                  }
                }
                sku
                product {
                  id
                }
                variant {
                  id
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
`;

export const CREATE_PRODUCT_MUTATION = `
  mutation CreateProduct($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        descriptionHtml
        vendor
        productType
        status
        variants(first: 1) {
          edges {
            node {
              id
              price
              sku
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const getProducts = async (limit = 250): Promise<Product[]> => {
  const products: Product[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage && products.length < limit) {
    const response = await executeGraphQL<{
      products: {
        edges: Array<{ node: Product; cursor: string }>;
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    }>(PRODUCTS_QUERY, {
      first: Math.min(250, limit - products.length),
      after: cursor,
    });

    if (response.errors) {
      throw new Error(`GraphQL error: ${response.errors[0].message}`);
    }

    if (!response.data) {
      throw new Error('No data returned from GraphQL query');
    }

    products.push(...response.data.products.edges.map(edge => edge.node));
    hasNextPage = response.data.products.pageInfo.hasNextPage;
    cursor = response.data.products.pageInfo.endCursor;
  }

  return products;
};

export const getProductsCount = async (): Promise<number> => {
  const response = await executeGraphQL<{
    productsCount: { count: number };
  }>(PRODUCTS_COUNT_QUERY);

  if (response.errors) {
    throw new Error(`GraphQL error: ${response.errors[0].message}`);
  }

  if (!response.data) {
    throw new Error('No data returned from GraphQL query');
  }

  return response.data.productsCount.count;
};

export const PRODUCT_WITH_VARIANTS_QUERY = `
  query GetProductWithVariants($id: ID!) {
    product(id: $id) {
      id
      title
      options {
        id
        name
        position
        values
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            price
            sku
            inventoryQuantity
            position
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

export const getProductWithVariants = async (productId: string): Promise<any> => {
  const response = await executeGraphQL<{
    product: {
      id: string;
      title: string;
      options?: Array<{
        id: string;
        name: string;
        position: number;
        values: string[];
      }>;
      variants: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            price: string;
            sku: string | null;
            inventoryQuantity: number;
            position: number;
            selectedOptions?: Array<{
              name: string;
              value: string;
            }>;
          };
        }>;
      };
    };
  }>(PRODUCT_WITH_VARIANTS_QUERY, { id: productId });

  if (response.errors) {
    throw new Error(`GraphQL error: ${response.errors[0].message}`);
  }

  if (!response.data) {
    throw new Error('No data returned from GraphQL query');
  }

  return {
    id: response.data.product.id,
    title: response.data.product.title,
    options: response.data.product.options,
    variants: response.data.product.variants.edges.map(edge => edge.node),
  };
};

export const getOrders = async (limit = 250, query?: string): Promise<Order[]> => {
  console.log('[GraphQL] === FETCHING ORDERS ===');
  console.log('[GraphQL] Limit:', limit, 'Query:', query || 'none');

  const orders: Order[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let pageCount = 0;

  while (hasNextPage && orders.length < limit) {
    pageCount++;
    console.log('[GraphQL] Fetching page', pageCount, '(cursor:', cursor || 'start', ')');

    const response = await executeGraphQL<{
      orders: {
        edges: Array<{ node: Order; cursor: string }>;
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    }>(ORDERS_QUERY, {
      first: Math.min(250, limit - orders.length),
      after: cursor,
      query,
    });

    if (response.errors) {
      const errorMessage = response.errors[0].message;
      console.error('[GraphQL] ❌ Order fetch error:', errorMessage);

      if (errorMessage.includes('not approved to access the Order object')) {
        console.warn('[GraphQL] ⚠️  PROTECTED CUSTOMER DATA ACCESS NOT APPROVED');
        console.warn('[GraphQL] This app requires "Protected Customer Data" approval from Shopify.');
        console.warn('[GraphQL] Visit: https://shopify.dev/docs/apps/launch/protected-customer-data');
        console.warn('[GraphQL] Returning empty orders array.');
        return [];
      }

      throw new Error(`GraphQL error: ${errorMessage}`);
    }

    if (!response.data) {
      console.error('[GraphQL] ERROR: No data in response');
      throw new Error('No data returned from GraphQL query');
    }

    const newOrders = response.data.orders.edges.map(edge => edge.node);
    console.log('[GraphQL] Page', pageCount, 'fetched', newOrders.length, 'orders');

    orders.push(...newOrders);
    hasNextPage = response.data.orders.pageInfo.hasNextPage;
    cursor = response.data.orders.pageInfo.endCursor;
  }

  console.log('[GraphQL] ✓ Total orders fetched:', orders.length);
  return orders;
};

export const createProduct = async (input: {
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  productOptions?: Array<{
    name: string;
    values: Array<{ name: string }>;
  }>;
}): Promise<Product> => {
  const response = await executeGraphQL<{
    productCreate: {
      product: Product;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(CREATE_PRODUCT_MUTATION, { input });

  if (response.errors) {
    throw new Error(`GraphQL error: ${response.errors[0].message}`);
  }

  if (!response.data) {
    throw new Error('No data returned from GraphQL mutation');
  }

  if (response.data.productCreate.userErrors.length > 0) {
    throw new Error(
      `Product creation error: ${response.data.productCreate.userErrors[0].message}`
    );
  }

  return response.data.productCreate.product;
};

const UPDATE_PRODUCT_MUTATION = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        descriptionHtml
        vendor
        productType
        variants(first: 100) {
          edges {
            node {
              id
              title
              price
              compareAtPrice
              sku
              inventoryQuantity
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const updateProduct = async (
  productId: string,
  input: {
    title?: string;
    descriptionHtml?: string;
    vendor?: string;
    productType?: string;
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
    variants?: Array<{
      id?: string;
      price?: string;
      compareAtPrice?: string;
      sku?: string;
      inventoryQuantity?: number;
    }>;
  }
): Promise<Product> => {
  const updateInput = {
    id: productId,
    ...input,
  };

  const response = await executeGraphQL<{
    productUpdate: {
      product: Product;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(UPDATE_PRODUCT_MUTATION, { input: updateInput });

  if (response.errors) {
    throw new Error(`GraphQL error: ${response.errors[0].message}`);
  }

  if (!response.data) {
    throw new Error('No data returned from GraphQL mutation');
  }

  if (response.data.productUpdate.userErrors.length > 0) {
    throw new Error(
      `Product update error: ${response.data.productUpdate.userErrors[0].message}`
    );
  }

  return response.data.productUpdate.product;
};

const UPDATE_VARIANT_MUTATION = `
  mutation productVariantUpdate($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
      productVariant {
        id
        price
        sku
        inventoryQuantity
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const updateProductVariant = async (
  variantId: string,
  input: {
    price?: string;
    compareAtPrice?: string;
    sku?: string;
    inventoryQuantity?: number;
  }
): Promise<void> => {
  const variantInput = {
    id: variantId,
    ...input,
  };

  const response = await executeGraphQL<{
    productVariantUpdate: {
      productVariant: any;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(UPDATE_VARIANT_MUTATION, { input: variantInput });

  if (response.errors) {
    throw new Error(`GraphQL error: ${response.errors[0].message}`);
  }

  if (!response.data) {
    throw new Error('No data returned from GraphQL mutation');
  }

  if (response.data.productVariantUpdate.userErrors.length > 0) {
    throw new Error(
      `Variant update error: ${response.data.productVariantUpdate.userErrors[0].message}`
    );
  }
};

export const RETURNS_QUERY = `
  query GetReturns($first: Int!, $after: String, $query: String) {
    returns(first: $first, after: $after, query: $query) {
      edges {
        node {
          id
          name
          status
          createdAt
          order {
            id
            name
          }
          totalQuantity
          refunds {
            edges {
              node {
                id
                createdAt
                totalRefundedSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                refundLineItems(first: 100) {
                  edges {
                    node {
                      quantity
                      lineItem {
                        id
                        title
                        sku
                      }
                      priceSet {
                        shopMoney {
                          amount
                        }
                      }
                    }
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
`;

export const getReturns = async (limit = 250, query?: string): Promise<Return[]> => {
  const returns: Return[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage && returns.length < limit) {
    const response = await executeGraphQL<{
      returns: {
        edges: Array<{ node: Return; cursor: string }>;
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    }>(RETURNS_QUERY, {
      first: Math.min(250, limit - returns.length),
      after: cursor,
      query,
    });

    if (response.errors) {
      const errorMessage = response.errors[0].message;

      if (errorMessage.includes('not approved to access')) {
        console.warn('[Shopify API] Returns access not yet approved. Returning empty returns array.');
        return [];
      }

      throw new Error(`GraphQL error: ${errorMessage}`);
    }

    if (!response.data) {
      throw new Error('No data returned from GraphQL query');
    }

    returns.push(...response.data.returns.edges.map(edge => edge.node));
    hasNextPage = response.data.returns.pageInfo.hasNextPage;
    cursor = response.data.returns.pageInfo.endCursor;
  }

  return returns;
};
