/**
 * Revoa Tracking Pixel
 *
 * First-party tracking solution for accurate attribution and conversion tracking.
 * Captures UTM parameters, click IDs, and user events to improve ad attribution.
 *
 * Installation:
 * <script src="https://revoa.app/pixel.js" data-store-id="YOUR_STORE_ID"></script>
 */

(function() {
  'use strict';

  const PIXEL_VERSION = '1.0.0';
  const COOKIE_NAME = 'revoa_attribution';
  const COOKIE_EXPIRY_DAYS = 30;
  const SESSION_STORAGE_KEY = 'revoa_session';

  class RevoaPixel {
    constructor(storeId, apiEndpoint) {
      this.storeId = storeId;
      this.apiEndpoint = apiEndpoint || 'https://revoa.app/functions/v1/pixel-event';
      this.sessionId = this.generateSessionId();
      this.attributionData = this.getAttributionData();

      this.init();
    }

    init() {
      console.log('[Revoa Pixel] Initialized', { version: PIXEL_VERSION, storeId: this.storeId });

      this.captureUTMParameters();
      this.captureClickIDs();
      this.trackPageView();

      if (typeof window !== 'undefined') {
        window.revoa = {
          track: this.track.bind(this),
          identify: this.identify.bind(this),
          version: PIXEL_VERSION
        };
      }
    }

    generateSessionId() {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) return stored;

      const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      return sessionId;
    }

    captureUTMParameters() {
      const params = new URLSearchParams(window.location.search);
      const utmParams = {
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        utm_term: params.get('utm_term'),
        utm_content: params.get('utm_content'),
      };

      const hasUTM = Object.values(utmParams).some(v => v !== null);

      if (hasUTM) {
        console.log('[Revoa Pixel] Captured UTM parameters', utmParams);
        this.attributionData = {
          ...this.attributionData,
          ...utmParams,
          landing_page: window.location.href,
          captured_at: new Date().toISOString()
        };
        this.saveAttributionData();
      }
    }

    captureClickIDs() {
      const params = new URLSearchParams(window.location.search);
      const clickIds = {
        fbclid: params.get('fbclid'),
        gclid: params.get('gclid'),
        ttclid: params.get('ttclid'),
        msclkid: params.get('msclkid'),
      };

      const hasClickId = Object.values(clickIds).some(v => v !== null);

      if (hasClickId) {
        console.log('[Revoa Pixel] Captured click IDs', clickIds);
        this.attributionData = {
          ...this.attributionData,
          ...clickIds,
        };
        this.saveAttributionData();
      }
    }

    getAttributionData() {
      const cookie = this.getCookie(COOKIE_NAME);
      if (cookie) {
        try {
          return JSON.parse(decodeURIComponent(cookie));
        } catch (e) {
          console.warn('[Revoa Pixel] Failed to parse attribution cookie', e);
        }
      }
      return {
        referrer: document.referrer,
        landing_page: window.location.href,
        captured_at: new Date().toISOString()
      };
    }

    saveAttributionData() {
      const encoded = encodeURIComponent(JSON.stringify(this.attributionData));
      this.setCookie(COOKIE_NAME, encoded, COOKIE_EXPIRY_DAYS);
    }

    getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    }

    setCookie(name, value, days) {
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
    }

    async trackPageView() {
      await this.track('PageView', {
        page_url: window.location.href,
        page_title: document.title,
        referrer: document.referrer
      });
    }

    async track(eventName, eventData = {}) {
      const payload = {
        store_id: this.storeId,
        session_id: this.sessionId,
        event_name: eventName,
        event_time: new Date().toISOString(),
        event_data: eventData,
        attribution: this.attributionData,
        page: {
          url: window.location.href,
          title: document.title,
          referrer: document.referrer,
          path: window.location.pathname
        },
        user_agent: navigator.userAgent,
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      };

      console.log('[Revoa Pixel] Tracking event', eventName, payload);

      try {
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          keepalive: true
        });

        if (!response.ok) {
          console.error('[Revoa Pixel] Failed to send event', response.status);
        }
      } catch (error) {
        console.error('[Revoa Pixel] Error sending event', error);
      }
    }

    identify(userData) {
      console.log('[Revoa Pixel] Identifying user', userData);
      this.attributionData = {
        ...this.attributionData,
        user: userData
      };
      this.saveAttributionData();
    }
  }

  function autoInit() {
    const script = document.currentScript || document.querySelector('script[data-store-id]');
    if (!script) {
      console.warn('[Revoa Pixel] Could not find script tag with data-store-id');
      return;
    }

    const storeId = script.getAttribute('data-store-id');
    const apiEndpoint = script.getAttribute('data-api-endpoint');

    if (!storeId) {
      console.error('[Revoa Pixel] Missing required data-store-id attribute');
      return;
    }

    window.revoaPixel = new RevoaPixel(storeId, apiEndpoint);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  if (typeof window.Shopify !== 'undefined') {
    console.log('[Revoa Pixel] Shopify detected, setting up checkout tracking');

    if (window.Shopify.checkout) {
      const checkout = window.Shopify.checkout;

      if (checkout.order_id) {
        window.revoa?.track('Purchase', {
          order_id: checkout.order_id,
          order_number: checkout.order_number,
          total_price: checkout.total_price,
          currency: checkout.currency,
          line_items: checkout.line_items
        });
      }
    }
  }
})();
