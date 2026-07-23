export interface IPriceResolutionStrategy {
  resolvePrice(ticker: string, customPrice?: number | null): number;
}
