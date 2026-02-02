export type SortField = 'sales' | 'adSpend' | 'roas' | 'name' | 'impressions' | 'clicks' | 'conversions';
export type SortDirection = 'asc' | 'desc';

export interface ProductSortConfig {
  field: SortField;
  direction: SortDirection;
}
