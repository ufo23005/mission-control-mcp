/**
 * Unit Tests for NumericValidator
 * Tests numeric comparison validation strategy
 */

import { NumericValidator } from '../NumericValidator';
import { ValidationStrategy, NumericOperator, NumericCriteria } from '../../types/validation';

describe('NumericValidator', () => {
  describe('validate() - GREATER_THAN operator', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.GREATER_THAN,
      threshold: 100,
      metricName: 'score'
    };

    it('should pass when value is greater than threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 150);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(150);
      expect(result.expectedValue).toBe(100);
      expect(result.message).toContain('Validation passed');
      expect(result.message).toContain('150 > 100');
    });

    it('should fail when value equals threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 100);

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe(100);
      expect(result.message).toContain('Validation failed');
    });

    it('should fail when value is less than threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 50);

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe(50);
    });
  });

  describe('validate() - LESS_THAN operator', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.LESS_THAN,
      threshold: 100,
      metricName: 'latency'
    };

    it('should pass when value is less than threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 50);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(50);
    });

    it('should fail when value equals threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 100);

      expect(result.passed).toBe(false);
    });

    it('should fail when value is greater than threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 150);

      expect(result.passed).toBe(false);
    });
  });

  describe('validate() - GREATER_EQUAL operator', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.GREATER_EQUAL,
      threshold: 100,
      metricName: 'score'
    };

    it('should pass when value is greater than threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 150);

      expect(result.passed).toBe(true);
    });

    it('should pass when value equals threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 100);

      expect(result.passed).toBe(true);
    });

    it('should fail when value is less than threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 50);

      expect(result.passed).toBe(false);
    });
  });

  describe('validate() - LESS_EQUAL operator', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.LESS_EQUAL,
      threshold: 100,
      metricName: 'cost'
    };

    it('should pass when value is less than threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 50);

      expect(result.passed).toBe(true);
    });

    it('should pass when value equals threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 100);

      expect(result.passed).toBe(true);
    });

    it('should fail when value is greater than threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 150);

      expect(result.passed).toBe(false);
    });
  });

  describe('validate() - EQUAL operator', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.EQUAL,
      threshold: 100,
      metricName: 'exact_value'
    };

    it('should pass when value equals threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 100);

      expect(result.passed).toBe(true);
    });

    it('should pass when value is within float epsilon of threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 100.00001);

      expect(result.passed).toBe(true);
    });

    it('should fail when value is different from threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 101);

      expect(result.passed).toBe(false);
    });
  });

  describe('validate() - NOT_EQUAL operator', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.NOT_EQUAL,
      threshold: 100,
      metricName: 'value'
    };

    it('should pass when value is different from threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 101);

      expect(result.passed).toBe(true);
    });

    it('should fail when value equals threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 100);

      expect(result.passed).toBe(false);
    });
  });

  describe('validate() - Value Extraction', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.GREATER_THAN,
      threshold: 100,
      metricName: 'score'
    };

    it('should extract number from string when value not provided', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('The score is 150');

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(150);
    });

    it('should extract first number from string', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('Attempt 5: score=125, time=200');

      expect(result.passed).toBe(false); // 5 is not > 100
      expect(result.actualValue).toBe(5); // Extracts first number
    });

    it('should handle negative numbers', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('Temperature: -10 degrees');

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe(-10);
    });

    it('should handle decimal numbers', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('Value: 123.45');

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(123.45);
    });

    it('should fail when no number found in output', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('No numbers here');

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBeUndefined();
      expect(result.message).toContain('Failed to extract numeric value');
    });

    it('should prefer provided value over extraction', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('The score is 50', 150);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(150); // Uses provided value, not extracted
    });
  });

  describe('generateFeedback()', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.GREATER_THAN,
      threshold: 100,
      metricName: 'performance_score'
    };

    it('should generate success feedback when validation passed', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 150);
      const feedback = validator.generateFeedback(result);

      expect(feedback).toContain('Goal achieved');
      expect(feedback).toContain('performance_score');
      expect(feedback).toContain('150');
    });

    it('should generate failure feedback with gap calculation', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 80);
      const feedback = validator.generateFeedback(result);

      expect(feedback).toContain('Target');
      expect(feedback).toContain('performance_score > 100');
      expect(feedback).toContain('Current: 80');
      expect(feedback).toContain('Gap: 20.00');
      expect(feedback).toContain('Suggestion');
    });

    it('should use "Value" when metricName is not provided', () => {
      const criteriaNoName: NumericCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: 100
      };

      const validator = new NumericValidator(criteriaNoName);
      const result = validator.validate('', 150);
      const feedback = validator.generateFeedback(result);

      expect(feedback).toContain('Value');
    });

    it('should calculate gap correctly for values below threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 75);
      const feedback = validator.generateFeedback(result);

      expect(feedback).toContain('Gap: 25.00');
    });

    it('should calculate gap correctly for values above threshold', () => {
      const criteria2: NumericCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.LESS_THAN,
        threshold: 50,
        metricName: 'latency'
      };

      const validator = new NumericValidator(criteria2);
      const result = validator.validate('', 100);
      const feedback = validator.generateFeedback(result);

      expect(feedback).toContain('Gap: 50.00');
    });
  });

  describe('Edge Cases', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.GREATER_THAN,
      threshold: 0,
      metricName: 'value'
    };

    it('should handle zero threshold', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 10);

      expect(result.passed).toBe(true);
    });

    it('should handle zero value', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 0);

      expect(result.passed).toBe(false);
    });

    it('should handle very large numbers', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 1e10);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(10000000000);
    });

    it('should handle very small numbers', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 0.0001);

      expect(result.passed).toBe(true);
    });

    it('should handle string number value', () => {
      const validator = new NumericValidator(criteria);
      // TypeScript allows number | string, but the validator converts it
      const result = validator.validate('The value is 50');

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(50);
    });
  });

  describe('ValidationResult Structure', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.EQUAL,
      threshold: 100,
      metricName: 'score'
    };

    it('should return result with all required fields', () => {
      const validator = new NumericValidator(criteria);
      const result = validator.validate('', 100);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('actualValue');
      expect(result).toHaveProperty('expectedValue');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });
});
