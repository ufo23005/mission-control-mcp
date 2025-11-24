/**
 * Unit Tests for MissionDefiner
 * Tests mission definition and validation
 */

import { MissionDefiner } from '../MissionDefiner';
import { MissionState } from '../../types/mission';
import {
  ValidationStrategy,
  NumericOperator,
  NumericCriteria,
  ExitCodeCriteria,
  KeywordCriteria
} from '../../types/validation';
import { InvalidCriteriaError } from '../../utils/errors';

describe('MissionDefiner', () => {
  let definer: MissionDefiner;

  beforeEach(() => {
    definer = new MissionDefiner();
  });

  describe('defineMission() - Basic Functionality', () => {
    it('should create mission with numeric criteria', () => {
      const criteria: NumericCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: 100,
        metricName: 'score'
      };

      const mission = definer.defineMission({
        goal: 'Achieve high score',
        criteria
      });

      expect(mission).toBeDefined();
      expect(mission.config.goal).toBe('Achieve high score');
      expect(mission.config.criteria).toEqual(criteria);
      expect(mission.config.id).toBeDefined();
      expect(typeof mission.config.id).toBe('string');
    });

    it('should create mission with exit code criteria', () => {
      const criteria: ExitCodeCriteria = {
        strategy: ValidationStrategy.EXIT_CODE,
        expectedCode: 0,
        command: 'npm test'
      };

      const mission = definer.defineMission({
        goal: 'Tests pass',
        criteria
      });

      expect(mission).toBeDefined();
      expect(mission.config.criteria).toEqual(criteria);
    });

    it('should create mission with keyword criteria', () => {
      const criteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'SUCCESS',
        mustContain: true
      };

      const mission = definer.defineMission({
        goal: 'See success message',
        criteria
      });

      expect(mission).toBeDefined();
      expect(mission.config.criteria).toEqual(criteria);
    });

    it('should generate unique IDs for each mission', () => {
      const criteria: NumericCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.EQUAL,
        threshold: 100
      };

      const mission1 = definer.defineMission({ goal: 'Test 1', criteria });
      const mission2 = definer.defineMission({ goal: 'Test 2', criteria });

      expect(mission1.config.id).not.toBe(mission2.config.id);
      expect(mission1.config.id.length).toBeGreaterThan(0);
      expect(mission2.config.id.length).toBeGreaterThan(0);
    });
  });

  describe('defineMission() - Default Values', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.GREATER_THAN,
      threshold: 100
    };

    it('should apply default maxAttempts of 10', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria
      });

      expect(mission.config.maxAttempts).toBe(10);
    });

    it('should apply default enableCheckpoints of false', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria
      });

      expect(mission.config.enableCheckpoints).toBe(false);
    });

    it('should apply default checkpointFrequency of 5', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria
      });

      expect(mission.config.checkpointFrequency).toBe(5);
    });

    it('should leave attemptTimeout undefined by default', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria
      });

      expect(mission.config.attemptTimeout).toBeUndefined();
    });
  });

  describe('defineMission() - Custom Values', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.GREATER_THAN,
      threshold: 100
    };

    it('should accept custom maxAttempts', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria,
        maxAttempts: 5
      });

      expect(mission.config.maxAttempts).toBe(5);
    });

    it('should accept custom enableCheckpoints', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria,
        enableCheckpoints: true
      });

      expect(mission.config.enableCheckpoints).toBe(true);
    });

    it('should accept custom checkpointFrequency', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria,
        checkpointFrequency: 3
      });

      expect(mission.config.checkpointFrequency).toBe(3);
    });

    it('should accept custom attemptTimeout', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria,
        attemptTimeout: 30000
      });

      expect(mission.config.attemptTimeout).toBe(30000);
    });

    it('should accept all custom values together', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria,
        maxAttempts: 20,
        enableCheckpoints: true,
        checkpointFrequency: 2,
        attemptTimeout: 60000
      });

      expect(mission.config.maxAttempts).toBe(20);
      expect(mission.config.enableCheckpoints).toBe(true);
      expect(mission.config.checkpointFrequency).toBe(2);
      expect(mission.config.attemptTimeout).toBe(60000);
    });
  });

  describe('defineMission() - Mission Structure', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.GREATER_THAN,
      threshold: 100
    };

    it('should initialize state as PENDING', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria
      });

      expect(mission.state).toBe(MissionState.PENDING);
    });

    it('should set createdAt timestamp', () => {
      const before = new Date();
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria
      });
      const after = new Date();

      expect(mission.createdAt).toBeInstanceOf(Date);
      expect(mission.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(mission.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should set updatedAt timestamp', () => {
      const before = new Date();
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria
      });
      const after = new Date();

      expect(mission.updatedAt).toBeInstanceOf(Date);
      expect(mission.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(mission.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should initialize empty attempts array', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria
      });

      expect(mission.attempts).toEqual([]);
      expect(Array.isArray(mission.attempts)).toBe(true);
    });

    it('should initialize currentAttempt to 0', () => {
      const mission = definer.defineMission({
        goal: 'Test goal',
        criteria
      });

      expect(mission.currentAttempt).toBe(0);
    });
  });

  describe('Criteria Validation - General', () => {
    it('should throw error when strategy is missing', () => {
      const invalidCriteria = {} as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow('Strategy must be specified');
    });

    it('should throw error for unknown strategy', () => {
      const invalidCriteria = {
        strategy: 'UNKNOWN_STRATEGY'
      } as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow('Unknown strategy');
    });
  });

  describe('Criteria Validation - NUMERIC', () => {
    it('should throw error when threshold is missing', () => {
      const invalidCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN
      } as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow('requires threshold');
    });

    it('should throw error when threshold is not a number', () => {
      const invalidCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: '100'
      } as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);
    });

    it('should throw error when operator is missing', () => {
      const invalidCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        threshold: 100
      } as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow('requires operator');
    });

    it('should accept valid NUMERIC criteria', () => {
      const validCriteria: NumericCriteria = {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: 100
      };

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: validCriteria
        });
      }).not.toThrow();
    });
  });

  describe('Criteria Validation - EXIT_CODE', () => {
    it('should throw error when expectedCode is missing', () => {
      const invalidCriteria = {
        strategy: ValidationStrategy.EXIT_CODE
      } as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow('requires expectedCode');
    });

    it('should throw error when expectedCode is not a number', () => {
      const invalidCriteria = {
        strategy: ValidationStrategy.EXIT_CODE,
        expectedCode: '0'
      } as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);
    });

    it('should accept valid EXIT_CODE criteria', () => {
      const validCriteria: ExitCodeCriteria = {
        strategy: ValidationStrategy.EXIT_CODE,
        expectedCode: 0
      };

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: validCriteria
        });
      }).not.toThrow();
    });

    it('should accept non-zero exit codes', () => {
      const validCriteria: ExitCodeCriteria = {
        strategy: ValidationStrategy.EXIT_CODE,
        expectedCode: 127
      };

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: validCriteria
        });
      }).not.toThrow();
    });
  });

  describe('Criteria Validation - KEYWORD', () => {
    it('should throw error when keyword is missing', () => {
      const invalidCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        mustContain: true
      } as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow('requires non-empty keyword');
    });

    it('should throw error when keyword is empty string', () => {
      const invalidCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: '',
        mustContain: true
      } as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow('non-empty keyword');
    });

    it('should throw error when keyword is not a string', () => {
      const invalidCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 123,
        mustContain: true
      } as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);
    });

    it('should throw error when mustContain is missing', () => {
      const invalidCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'SUCCESS'
      } as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow('requires mustContain');
    });

    it('should throw error when mustContain is not boolean', () => {
      const invalidCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'SUCCESS',
        mustContain: 'true'
      } as any;

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: invalidCriteria
        });
      }).toThrow(InvalidCriteriaError);
    });

    it('should accept valid KEYWORD criteria with mustContain: true', () => {
      const validCriteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'SUCCESS',
        mustContain: true
      };

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: validCriteria
        });
      }).not.toThrow();
    });

    it('should accept valid KEYWORD criteria with mustContain: false', () => {
      const validCriteria: KeywordCriteria = {
        strategy: ValidationStrategy.KEYWORD,
        keyword: 'ERROR',
        mustContain: false
      };

      expect(() => {
        definer.defineMission({
          goal: 'Test goal',
          criteria: validCriteria
        });
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.GREATER_THAN,
      threshold: 100
    };

    it('should accept empty goal string', () => {
      const mission = definer.defineMission({
        goal: '',
        criteria
      });

      expect(mission.config.goal).toBe('');
    });

    it('should accept very long goal string', () => {
      const longGoal = 'A'.repeat(10000);
      const mission = definer.defineMission({
        goal: longGoal,
        criteria
      });

      expect(mission.config.goal).toBe(longGoal);
      expect(mission.config.goal.length).toBe(10000);
    });

    it('should accept maxAttempts of 1', () => {
      const mission = definer.defineMission({
        goal: 'Test',
        criteria,
        maxAttempts: 1
      });

      expect(mission.config.maxAttempts).toBe(1);
    });

    it('should accept very large maxAttempts', () => {
      const mission = definer.defineMission({
        goal: 'Test',
        criteria,
        maxAttempts: 1000000
      });

      expect(mission.config.maxAttempts).toBe(1000000);
    });

    it('should accept checkpointFrequency of 1', () => {
      const mission = definer.defineMission({
        goal: 'Test',
        criteria,
        checkpointFrequency: 1
      });

      expect(mission.config.checkpointFrequency).toBe(1);
    });
  });
});
