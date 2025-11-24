/**
 * Unit Tests for FeedbackEngine
 * Tests dynamic feedback generation
 */

import { FeedbackEngine } from '../FeedbackEngine';
import {
  ValidationStrategy,
  NumericOperator,
  NumericCriteria,
  ExitCodeCriteria,
  KeywordCriteria,
  ValidationResult
} from '../../types/validation';

describe('FeedbackEngine', () => {
  let engine: FeedbackEngine;

  beforeEach(() => {
    engine = new FeedbackEngine();
  });

  describe('generateFeedback() - Success Cases', () => {
    it('should generate success feedback for numeric validation', () => {
      const criteria: NumericCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: 100,
        metricName: 'score'
      };

      const result: ValidationResult = {
        passed: true,
        actualValue: 150,
        expectedValue: 100,
        message: 'Validation passed: 150 > 100',
        timestamp: new Date()
      };

      const feedback = engine.generateFeedback(criteria, result, 1);

      expect(feedback).toContain('✓ Attempt 1 succeeded!');
      expect(feedback).toContain('Goal achieved');
    });

    it('should generate success feedback for exit code validation', () => {
      const criteria: ExitCodeCriteria = {
        strategy: ValidationStrategy.EXIT_CODE,
        expectedCode: 0,
        command: 'npm test'
      };

      const result: ValidationResult = {
        passed: true,
        actualValue: 0,
        expectedValue: 0,
        message: 'Command succeeded with exit code 0',
        timestamp: new Date()
      };

      const feedback = engine.generateFeedback(criteria, result, 2);

      expect(feedback).toContain('✓ Attempt 2 succeeded!');
      expect(feedback).toContain('Command executed successfully');
    });

    it('should generate success feedback for keyword validation', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'SUCCESS',
        mustContain: true
      };

      const result: ValidationResult = {
        passed: true,
        actualValue: 'found',
        expectedValue: 'SUCCESS',
        message: 'Output contains required keyword: "SUCCESS"',
        timestamp: new Date()
      };

      const feedback = engine.generateFeedback(criteria, result, 1);

      expect(feedback).toContain('✓ Attempt 1 succeeded!');
      expect(feedback).toContain('Keyword validation succeeded');
    });
  });

  describe('generateFeedback() - Failure Cases', () => {
    it('should generate failure feedback for numeric validation', () => {
      const criteria: NumericCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: 100,
        metricName: 'performance'
      };

      const result: ValidationResult = {
        passed: false,
        actualValue: 75,
        expectedValue: 100,
        message: 'Validation failed: 75 not > 100',
        timestamp: new Date()
      };

      const feedback = engine.generateFeedback(criteria, result, 3);

      expect(feedback).toContain('✗ Attempt 3 failed.');
      expect(feedback).toContain('Target');
      expect(feedback).toContain('Please review and make necessary adjustments');
    });

    it('should generate failure feedback for exit code validation', () => {
      const criteria: ExitCodeCriteria = {
        strategy: ValidationStrategy.EXIT_CODE,
        expectedCode: 0,
        command: 'npm build'
      };

      const result: ValidationResult = {
        passed: false,
        actualValue: 1,
        expectedValue: 0,
        message: 'Command failed with exit code 1, expected 0',
        timestamp: new Date()
      };

      const feedback = engine.generateFeedback(criteria, result, 2);

      expect(feedback).toContain('✗ Attempt 2 failed.');
      expect(feedback).toContain('Execution failed');
      expect(feedback).toContain('Please review and make necessary adjustments');
    });

    it('should generate failure feedback for keyword validation', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'COMPLETED',
        mustContain: true
      };

      const result: ValidationResult = {
        passed: false,
        actualValue: 'not found',
        expectedValue: 'COMPLETED',
        message: 'Output missing required keyword: "COMPLETED"',
        timestamp: new Date()
      };

      const feedback = engine.generateFeedback(criteria, result, 1);

      expect(feedback).toContain('✗ Attempt 1 failed.');
      expect(feedback).toContain('does not contain');
      expect(feedback).toContain('required keyword');
      expect(feedback).toContain('Please review and make necessary adjustments');
    });
  });

  describe('generateProgressSummary()', () => {
    it('should generate basic progress summary', () => {
      const summary = engine.generateProgressSummary(3, 10, []);

      expect(summary).toContain('Progress: Attempt 3/10');
      expect(summary).toContain('(30.0%)');
      expect(summary).not.toContain('Warning');
    });

    it('should calculate progress percentage correctly', () => {
      const summary1 = engine.generateProgressSummary(1, 10, []);
      expect(summary1).toContain('(10.0%)');

      const summary2 = engine.generateProgressSummary(5, 10, []);
      expect(summary2).toContain('(50.0%)');

      const summary3 = engine.generateProgressSummary(10, 10, []);
      expect(summary3).toContain('(100.0%)');
    });

    it('should warn when 3 attempts remain', () => {
      const summary = engine.generateProgressSummary(7, 10, []);

      expect(summary).toContain('⚠️  Warning: Only 3 attempts remaining!');
    });

    it('should warn when 2 attempts remain', () => {
      const summary = engine.generateProgressSummary(8, 10, []);

      expect(summary).toContain('⚠️  Warning: Only 2 attempts remaining!');
    });

    it('should warn when 1 attempt remains', () => {
      const summary = engine.generateProgressSummary(9, 10, []);

      expect(summary).toContain('⚠️  Warning: Only 1 attempts remaining!');
    });

    it('should not warn when more than 3 attempts remain', () => {
      const summary = engine.generateProgressSummary(6, 10, []);

      expect(summary).not.toContain('Warning');
    });

    it('should detect repeated failure pattern', () => {
      const repeatedResults: ValidationResult[] = [
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Same error message',
          timestamp: new Date()
        },
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Same error message',
          timestamp: new Date()
        },
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Same error message',
          timestamp: new Date()
        }
      ];

      const summary = engine.generateProgressSummary(5, 10, repeatedResults);

      expect(summary).toContain('⚠️  Detected repeated failure pattern');
      expect(summary).toContain('Consider changing approach');
    });

    it('should not detect pattern with different error messages', () => {
      const differentResults: ValidationResult[] = [
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Error 1',
          timestamp: new Date()
        },
        {
          passed: false,
          actualValue: 60,
          expectedValue: 100,
          message: 'Error 2',
          timestamp: new Date()
        },
        {
          passed: false,
          actualValue: 70,
          expectedValue: 100,
          message: 'Error 3',
          timestamp: new Date()
        }
      ];

      const summary = engine.generateProgressSummary(5, 10, differentResults);

      expect(summary).not.toContain('repeated failure pattern');
    });

    it('should not detect pattern with less than 3 results', () => {
      const fewResults: ValidationResult[] = [
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Same error',
          timestamp: new Date()
        },
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Same error',
          timestamp: new Date()
        }
      ];

      const summary = engine.generateProgressSummary(5, 10, fewResults);

      expect(summary).not.toContain('repeated failure pattern');
    });

    it('should only check last 3 results for pattern detection', () => {
      const manyResults: ValidationResult[] = [
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Different error',
          timestamp: new Date()
        },
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Different error',
          timestamp: new Date()
        },
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Same error',
          timestamp: new Date()
        },
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Same error',
          timestamp: new Date()
        },
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Same error',
          timestamp: new Date()
        }
      ];

      const summary = engine.generateProgressSummary(5, 10, manyResults);

      expect(summary).toContain('⚠️  Detected repeated failure pattern');
    });

    it('should combine warnings when both conditions met', () => {
      const repeatedResults: ValidationResult[] = [
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Same error',
          timestamp: new Date()
        },
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Same error',
          timestamp: new Date()
        },
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Same error',
          timestamp: new Date()
        }
      ];

      const summary = engine.generateProgressSummary(8, 10, repeatedResults);

      expect(summary).toContain('⚠️  Warning: Only 2 attempts remaining!');
      expect(summary).toContain('⚠️  Detected repeated failure pattern');
    });
  });

  describe('Validator Selection', () => {
    it('should handle numeric validation criteria', () => {
      const criteria: NumericCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.EQUAL,
        threshold: 100
      };

      const result: ValidationResult = {
        passed: true,
        actualValue: 100,
        expectedValue: 100,
        message: 'Test',
        timestamp: new Date()
      };

      const feedback = engine.generateFeedback(criteria, result, 1);

      expect(feedback).toBeDefined();
      expect(feedback).toContain('succeeded');
    });

    it('should handle exit code validation criteria', () => {
      const criteria: ExitCodeCriteria = {
        strategy: ValidationStrategy.EXIT_CODE,
        expectedCode: 0
      };

      const result: ValidationResult = {
        passed: true,
        actualValue: 0,
        expectedValue: 0,
        message: 'Test',
        timestamp: new Date()
      };

      const feedback = engine.generateFeedback(criteria, result, 1);

      expect(feedback).toBeDefined();
      expect(feedback).toContain('succeeded');
    });

    it('should handle keyword validation criteria', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'TEST',
        mustContain: true
      };

      const result: ValidationResult = {
        passed: true,
        actualValue: 'found',
        expectedValue: 'TEST',
        message: 'Test',
        timestamp: new Date()
      };

      const feedback = engine.generateFeedback(criteria, result, 1);

      expect(feedback).toBeDefined();
      expect(feedback).toContain('succeeded');
    });

    it('should throw error for unknown validation strategy', () => {
      const invalidCriteria = {
        strategy: 'INVALID_STRATEGY' as ValidationStrategy
      } as any;

      const result: ValidationResult = {
        passed: false,
        actualValue: 0,
        expectedValue: 0,
        message: 'Test',
        timestamp: new Date()
      };

      expect(() => {
        engine.generateFeedback(invalidCriteria, result, 1);
      }).toThrow('Unknown validation strategy');
    });
  });

  describe('Edge Cases', () => {
    it('should handle attempt number 0', () => {
      const criteria: NumericCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.EQUAL,
        threshold: 100
      };

      const result: ValidationResult = {
        passed: true,
        actualValue: 100,
        expectedValue: 100,
        message: 'Test',
        timestamp: new Date()
      };

      const feedback = engine.generateFeedback(criteria, result, 0);

      expect(feedback).toContain('Attempt 0');
    });

    it('should handle large attempt numbers', () => {
      const summary = engine.generateProgressSummary(999, 1000, []);

      expect(summary).toContain('Attempt 999/1000');
      expect(summary).toContain('(99.9%)');
      expect(summary).toContain('Only 1 attempts remaining');
    });

    it('should handle empty recentResults array', () => {
      const summary = engine.generateProgressSummary(5, 10, []);

      expect(summary).toBeDefined();
      expect(summary).toContain('Progress');
      expect(summary).not.toContain('repeated failure pattern');
    });

    it('should handle single result in array', () => {
      const singleResult: ValidationResult[] = [
        {
          passed: false,
          actualValue: 50,
          expectedValue: 100,
          message: 'Error',
          timestamp: new Date()
        }
      ];

      const summary = engine.generateProgressSummary(5, 10, singleResult);

      expect(summary).toBeDefined();
      expect(summary).not.toContain('repeated failure pattern');
    });
  });
});
