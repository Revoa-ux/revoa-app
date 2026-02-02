import { Quote, QuoteVariant, FinalVariant } from '@/types/quotes';

export interface ShippingVarianceAnalysis {
  hasCountryShipping: boolean;
  hasVariance: boolean;
  countries: string[];
  commonShipping: { [country: string]: number } | null;
}

export interface VariantDisplayData {
  name: string;
  sku: string;
  attributes: { name: string; value: string }[];
  pricePerUnit: number;
  standardShipping: number;
  totalCost: number;
  countryShipping: { [country: string]: number };
  hasUniqueShipping: boolean;
}

export function getVariantName(
  variant: QuoteVariant,
  finalVariant: FinalVariant,
  index: number
): string {
  if (finalVariant.variantName) {
    return finalVariant.variantName;
  }

  if (finalVariant.attributes && finalVariant.attributes.length > 0) {
    return finalVariant.attributes.map(a => a.value).join(' - ');
  }

  return `Variant ${index + 1}`;
}

export function analyzeShippingVariance(quote: Quote): ShippingVarianceAnalysis {
  if (!quote.variants || quote.variants.length === 0) {
    return {
      hasCountryShipping: false,
      hasVariance: false,
      countries: [],
      commonShipping: null
    };
  }

  const allFinalVariants: FinalVariant[] = [];
  quote.variants.forEach(variant => {
    if (variant.finalVariants) {
      allFinalVariants.push(...variant.finalVariants);
    }
  });

  if (allFinalVariants.length === 0) {
    return {
      hasCountryShipping: false,
      hasVariance: false,
      countries: [],
      commonShipping: null
    };
  }

  const allCountries = new Set<string>();
  const shippingMaps: Array<{ [key: string]: number }> = [];

  allFinalVariants.forEach(fv => {
    const countryMap: { [key: string]: number } = {};
    Object.keys(fv.shippingCosts).forEach(key => {
      if (key !== '_default') {
        allCountries.add(key);
        countryMap[key] = fv.shippingCosts[key];
      }
    });
    shippingMaps.push(countryMap);
  });

  const countries = Array.from(allCountries).sort();

  if (countries.length === 0) {
    return {
      hasCountryShipping: false,
      hasVariance: false,
      countries: [],
      commonShipping: null
    };
  }

  let hasVariance = false;
  const commonShipping: { [country: string]: number } = {};

  for (const country of countries) {
    const costs = shippingMaps.map(m => m[country]).filter(c => c !== undefined);

    if (costs.length === 0) continue;

    const firstCost = costs[0];
    const allSame = costs.every(c => c === firstCost);

    if (!allSame) {
      hasVariance = true;
      break;
    }

    commonShipping[country] = firstCost;
  }

  return {
    hasCountryShipping: true,
    hasVariance,
    countries,
    commonShipping: hasVariance ? null : commonShipping
  };
}

export function getVariantDisplayData(
  quote: Quote,
  shippingAnalysis: ShippingVarianceAnalysis
): VariantDisplayData[] {
  if (!quote.variants || quote.variants.length === 0) {
    return [];
  }

  const displayData: VariantDisplayData[] = [];
  let variantIndex = 0;

  quote.variants.forEach(variant => {
    variant.finalVariants?.forEach(fv => {
      const { _default, ...countryShipping } = fv.shippingCosts;
      const pricePerUnit = fv.costPerItem ?? 0;
      const standardShipping = _default ?? 0;

      displayData.push({
        name: getVariantName(variant, fv, variantIndex),
        sku: fv.sku || '',
        attributes: fv.attributes || [],
        pricePerUnit,
        standardShipping,
        totalCost: pricePerUnit + standardShipping,
        countryShipping,
        hasUniqueShipping: shippingAnalysis.hasVariance && Object.keys(countryShipping).length > 0
      });

      variantIndex++;
    });
  });

  return displayData;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  return `$${value.toFixed(2)}`;
}

export function getQuoteDisplayMode(): 'modal' | 'expanded' {
  if (typeof window === 'undefined') return 'modal';
  const stored = localStorage.getItem('quoteDisplayMode');
  return (stored === 'modal' || stored === 'expanded') ? stored : 'modal';
}

export function setQuoteDisplayMode(mode: 'modal' | 'expanded'): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('quoteDisplayMode', mode);
  }
}
