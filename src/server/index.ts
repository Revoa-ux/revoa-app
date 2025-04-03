import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { config } from '../lib/config';
import { shopifyRouter } from './routes/shopify';
import { shopifyProductsRouter } from './routes/shopifyProducts';
import { shopifyOrdersRouter } from './routes/shopifyOrders';
import { shopifyCustomersRouter } from './routes/shopifyCustomers';
import { webhooksRouter } from './routes/webhooks';
import { gdprRouter } from './routes/gdpr';

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey || ''
);

// Configure security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "https://*.myshopify.com",
        "https://*.shopify.com",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://api.revoa.app"
      ],
      frameSrc: ["'self'", "https://*.myshopify.com", "https://*.shopify.com"],
      imgSrc: [
        "'self'", 
        "data:", 
        "blob:", 
        "https://*.unsplash.com",
        "https://*.myshopify.com",
        "https://*.shopify.com",
        "https://*.supabase.co"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://*.myshopify.com",
        "https://*.shopify.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://rsms.me"],
      fontSrc: ["'self'", "https://rsms.me"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configure CORS
app.use(cors({
  origin: [
    'https://members.revoa.app',
    'http://localhost:5173',
    /\.myshopify\.com$/,
    /\.shopify\.com$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Shopify-Access-Token',
    'X-Shopify-Hmac-Sha256',
    'X-Shopify-Shop-Domain'
  ],
  credentials: true,
  preflightContinue: true,
  optionsSuccessStatus: 204
}));

// Parse JSON bodies
app.use(express.json());

// Mount routers
app.use('/shopify', shopifyRouter);
app.use('/shopify/products', shopifyProductsRouter);
app.use('/shopify/orders', shopifyOrdersRouter);
app.use('/shopify/customers', shopifyCustomersRouter);
app.use('/webhooks/shopify', webhooksRouter);
app.use('/gdpr', gdprRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;