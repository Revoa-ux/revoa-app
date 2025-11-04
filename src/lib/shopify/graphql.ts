import { supabase } from '../supabase';

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
  customer: {
    id: string;
    email: string | null;
  } | null;
}

export const executeGraphQL = async <T>(
  query: string,
  variables?: Record<string, any>
): Promise<GraphQLResponse<T>> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/shopify-proxy?endpoint=/graphql.json`;

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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GraphQL request failed (${response.status}): ${errorText}`);
  }

  return await response.json();
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
    productsCount {
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
          customer {
            id
            email
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

export const getOrders = async (limit = 250, query?: string): Promise<Order[]> => {
  const orders: Order[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage && orders.length < limit) {
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
      throw new Error(`GraphQL error: ${response.errors[0].message}`);
    }

    if (!response.data) {
      throw new Error('No data returned from GraphQL query');
    }

    orders.push(...response.data.orders.edges.map(edge => edge.node));
    hasNextPage = response.data.orders.pageInfo.hasNextPage;
    cursor = response.data.orders.pageInfo.endCursor;
  }

  return orders;
};

export const createProduct = async (input: {
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  variants?: Array<{
    price: string;
    compareAtPrice?: string;
    sku?: string;
    inventoryQuantity?: number;
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
