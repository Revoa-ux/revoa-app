import { storefrontClient } from './client';
import { gql } from 'graphql-request';

// GraphQL Queries
const PRODUCT_QUERY = gql`
  query getProduct($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 10) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            quantityAvailable
          }
        }
      }
      images(first: 5) {
        edges {
          node {
            url
            altText
          }
        }
      }
    }
  }
`;

const COLLECTION_QUERY = gql`
  query getCollection($handle: String!) {
    collection(handle: $handle) {
      id
      title
      description
      products(first: 20) {
        edges {
          node {
            id
            title
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  }
`;

interface ProductQueryResponse {
  product: {
    id: string;
    title: string;
    description: string;
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: {
            amount: string;
            currencyCode: string;
          };
          availableForSale: boolean;
          quantityAvailable: number;
        };
      }>;
    };
    images: {
      edges: Array<{
        node: {
          url: string;
          altText: string;
        };
      }>;
    };
  };
}

interface CollectionQueryResponse {
  collection: {
    id: string;
    title: string;
    description: string;
    products: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          priceRange: {
            minVariantPrice: {
              amount: string;
              currencyCode: string;
            };
          };
          images: {
            edges: Array<{
              node: {
                url: string;
                altText: string;
              };
            }>;
          };
        };
      }>;
    };
  };
}

export const getProduct = async (handle: string) => {
  try {
    const data = await storefrontClient.request<ProductQueryResponse>(PRODUCT_QUERY, {
      handle,
    });
    return data.product;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

export const getCollection = async (handle: string) => {
  try {
    const data = await storefrontClient.request<CollectionQueryResponse>(COLLECTION_QUERY, {
      handle,
    });
    return data.collection;
  } catch (error) {
    console.error('Error fetching collection:', error);
    throw error;
  }
};