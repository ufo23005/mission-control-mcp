/**
 * Unit Tests for StateManager
 * Tests state management and persistence
 */

import { promises as fs } from 'fs';
import path from 'path';
import { StateManager } from '../StateManager';
import { Mission, MissionState } from '../../types/mission';
import {
  ValidationStrategy,
  NumericOperator,
  NumericCriteria,
  ExitCodeCriteria
} from '../../types/validation';
import {
  MissionNotFoundError,
  MissionExistsError,
  StatePersistenceError
} from '../../utils/errors';

describe('StateManager', () => {
  let stateManager: StateManager;
  const TEST_STATE_DIR = path.join(process.cwd(), '.test-state');

  // Helper to create a test mission
  const createTestMission = (id: string, state: MissionState = MissionState.PENDING): Mission => {
    const criteria: NumericCriteria = {
      strategy: ValidationStrategy.NUMERIC,
      operator: NumericOperator.GREATER_THAN,
      threshold: 100
    };

    return {
      config: {
        id,
        goal: `Test mission ${id}`,
        criteria,
        maxAttempts: 10,
        enableCheckpoints: false,
        checkpointFrequency: 5
      },
      state,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      attempts: [],
      currentAttempt: 0
    };
  };

  beforeEach(async () => {
    // Create StateManager without persistence for most tests
    stateManager = await StateManager.create({
      stateDir: TEST_STATE_DIR,
      enablePersistence: false,
      completedRetentionDays: 30,
      failedRetentionDays: 90
    });
  });

  afterEach(async () => {
    if (stateManager) {
      stateManager.close();
    }

    // Clean up test state directory if it exists
    try {
      await fs.rm(TEST_STATE_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  describe('Mission CRUD - Add', () => {
    it('should add a new mission', () => {
      const mission = createTestMission('test-1');

      stateManager.addMission(mission);

      const retrieved = stateManager.getMission('test-1');
      expect(retrieved).toEqual(mission);
    });

    it('should throw error when adding duplicate mission', () => {
      const mission = createTestMission('test-1');

      stateManager.addMission(mission);

      expect(() => {
        stateManager.addMission(mission);
      }).toThrow(MissionExistsError);
    });

    it('should allow adding multiple missions with different IDs', () => {
      const mission1 = createTestMission('test-1');
      const mission2 = createTestMission('test-2');

      stateManager.addMission(mission1);
      stateManager.addMission(mission2);

      expect(stateManager.getMission('test-1')).toEqual(mission1);
      expect(stateManager.getMission('test-2')).toEqual(mission2);
    });
  });

  describe('Mission CRUD - Get', () => {
    it('should get mission by ID', () => {
      const mission = createTestMission('test-1');
      stateManager.addMission(mission);

      const retrieved = stateManager.getMission('test-1');

      expect(retrieved).toEqual(mission);
      expect(retrieved.config.id).toBe('test-1');
    });

    it('should throw error when getting non-existent mission', () => {
      expect(() => {
        stateManager.getMission('non-existent');
      }).toThrow(MissionNotFoundError);
    });

    it('should get all missions', () => {
      const mission1 = createTestMission('test-1');
      const mission2 = createTestMission('test-2');
      const mission3 = createTestMission('test-3');

      stateManager.addMission(mission1);
      stateManager.addMission(mission2);
      stateManager.addMission(mission3);

      const all = stateManager.getAllMissions();

      expect(all.length).toBe(3);
      expect(all).toContainEqual(mission1);
      expect(all).toContainEqual(mission2);
      expect(all).toContainEqual(mission3);
    });

    it('should return empty array when no missions exist', () => {
      const all = stateManager.getAllMissions();

      expect(all).toEqual([]);
      expect(Array.isArray(all)).toBe(true);
    });
  });

  describe('Mission CRUD - Update', () => {
    it('should update existing mission', () => {
      const mission = createTestMission('test-1');
      stateManager.addMission(mission);

      const updated = { ...mission, state: MissionState.IN_PROGRESS };
      stateManager.updateMission(updated);

      const retrieved = stateManager.getMission('test-1');
      expect(retrieved.state).toBe(MissionState.IN_PROGRESS);
    });

    it('should update mission updatedAt timestamp', () => {
      const mission = createTestMission('test-1');
      const originalUpdatedAt = mission.updatedAt;
      stateManager.addMission(mission);

      // Wait a tiny bit to ensure time difference
      const updated = { ...mission, state: MissionState.IN_PROGRESS };
      stateManager.updateMission(updated);

      const retrieved = stateManager.getMission('test-1');
      expect(retrieved.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should throw error when updating non-existent mission', () => {
      const mission = createTestMission('non-existent');

      expect(() => {
        stateManager.updateMission(mission);
      }).toThrow(MissionNotFoundError);
    });
  });

  describe('Mission CRUD - Delete', () => {
    it('should delete existing mission', () => {
      const mission = createTestMission('test-1');
      stateManager.addMission(mission);

      stateManager.deleteMission('test-1');

      expect(() => {
        stateManager.getMission('test-1');
      }).toThrow(MissionNotFoundError);
    });

    it('should throw error when deleting non-existent mission', () => {
      expect(() => {
        stateManager.deleteMission('non-existent');
      }).toThrow(MissionNotFoundError);
    });

    it('should allow re-adding mission after deletion', () => {
      const mission = createTestMission('test-1');
      stateManager.addMission(mission);
      stateManager.deleteMission('test-1');

      stateManager.addMission(mission);

      expect(stateManager.getMission('test-1')).toEqual(mission);
    });
  });

  describe('Mission Queries', () => {
    beforeEach(() => {
      stateManager.addMission(createTestMission('pending-1', MissionState.PENDING));
      stateManager.addMission(createTestMission('pending-2', MissionState.PENDING));
      stateManager.addMission(createTestMission('progress-1', MissionState.IN_PROGRESS));
      stateManager.addMission(createTestMission('progress-2', MissionState.IN_PROGRESS));
      stateManager.addMission(createTestMission('progress-3', MissionState.IN_PROGRESS));
      stateManager.addMission(createTestMission('completed-1', MissionState.COMPLETED));
      stateManager.addMission(createTestMission('failed-1', MissionState.FAILED));
    });

    it('should get missions by PENDING state', () => {
      const pending = stateManager.getMissionsByState(MissionState.PENDING);

      expect(pending.length).toBe(2);
      expect(pending.every(m => m.state === MissionState.PENDING)).toBe(true);
    });

    it('should get missions by IN_PROGRESS state', () => {
      const inProgress = stateManager.getMissionsByState(MissionState.IN_PROGRESS);

      expect(inProgress.length).toBe(3);
      expect(inProgress.every(m => m.state === MissionState.IN_PROGRESS)).toBe(true);
    });

    it('should get missions by COMPLETED state', () => {
      const completed = stateManager.getMissionsByState(MissionState.COMPLETED);

      expect(completed.length).toBe(1);
      expect(completed[0].state).toBe(MissionState.COMPLETED);
    });

    it('should get missions by FAILED state', () => {
      const failed = stateManager.getMissionsByState(MissionState.FAILED);

      expect(failed.length).toBe(1);
      expect(failed[0].state).toBe(MissionState.FAILED);
    });

    it('should return empty array for state with no missions', () => {
      // ABORTED state has no missions
      const aborted = stateManager.getMissionsByState(MissionState.ABORTED);

      expect(aborted).toEqual([]);
    });

    it('should get active missions count', () => {
      const count = stateManager.getActiveMissionsCount();

      expect(count).toBe(3); // 3 IN_PROGRESS missions
    });

    it('should return 0 active missions when none exist', async () => {
      const emptyManager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: false,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const count = emptyManager.getActiveMissionsCount();

      expect(count).toBe(0);
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup old completed missions', () => {
      const oldCompleted = createTestMission('old-completed', MissionState.COMPLETED);
      oldCompleted.completedAt = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      stateManager.addMission(oldCompleted);

      const recentCompleted = createTestMission('recent-completed', MissionState.COMPLETED);
      recentCompleted.completedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      stateManager.addMission(recentCompleted);

      const deleted = stateManager.cleanupOldMissions();

      expect(deleted).toBe(1);
      expect(() => stateManager.getMission('old-completed')).toThrow(MissionNotFoundError);
      expect(stateManager.getMission('recent-completed')).toBeDefined();
    });

    it('should cleanup old failed missions', () => {
      const oldFailed = createTestMission('old-failed', MissionState.FAILED);
      oldFailed.completedAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      stateManager.addMission(oldFailed);

      const recentFailed = createTestMission('recent-failed', MissionState.FAILED);
      recentFailed.completedAt = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000); // 50 days ago
      stateManager.addMission(recentFailed);

      const deleted = stateManager.cleanupOldMissions();

      expect(deleted).toBe(1);
      expect(() => stateManager.getMission('old-failed')).toThrow(MissionNotFoundError);
      expect(stateManager.getMission('recent-failed')).toBeDefined();
    });

    it('should not cleanup missions without completedAt', () => {
      const completed = createTestMission('no-date', MissionState.COMPLETED);
      completed.completedAt = undefined;
      stateManager.addMission(completed);

      const deleted = stateManager.cleanupOldMissions();

      expect(deleted).toBe(0);
      expect(stateManager.getMission('no-date')).toBeDefined();
    });

    it('should not cleanup pending or in-progress missions', () => {
      const pending = createTestMission('pending', MissionState.PENDING);
      pending.completedAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      stateManager.addMission(pending);

      const inProgress = createTestMission('progress', MissionState.IN_PROGRESS);
      inProgress.completedAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      stateManager.addMission(inProgress);

      const deleted = stateManager.cleanupOldMissions();

      expect(deleted).toBe(0);
      expect(stateManager.getMission('pending')).toBeDefined();
      expect(stateManager.getMission('progress')).toBeDefined();
    });

    it('should return 0 when no missions need cleanup', () => {
      const recent = createTestMission('recent', MissionState.COMPLETED);
      recent.completedAt = new Date();
      stateManager.addMission(recent);

      const deleted = stateManager.cleanupOldMissions();

      expect(deleted).toBe(0);
    });
  });

  describe('State Access', () => {
    it('should get orchestrator state', () => {
      const state = stateManager.getState();

      expect(state).toBeDefined();
      expect(state.missions).toBeInstanceOf(Map);
      expect(state.checkpoints).toBeInstanceOf(Map);
      expect(state.config).toBeDefined();
    });

    it('should reflect current missions in state', () => {
      const mission = createTestMission('test-1');
      stateManager.addMission(mission);

      const state = stateManager.getState();

      expect(state.missions.size).toBe(1);
      expect(state.missions.get('test-1')).toEqual(mission);
    });
  });

  describe('Initialization', () => {
    it('should create StateManager with default config', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: false,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      expect(manager).toBeInstanceOf(StateManager);
      expect(manager.getAllMissions()).toEqual([]);
    });

    it('should create StateManager with custom retention days', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: false,
        completedRetentionDays: 7,
        failedRetentionDays: 14
      });

      const state = manager.getState();
      expect(state.config.completedRetentionDays).toBe(7);
      expect(state.config.failedRetentionDays).toBe(14);
    });

    it('should accept logLevel configuration', async () => {
      const { LogLevel } = await import('../../utils/logger');

      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: false,
        logLevel: LogLevel.ERROR,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const state = manager.getState();
      expect(state.config.logLevel).toBe(LogLevel.ERROR);
    });
  });

  describe('Persistence - Basic', () => {
    it('should throw error when forcing save without persistence', async () => {
      await expect(stateManager.forceSave()).rejects.toThrow(StatePersistenceError);
      await expect(stateManager.forceSave()).rejects.toThrow('Persistence is not enabled');
    });

    it('should create state directory when persistence enabled', async () => {
      await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const stats = await fs.stat(TEST_STATE_DIR);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should save and load state with persistence', async () => {
      const manager1 = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('persist-test');
      manager1.addMission(mission);
      await manager1.forceSave();

      // Create new manager instance and load
      const manager2 = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const loaded = manager2.getMission('persist-test');
      expect(loaded.config.id).toBe('persist-test');
      expect(loaded.config.goal).toBe(mission.config.goal);
    });

    it('should handle loading when no state file exists', async () => {
      const manager = await StateManager.create({
        stateDir: path.join(TEST_STATE_DIR, 'new-dir'),
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      expect(manager.getAllMissions()).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle mission with all optional fields', () => {
      const mission = createTestMission('full-mission');
      mission.completedAt = new Date();
      mission.success = true;
      mission.errorMessage = 'Test error';
      mission.attempts = [{
        attemptNumber: 1,
        timestamp: new Date(),
        output: 'test output',
        value: 100,
        validationResult: {
          passed: true,
          message: 'Success',
          actualValue: 100,
          expectedValue: 100,
          timestamp: new Date()
        },
        duration: 1000
      }];

      stateManager.addMission(mission);

      const retrieved = stateManager.getMission('full-mission');
      expect(retrieved.completedAt).toBeDefined();
      expect(retrieved.success).toBe(true);
      expect(retrieved.errorMessage).toBe('Test error');
      expect(retrieved.attempts.length).toBe(1);
    });

    it('should handle mission with exit code criteria', () => {
      const criteria: ExitCodeCriteria = {
        strategy: ValidationStrategy.EXIT_CODE,
        expectedCode: 0,
        command: 'npm test'
      };

      const mission: Mission = {
        config: {
          id: 'exit-code-test',
          goal: 'Tests should pass',
          criteria,
          maxAttempts: 5,
          enableCheckpoints: true,
          checkpointFrequency: 2
        },
        state: MissionState.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: [],
        currentAttempt: 0
      };

      stateManager.addMission(mission);

      const retrieved = stateManager.getMission('exit-code-test');
      expect(retrieved.config.criteria.strategy).toBe(ValidationStrategy.EXIT_CODE);
    });

    it('should handle multiple rapid updates', () => {
      const mission = createTestMission('rapid-update');
      stateManager.addMission(mission);

      for (let i = 0; i < 10; i++) {
        const updated = { ...mission, currentAttempt: i };
        stateManager.updateMission(updated);
      }

      const retrieved = stateManager.getMission('rapid-update');
      expect(retrieved.currentAttempt).toBe(9);
    });

    it('should handle getAllMissions with many missions', () => {
      for (let i = 0; i < 100; i++) {
        stateManager.addMission(createTestMission(`mission-${i}`));
      }

      const all = stateManager.getAllMissions();
      expect(all.length).toBe(100);
    });
  });
});
