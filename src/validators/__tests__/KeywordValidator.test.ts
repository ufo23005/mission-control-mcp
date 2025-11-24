/**
 * Unit Tests for KeywordValidator
 * Tests keyword validation strategy
 */

import { KeywordValidator } from '../KeywordValidator';
import { ValidationStrategy, KeywordCriteria } from '../../types/validation';

describe('KeywordValidator', () => {
  describe('validate() - mustContain: true', () => {
    const criteria: KeywordCriteria = {
      strategy: ValidationStrategy.KEYWORD,
      keyword: 'SUCCESS',
      mustContain: true
    };

    it('should pass when output contains required keyword', () => {
      const validator = new KeywordValidator(criteria);
      const result = validator.validate('Operation completed: SUCCESS');

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe('found');
      expect(result.expectedValue).toBe('SUCCESS');
      expect(result.message).toContain('contains required keyword');
      expect(result.message).toContain('SUCCESS');
    });

    it('should fail when output does not contain required keyword', () => {
      const validator = new KeywordValidator(criteria);
      const result = validator.validate('Operation failed');

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe('not found');
      expect(result.message).toContain('missing required keyword');
      expect(result.message).toContain('SUCCESS');
    });

    it('should be case sensitive by default', () => {
      const validator = new KeywordValidator(criteria);
      const result = validator.validate('Operation completed: success');

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe('not found');
    });

    it('should find keyword anywhere in output', () => {
      const validator = new KeywordValidator(criteria);
      const result = validator.validate('Line 1\nSUCCESS\nLine 3');

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe('found');
    });
  });

  describe('validate() - mustContain: false', () => {
    const criteria: KeywordCriteria = {
      strategy: ValidationStrategy.KEYWORD,
      keyword: 'ERROR',
      mustContain: false
    };

    it('should pass when output does not contain forbidden keyword', () => {
      const validator = new KeywordValidator(criteria);
      const result = validator.validate('Operation completed successfully');

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe('not found');
      expect(result.message).toContain('correctly excludes keyword');
      expect(result.message).toContain('ERROR');
    });

    it('should fail when output contains forbidden keyword', () => {
      const validator = new KeywordValidator(criteria);
      const result = validator.validate('ERROR: Operation failed');

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe('found');
      expect(result.message).toContain('unexpectedly contains keyword');
      expect(result.message).toContain('ERROR');
    });

    it('should be case sensitive by default', () => {
      const validator = new KeywordValidator(criteria);
      const result = validator.validate('error: something went wrong');

      expect(result.passed).toBe(true); // 'error' != 'ERROR'
      expect(result.actualValue).toBe('not found');
    });
  });

  describe('validate() - Case Sensitivity', () => {
    it('should match case-sensitively when caseSensitive is true', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'Warning',
        mustContain: true,
        caseSensitive: true
      };

      const validator = new KeywordValidator(criteria);

      expect(validator.validate('Warning: test').passed).toBe(true);
      expect(validator.validate('WARNING: test').passed).toBe(false);
      expect(validator.validate('warning: test').passed).toBe(false);
    });

    it('should match case-insensitively when caseSensitive is false', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'Warning',
        mustContain: true,
        caseSensitive: false
      };

      const validator = new KeywordValidator(criteria);

      expect(validator.validate('Warning: test').passed).toBe(true);
      expect(validator.validate('WARNING: test').passed).toBe(true);
      expect(validator.validate('warning: test').passed).toBe(true);
      expect(validator.validate('wArNiNg: test').passed).toBe(true);
    });

    it('should handle case-insensitive exclusion', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'ERROR',
        mustContain: false,
        caseSensitive: false
      };

      const validator = new KeywordValidator(criteria);

      expect(validator.validate('error occurred').passed).toBe(false);
      expect(validator.validate('Error occurred').passed).toBe(false);
      expect(validator.validate('ERROR occurred').passed).toBe(false);
      expect(validator.validate('All good').passed).toBe(true);
    });
  });

  describe('validate() - Edge Cases', () => {
    it('should handle empty output', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'SUCCESS',
        mustContain: true
      };

      const validator = new KeywordValidator(criteria);
      const result = validator.validate('');

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe('not found');
    });

    it('should handle empty keyword', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: '',
        mustContain: true
      };

      const validator = new KeywordValidator(criteria);
      const result = validator.validate('Some output');

      expect(result.passed).toBe(true); // Empty string is always contained
      expect(result.actualValue).toBe('found');
    });

    it('should handle special characters in keyword', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: '[ERROR]',
        mustContain: true
      };

      const validator = new KeywordValidator(criteria);

      expect(validator.validate('[ERROR] Something failed').passed).toBe(true);
      expect(validator.validate('ERROR Something failed').passed).toBe(false);
    });

    it('should handle multi-line output', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'SUCCESS',
        mustContain: true
      };

      const validator = new KeywordValidator(criteria);
      const multiLineOutput = `
        Starting process...
        Processing items...
        SUCCESS: All items processed
        Cleanup complete
      `;

      expect(validator.validate(multiLineOutput).passed).toBe(true);
    });

    it('should match partial strings', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'success',
        mustContain: true,
        caseSensitive: false
      };

      const validator = new KeywordValidator(criteria);

      expect(validator.validate('successful operation').passed).toBe(true);
      expect(validator.validate('unsuccessfully').passed).toBe(true);
    });

    it('should handle whitespace in keyword', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'test passed',
        mustContain: true
      };

      const validator = new KeywordValidator(criteria);

      expect(validator.validate('The test passed successfully').passed).toBe(true);
      expect(validator.validate('The testpassed successfully').passed).toBe(false);
    });
  });

  describe('generateFeedback()', () => {
    it('should generate success feedback when validation passed', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'SUCCESS',
        mustContain: true
      };

      const validator = new KeywordValidator(criteria);
      const result = validator.validate('Operation SUCCESS');
      const feedback = validator.generateFeedback(result);

      expect(feedback).toContain('Keyword validation succeeded');
    });

    it('should generate failure feedback for missing required keyword', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'COMPLETED',
        mustContain: true
      };

      const validator = new KeywordValidator(criteria);
      const result = validator.validate('Operation in progress');
      const feedback = validator.generateFeedback(result);

      expect(feedback).toContain('does not contain');
      expect(feedback).toContain('required keyword');
      expect(feedback).toContain('COMPLETED');
      expect(feedback).toContain('verify the process completed successfully');
    });

    it('should generate failure feedback for forbidden keyword found', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'FAILED',
        mustContain: false
      };

      const validator = new KeywordValidator(criteria);
      const result = validator.validate('Operation FAILED');
      const feedback = validator.generateFeedback(result);

      expect(feedback).toContain('contains');
      expect(feedback).toContain('forbidden keyword');
      expect(feedback).toContain('FAILED');
      expect(feedback).toContain('error or unexpected behavior');
    });
  });

  describe('ValidationResult Structure', () => {
    const criteria: KeywordCriteria = {
      strategy: ValidationStrategy.KEYWORD,
      keyword: 'TEST',
      mustContain: true
    };

    it('should return result with all required fields', () => {
      const validator = new KeywordValidator(criteria);
      const result = validator.validate('TEST output');

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('actualValue');
      expect(result).toHaveProperty('expectedValue');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should set actualValue to "found" when keyword is present', () => {
      const validator = new KeywordValidator(criteria);
      const result = validator.validate('TEST output');

      expect(result.actualValue).toBe('found');
    });

    it('should set actualValue to "not found" when keyword is absent', () => {
      const validator = new KeywordValidator(criteria);
      const result = validator.validate('Some output');

      expect(result.actualValue).toBe('not found');
    });

    it('should set expectedValue to the keyword', () => {
      const validator = new KeywordValidator(criteria);
      const result = validator.validate('TEST output');

      expect(result.expectedValue).toBe('TEST');
    });
  });
});
