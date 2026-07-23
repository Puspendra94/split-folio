import { SnakeNamingStrategy } from '../snake-naming.strategy';

describe('SnakeNamingStrategy', () => {
  it('should export SnakeNamingStrategy from typeorm-naming-strategies', () => {
    expect(SnakeNamingStrategy).toBeDefined();
    const strategy = new SnakeNamingStrategy();
    expect(strategy).toBeInstanceOf(SnakeNamingStrategy);
  });
});
