import { StandardEquitiesMarketScheduleStrategy } from '../standard-equities-market-schedule.strategy';

describe('StandardEquitiesMarketScheduleStrategy', () => {
  let strategy: StandardEquitiesMarketScheduleStrategy;

  beforeEach(() => {
    strategy = new StandardEquitiesMarketScheduleStrategy();
  });

  it('should return true for Monday through Friday', () => {
    const monday = new Date('2026-07-20T10:00:00Z');
    const friday = new Date('2026-07-24T10:00:00Z');

    expect(strategy.isMarketOpen(monday)).toBe(true);
    expect(strategy.isMarketOpen(friday)).toBe(true);
  });

  it('should return false for Saturday and Sunday', () => {
    const saturday = new Date('2026-07-25T10:00:00Z');
    const sunday = new Date('2026-07-26T10:00:00Z');

    expect(strategy.isMarketOpen(saturday)).toBe(false);
    expect(strategy.isMarketOpen(sunday)).toBe(false);
  });

  it('should return next Monday if submitted on Saturday', () => {
    const saturday = new Date('2026-07-25T14:00:00Z');
    const executionDate = strategy.getNextMarketExecutionDate(saturday);

    expect(executionDate.getDay()).toBe(1); // Monday
    expect(executionDate.getDate()).toBe(27); // 2026-07-27
  });

  it('should return next Monday if submitted on Sunday', () => {
    const sunday = new Date('2026-07-26T14:00:00Z');
    const executionDate = strategy.getNextMarketExecutionDate(sunday);

    expect(executionDate.getDay()).toBe(1); // Monday
    expect(executionDate.getDate()).toBe(27); // 2026-07-27
  });

  it('should evaluate default current date if parameter is omitted', () => {
    expect(typeof strategy.isMarketOpen()).toBe('boolean');
    expect(strategy.getNextMarketExecutionDate()).toBeInstanceOf(Date);
  });
});
