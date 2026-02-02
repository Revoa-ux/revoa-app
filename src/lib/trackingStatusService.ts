import { supabase } from './supabase';

export type TrackingMethod = 'utm' | 'capi' | 'pixel';

export interface TrackingMethodStatus {
  method: TrackingMethod;
  isActive: boolean;
  isHealthy: boolean;
  coverage: number;
  lastActivity: Date | null;
  canProvideCOGS: boolean;
  details: string;
}

export interface TrackingStatus {
  methods: TrackingMethodStatus[];
  primaryMethod: TrackingMethod | null;
  overallScore: number;
  cogsReliability: 'high' | 'medium' | 'low' | 'none';
  recommendation: string;
}

export async function getTrackingStatus(
  userId: string,
  startDate: string,
  endDate: string
): Promise<TrackingStatus> {
  const [utmStatus, capiStatus, pixelStatus] = await Promise.all([
    checkUTMStatus(userId, startDate, endDate),
    checkCAPIStatus(userId),
    checkPixelStatus(userId, startDate, endDate)
  ]);

  const methods = [utmStatus, capiStatus, pixelStatus];
  const activeMethods = methods.filter(m => m.isActive && m.isHealthy);
  const primaryMethod = determinePrimaryMethod(methods);
  const overallScore = calculateOverallScore(methods);
  const cogsReliability = determineCogsReliability(methods);
  const recommendation = generateRecommendation(methods, cogsReliability);

  return {
    methods,
    primaryMethod,
    overallScore,
    cogsReliability,
    recommendation
  };
}

async function checkUTMStatus(
  userId: string,
  startDate: string,
  endDate: string
): Promise<TrackingMethodStatus> {
  const { data: orders, error } = await supabase
    .from('shopify_orders')
    .select('id, utm_source, utm_term, fbclid, gclid, ttclid, created_at')
    .eq('user_id', userId)
    .gte('ordered_at', startDate)
    .lte('ordered_at', endDate)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !orders) {
    return {
      method: 'utm',
      isActive: false,
      isHealthy: false,
      coverage: 0,
      lastActivity: null,
      canProvideCOGS: false,
      details: 'Unable to check UTM status'
    };
  }

  const totalOrders = orders.length;
  if (totalOrders === 0) {
    return {
      method: 'utm',
      isActive: false,
      isHealthy: false,
      coverage: 0,
      lastActivity: null,
      canProvideCOGS: false,
      details: 'No orders in date range'
    };
  }

  const ordersWithUTM = orders.filter(o =>
    o.utm_source || o.utm_term || o.fbclid || o.gclid || o.ttclid
  );
  const coverage = (ordersWithUTM.length / totalOrders) * 100;
  const lastActivity = ordersWithUTM.length > 0
    ? new Date(ordersWithUTM[0].created_at)
    : null;

  const isActive = ordersWithUTM.length > 0;
  const isHealthy = coverage >= 30;

  return {
    method: 'utm',
    isActive,
    isHealthy,
    coverage,
    lastActivity,
    canProvideCOGS: isActive,
    details: isHealthy
      ? `${coverage.toFixed(0)}% of orders have UTM/click tracking`
      : isActive
        ? `Low coverage: ${coverage.toFixed(0)}% of orders tracked`
        : 'No UTM parameters detected'
  };
}

async function checkCAPIStatus(userId: string): Promise<TrackingMethodStatus> {
  const { data: capiSettings, error } = await supabase
    .from('platform_capi_settings')
    .select('platform, is_active, last_verified_at')
    .eq('user_id', userId);

  if (error || !capiSettings || capiSettings.length === 0) {
    return {
      method: 'capi',
      isActive: false,
      isHealthy: false,
      coverage: 0,
      lastActivity: null,
      canProvideCOGS: false,
      details: 'CAPI not configured'
    };
  }

  const activeSettings = capiSettings.filter(s => s.is_active);
  const isActive = activeSettings.length > 0;

  const lastVerified = activeSettings
    .map(s => s.last_verified_at)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const isRecent = lastVerified
    ? (Date.now() - new Date(lastVerified).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false;

  const platforms = activeSettings.map(s => s.platform).join(', ');

  return {
    method: 'capi',
    isActive,
    isHealthy: isActive && isRecent,
    coverage: isActive ? 100 : 0,
    lastActivity: lastVerified ? new Date(lastVerified) : null,
    canProvideCOGS: false,
    details: isActive
      ? `Active for ${platforms}${isRecent ? '' : ' (not verified recently)'}`
      : 'CAPI not enabled'
  };
}

async function checkPixelStatus(
  userId: string,
  startDate: string,
  endDate: string
): Promise<TrackingMethodStatus> {
  const { data: pixelEvents, error } = await supabase
    .from('pixel_events')
    .select('id, event_name, utm_source, utm_term, fbclid, gclid, created_at')
    .eq('user_id', userId)
    .gte('event_time', startDate)
    .lte('event_time', endDate)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error || !pixelEvents) {
    return {
      method: 'pixel',
      isActive: false,
      isHealthy: false,
      coverage: 0,
      lastActivity: null,
      canProvideCOGS: false,
      details: 'Unable to check Pixel status'
    };
  }

  const totalEvents = pixelEvents.length;
  if (totalEvents === 0) {
    return {
      method: 'pixel',
      isActive: false,
      isHealthy: false,
      coverage: 0,
      lastActivity: null,
      canProvideCOGS: false,
      details: 'No pixel events in date range'
    };
  }

  const purchaseEvents = pixelEvents.filter(e => e.event_name === 'Purchase');
  const eventsWithAttribution = pixelEvents.filter(e =>
    e.utm_source || e.utm_term || e.fbclid || e.gclid
  );

  const coverage = (eventsWithAttribution.length / totalEvents) * 100;
  const lastActivity = new Date(pixelEvents[0].created_at);

  const isActive = totalEvents > 0;
  const isHealthy = coverage >= 30 && purchaseEvents.length > 0;

  return {
    method: 'pixel',
    isActive,
    isHealthy,
    coverage,
    lastActivity,
    canProvideCOGS: purchaseEvents.length > 0 && coverage >= 30,
    details: isHealthy
      ? `${purchaseEvents.length} purchases tracked, ${coverage.toFixed(0)}% with attribution`
      : isActive
        ? `Active but low attribution: ${coverage.toFixed(0)}%`
        : 'Pixel not firing'
  };
}

function determinePrimaryMethod(methods: TrackingMethodStatus[]): TrackingMethod | null {
  const healthyMethods = methods.filter(m => m.isActive && m.isHealthy && m.canProvideCOGS);

  if (healthyMethods.length === 0) {
    const activeMethods = methods.filter(m => m.isActive && m.canProvideCOGS);
    if (activeMethods.length === 0) return null;
    return activeMethods.sort((a, b) => b.coverage - a.coverage)[0].method;
  }

  return healthyMethods.sort((a, b) => b.coverage - a.coverage)[0].method;
}

function calculateOverallScore(methods: TrackingMethodStatus[]): number {
  const utmScore = methods.find(m => m.method === 'utm');
  const pixelScore = methods.find(m => m.method === 'pixel');
  const capiScore = methods.find(m => m.method === 'capi');

  let score = 0;

  if (utmScore?.isHealthy) score += 40;
  else if (utmScore?.isActive) score += 20;

  if (pixelScore?.isHealthy) score += 35;
  else if (pixelScore?.isActive) score += 15;

  if (capiScore?.isHealthy) score += 25;
  else if (capiScore?.isActive) score += 10;

  return Math.min(100, score);
}

function determineCogsReliability(methods: TrackingMethodStatus[]): 'high' | 'medium' | 'low' | 'none' {
  const utmStatus = methods.find(m => m.method === 'utm');
  const pixelStatus = methods.find(m => m.method === 'pixel');

  if (utmStatus?.isHealthy || pixelStatus?.isHealthy) {
    const coverage = Math.max(utmStatus?.coverage || 0, pixelStatus?.coverage || 0);
    if (coverage >= 70) return 'high';
    if (coverage >= 40) return 'medium';
    return 'low';
  }

  if (utmStatus?.isActive || pixelStatus?.isActive) {
    return 'low';
  }

  return 'none';
}

function generateRecommendation(
  methods: TrackingMethodStatus[],
  cogsReliability: string
): string {
  const utmStatus = methods.find(m => m.method === 'utm');
  const pixelStatus = methods.find(m => m.method === 'pixel');
  const capiStatus = methods.find(m => m.method === 'capi');

  const issues: string[] = [];

  if (!utmStatus?.isActive && !pixelStatus?.isActive) {
    return 'Set up UTM parameters or install the Revoa Pixel to track ad performance and calculate real profit.';
  }

  if (utmStatus?.isActive && !utmStatus.isHealthy) {
    issues.push('Improve UTM tracking coverage by adding UTM parameters to all ad URLs');
  }

  if (!pixelStatus?.isActive) {
    issues.push('Install the Revoa Pixel for better conversion tracking');
  }

  if (!capiStatus?.isActive) {
    issues.push('Enable CAPI for server-side tracking (improves data accuracy)');
  }

  if (cogsReliability === 'low') {
    issues.push('Low tracking coverage - profit calculations may be incomplete');
  }

  if (issues.length === 0) {
    return 'Tracking is healthy. Profit data is reliable.';
  }

  return issues[0];
}

export async function getCogsDataQuality(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  hasRealCOGS: boolean;
  confidence: number;
  source: TrackingMethod | null;
  coverage: number;
}> {
  const status = await getTrackingStatus(userId, startDate, endDate);

  const utmCoverage = status.methods.find(m => m.method === 'utm')?.coverage || 0;
  const pixelCoverage = status.methods.find(m => m.method === 'pixel')?.coverage || 0;
  const bestCoverage = Math.max(utmCoverage, pixelCoverage);

  return {
    hasRealCOGS: status.cogsReliability !== 'none',
    confidence: bestCoverage / 100,
    source: status.primaryMethod,
    coverage: bestCoverage
  };
}
