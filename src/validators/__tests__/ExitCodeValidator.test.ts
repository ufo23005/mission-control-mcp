/**
 * Unit Tests for ExitCodeValidator
 * Tests exit code validation strategy
 */

import { ExitCodeValidator } from '../ExitCodeValidator';
import { ValidationStrategy, ExitCodeCriteria } from '../../types/validation';

describe('ExitCodeValidator', () => {
  describe('validate() - Success Cases', () => {
    const criteria: ExitCodeCriteria = {
      strategy: ValidationStrategy.EXIT_CODE,
      expectedCode: 0,
      command: 'npm test'
    };

    it('should pass when exit code is 0', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('', 0);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(0);
      expect(result.expectedValue).toBe(0);
      expect(result.message).toContain('succeeded');
      expect(result.message).toContain('exit code 0');
    });

    it('should fail when exit code is non-zero', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('', 1);

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe(1);
      expect(result.message).toContain('failed');
      expect(result.message).toContain('exit code 1');
      expect(result.message).toContain('expected 0');
    });
  });

  describe('validate() - Non-Zero Expected Code', () => {
    const criteria: ExitCodeCriteria = {
      strategy: ValidationStrategy.EXIT_CODE,
      expectedCode: 2,
      command: 'custom command'
    };

    it('should pass when exit code matches expected non-zero code', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('', 2);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(2);
    });

    it('should fail when exit code does not match expected code', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('', 0);

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe(0);
      expect(result.expectedValue).toBe(2);
    });
  });

  describe('validate() - Exit Code Extraction', () => {
    const criteria: ExitCodeCriteria = {
      strategy: ValidationStrategy.EXIT_CODE,
      expectedCode: 0
    };

    it('should extract from "exit code: X" pattern', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('Process finished with exit code: 0');

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(0);
    });

    it('should extract from "returned: X" pattern', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('Command returned: 1');

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe(1);
    });

    it('should extract from "status: X" pattern', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('Exit status: 0');

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(0);
    });

    it('should extract from plain number', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('0');

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(0);
    });

    it('should be case insensitive for patterns', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('EXIT CODE: 0');

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(0);
    });

    it('should fail when no exit code found in output', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('No exit code here');

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBeUndefined();
      expect(result.message).toContain('Failed to extract exit code');
    });

    it('should prefer provided value over extraction', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('exit code: 1', 0);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(0); // Uses provided value, not extracted
    });
  });

  describe('generateFeedback()', () => {
    const criteria: ExitCodeCriteria = {
      strategy: ValidationStrategy.EXIT_CODE,
      expectedCode: 0,
      command: 'npm build'
    };

    it('should generate success feedback when validation passed', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('', 0);
      const feedback = validator.generateFeedback(result);

      expect(feedback).toContain('Command executed successfully');
      expect(feedback).toContain('exit code = 0');
    });

    it('should generate failure feedback with command name', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('', 1);
      const feedback = validator.generateFeedback(result);

      expect(feedback).toContain('Execution failed');
      expect(feedback).toContain('exit code = 1');
      expect(feedback).toContain('expected 0');
      expect(feedback).toContain('npm build');
      expect(feedback).toContain('review error logs');
    });

    it('should use "command" when command name is not provided', () => {
      const criteriaNoCommand: ExitCodeCriteria = {
        strategy: ValidationStrategy.EXIT_CODE,
        expectedCode: 0
      };

      const validator = new ExitCodeValidator(criteriaNoCommand);
      const result = validator.validate('', 1);
      const feedback = validator.generateFeedback(result);

      expect(feedback).toContain('The command returned an error');
    });
  });

  describe('Edge Cases', () => {
    const criteria: ExitCodeCriteria = {
      strategy: ValidationStrategy.EXIT_CODE,
      expectedCode: 0
    };

    it('should handle multiple digit exit codes', () => {
      const criteriaHighCode: ExitCodeCriteria = {
        strategy: ValidationStrategy.EXIT_CODE,
        expectedCode: 127
      };

      const validator = new ExitCodeValidator(criteriaHighCode);
      const result = validator.validate('', 127);

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(127);
    });

    it('should handle exit code extraction with extra whitespace', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('exit   code:   0');

      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(0);
    });

    it('should handle negative exit codes', () => {
      const validator = new ExitCodeValidator(criteria);
      // Note: extractExitCode doesn't handle negative numbers based on regex
      // This is just testing the comparison when value is provided
      const result = validator.validate('', -1);

      expect(result.passed).toBe(false);
      expect(result.actualValue).toBe(-1);
    });
  });

  describe('ValidationResult Structure', () => {
    const criteria: ExitCodeCriteria = {
      strategy: ValidationStrategy.EXIT_CODE,
      expectedCode: 0,
      command: 'test command'
    };

    it('should return result with all required fields', () => {
      const validator = new ExitCodeValidator(criteria);
      const result = validator.validate('', 0);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('actualValue');
      expect(result).toHaveProperty('expectedValue');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });
});
