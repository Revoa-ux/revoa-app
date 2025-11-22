import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface PageTitleProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export const PageTitle: React.FC<PageTitleProps> = ({ 
  title, 
  description,
  children 
}) => {
  const location = useLocation();
  
  // Generate title based on route if not provided
  const getDefaultTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Analytics';
    return path.split('/')[1]?.charAt(0).toUpperCase() + path.split('/')[1]?.slice(1) || 'Analytics';
  };

  const pageTitle = title || getDefaultTitle();
  const fullTitle = `${pageTitle} | Revoa`;
  const metaDescription = description || `Revoa - ${pageTitle} page`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Revoa" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      
      {/* Security Headers */}
      <meta name="referrer" content="strict-origin-when-cross-origin" />
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      
      {/* Favicon */}
      <link 
        rel="icon" 
        type="image/png" 
        href="https://jfwmnaaujzuwrqqhgmuf.supabase.co/storage/v1/object/public/REVOA%20(Public)//REVOA%20Favicon%20Circle.png" 
      />
      
      {/* Font */}
      <link rel="preconnect" href="https://rsms.me/" />
      <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      
      {children}
    </Helmet>
  );
};