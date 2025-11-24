/**
 * Unit Tests for AttemptCounter
 * Tests both constructor and factory method patterns
 */

import { AttemptCounter } from '../AttemptCounter';
import { MaxAttemptsExceededError } from '../../utils/errors';

describe('AttemptCounter', () => {
  describe('Constructor', () => {
    it('should create counter with default warn threshold', () => {
      const counter = new AttemptCounter({ maxAttempts: 10 });

      expect(counter.getCurrentAttempt()).toBe(0);
      expect(counter.getRemainingAttempts()).toBe(10);
      expect(counter.hasAttemptsRemaining()).toBe(true);
    });

    it('should create counter with custom warn threshold', () => {
      const counter = new AttemptCounter({
        maxAttempts: 10,
        warnThreshold: 5
      });

      expect(counter.getCurrentAttempt()).toBe(0);
      expect(counter.getRemainingAttempts()).toBe(10);
    });
  });

  describe('increment()', () => {
    it('should increment counter correctly', () => {
      const counter = new AttemptCounter({ maxAttempts: 5 });

      expect(counter.increment()).toBe(1);
      expect(counter.increment()).toBe(2);
      expect(counter.getCurrentAttempt()).toBe(2);
      expect(counter.getRemainingAttempts()).toBe(3);
    });

    it('should throw MaxAttemptsExceededError when exceeding limit', () => {
      const counter = new AttemptCounter({ maxAttempts: 3 });

      counter.increment(); // 1
      counter.increment(); // 2
      counter.increment(); // 3

      expect(() => counter.increment()).toThrow(MaxAttemptsExceededError);
    });

    it('should calculate progress percentage correctly', () => {
      const counter = new AttemptCounter({ maxAttempts: 10 });

      counter.increment(); // 1
      expect(counter.getProgressPercentage()).toBe(10);

      counter.increment(); // 2
      expect(counter.getProgressPercentage()).toBe(20);

      for (let i = 0; i < 3; i++) counter.increment(); // 3, 4, 5
      expect(counter.getProgressPercentage()).toBe(50);
    });

    it('should correctly report when nearing limit', () => {
      const counter = new AttemptCounter({
        maxAttempts: 10,
        warnThreshold: 3
      });

      // Not nearing limit
      for (let i = 0; i < 6; i++) counter.increment();
      expect(counter.isNearingLimit()).toBe(false);

      // Nearing limit (7th attempt, 3 remaining)
      counter.increment();
      expect(counter.isNearingLimit()).toBe(true);
    });
  });

  describe('fromCurrentAttempt() - Factory Method', () => {
    it('should create counter at attempt 0', () => {
      const counter = AttemptCounter.fromCurrentAttempt(0, { maxAttempts: 10 });

      expect(counter.getCurrentAttempt()).toBe(0);
      expect(counter.getRemainingAttempts()).toBe(10);
      expect(counter.hasAttemptsRemaining()).toBe(true);
    });

    it('should create counter at mid-point', () => {
      const counter = AttemptCounter.fromCurrentAttempt(5, { maxAttempts: 10 });

      expect(counter.getCurrentAttempt()).toBe(5);
      expect(counter.getRemainingAttempts()).toBe(5);
      expect(counter.getProgressPercentage()).toBe(50);
    });

    it('should create counter near limit', () => {
      const counter = AttemptCounter.fromCurrentAttempt(8, {
        maxAttempts: 10,
        warnThreshold: 3
      });

      expect(counter.getCurrentAttempt()).toBe(8);
      expect(counter.getRemainingAttempts()).toBe(2);
      expect(counter.isNearingLimit()).toBe(true);
    });

    it('should create counter at exactly max attempts', () => {
      const counter = AttemptCounter.fromCurrentAttempt(10, { maxAttempts: 10 });

      expect(counter.getCurrentAttempt()).toBe(10);
      expect(counter.getRemainingAttempts()).toBe(0);
      expect(counter.hasAttemptsRemaining()).toBe(false);
    });

    it('should throw error for negative currentAttempt', () => {
      expect(() => {
        AttemptCounter.fromCurrentAttempt(-1, { maxAttempts: 10 });
      }).toThrow('currentAttempt cannot be negative');
    });

    it('should throw MaxAttemptsExceededError when currentAttempt exceeds max', () => {
      expect(() => {
        AttemptCounter.fromCurrentAttempt(11, { maxAttempts: 10 });
      }).toThrow(MaxAttemptsExceededError);
    });

    it('should allow increment after restoration', () => {
      const counter = AttemptCounter.fromCurrentAttempt(5, { maxAttempts: 10 });

      expect(counter.increment()).toBe(6);
      expect(counter.getCurrentAttempt()).toBe(6);
      expect(counter.getRemainingAttempts()).toBe(4);
    });

    it('should throw on increment when restored at max', () => {
      const counter = AttemptCounter.fromCurrentAttempt(10, { maxAttempts: 10 });

      expect(() => counter.increment()).toThrow(MaxAttemptsExceededError);
    });

    it('should respect custom warn threshold', () => {
      const counter = AttemptCounter.fromCurrentAttempt(7, {
        maxAttempts: 10,
        warnThreshold: 5
      });

      expect(counter.getRemainingAttempts()).toBe(3);
      expect(counter.isNearingLimit()).toBe(true); // 3 <= 5
    });
  });

  describe('reset()', () => {
    it('should reset counter to zero', () => {
      const counter = new AttemptCounter({ maxAttempts: 10 });

      counter.increment();
      counter.increment();
      counter.increment();
      expect(counter.getCurrentAttempt()).toBe(3);

      counter.reset();
      expect(counter.getCurrentAttempt()).toBe(0);
      expect(counter.getRemainingAttempts()).toBe(10);
    });

    it('should reset counter created from factory', () => {
      const counter = AttemptCounter.fromCurrentAttempt(8, { maxAttempts: 10 });

      expect(counter.getCurrentAttempt()).toBe(8);

      counter.reset();
      expect(counter.getCurrentAttempt()).toBe(0);
      expect(counter.getRemainingAttempts()).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maxAttempts of 1', () => {
      const counter = new AttemptCounter({ maxAttempts: 1 });

      expect(counter.increment()).toBe(1);
      expect(() => counter.increment()).toThrow(MaxAttemptsExceededError);
    });

    it('should handle factory creation with maxAttempts of 1', () => {
      const counter = AttemptCounter.fromCurrentAttempt(0, { maxAttempts: 1 });

      expect(counter.increment()).toBe(1);
      expect(() => counter.increment()).toThrow(MaxAttemptsExceededError);
    });

    it('should handle very large maxAttempts', () => {
      const counter = AttemptCounter.fromCurrentAttempt(999, { maxAttempts: 1000 });

      expect(counter.getCurrentAttempt()).toBe(999);
      expect(counter.getRemainingAttempts()).toBe(1);
      expect(counter.increment()).toBe(1000);
    });
  });

  describe('Performance - No Redundant Operations', () => {
    it('should create at high attempt count instantly (no loops)', () => {
      const startTime = Date.now();

      // Create counter at attempt 10000 - should be instant
      const counter = AttemptCounter.fromCurrentAttempt(10000, { maxAttempts: 10001 });

      const duration = Date.now() - startTime;

      expect(counter.getCurrentAttempt()).toBe(10000);
      expect(duration).toBeLessThan(10); // Should be < 10ms (basically instant)
    });

    it('should not trigger any operations during restoration', () => {
      // This test verifies that fromCurrentAttempt doesn't call increment()
      // If it did, it would trigger warnings and be slow

      let warningCount = 0;
      const originalWarn = console.warn;
      console.warn = () => { warningCount++; };

      try {
        AttemptCounter.fromCurrentAttempt(8, {
          maxAttempts: 10,
          warnThreshold: 3
        });

        // Should not have triggered any warnings during restoration
        expect(warningCount).toBe(0);
      } finally {
        console.warn = originalWarn;
      }
    });
  });
});
