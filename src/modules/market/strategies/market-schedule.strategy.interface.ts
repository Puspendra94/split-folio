export interface IMarketScheduleStrategy {
  isMarketOpen(date?: Date): boolean;
  getNextMarketExecutionDate(date?: Date): Date;
}
