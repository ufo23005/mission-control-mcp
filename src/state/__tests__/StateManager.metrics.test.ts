/**
 * Unit Tests for StateManager Performance Metrics
 * Tests persistence performance monitoring
 */

import { promises as fs } from 'fs';
import path from 'path';
import { StateManager } from '../StateManager';
import { Mission, MissionState } from '../../types/mission';
import { ValidationStrategy, NumericOperator, NumericCriteria } from '../../types/validation';

describe('StateManager - Performance Metrics', () => {
  const TEST_STATE_DIR = path.join(process.cwd(), '.test-metrics-state');

  // Helper to create a test mission
  const createTestMission = (id: string): Mission => {
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
      state: MissionState.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: [],
      currentAttempt: 0
    };
  };

  afterEach(async () => {
    // Clean up test state directory
    try {
      await fs.rm(TEST_STATE_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  describe('Initial Metrics', () => {
    it('should initialize metrics with zero counts', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: false,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const metrics = manager.getMetrics();

      expect(metrics.totalSaves).toBe(0);
      expect(metrics.totalLoads).toBe(0);
      expect(metrics.lastSaveDuration).toBeUndefined();
      expect(metrics.lastLoadDuration).toBeUndefined();
      expect(metrics.lastSerializationTime).toBeUndefined();
      expect(metrics.lastDeserializationTime).toBeUndefined();
      expect(metrics.stateFileSize).toBeUndefined();
    });

    it('should return metrics copy not reference', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: false,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const metrics1 = manager.getMetrics();
      const metrics2 = manager.getMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('Save Metrics', () => {
    it('should collect save duration on forceSave', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('test-1');
      manager.addMission(mission);
      await manager.forceSave();

      const metrics = manager.getMetrics();

      expect(metrics.totalSaves).toBe(1);
      expect(metrics.lastSaveDuration).toBeDefined();
      expect(metrics.lastSaveDuration).toBeGreaterThan(0);
      expect(typeof metrics.lastSaveDuration).toBe('number');
    });

    it('should collect serialization time on save', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('test-1');
      manager.addMission(mission);
      await manager.forceSave();

      const metrics = manager.getMetrics();

      expect(metrics.lastSerializationTime).toBeDefined();
      expect(metrics.lastSerializationTime).toBeGreaterThanOrEqual(0);
    });

    it('should collect state file size on save', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('test-1');
      manager.addMission(mission);
      await manager.forceSave();

      const metrics = manager.getMetrics();

      expect(metrics.stateFileSize).toBeDefined();
      expect(metrics.stateFileSize).toBeGreaterThan(0);
    });

    it('should increment totalSaves on each save', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('test-1');
      manager.addMission(mission);

      await manager.forceSave();
      expect(manager.getMetrics().totalSaves).toBe(1);

      await manager.forceSave();
      expect(manager.getMetrics().totalSaves).toBe(2);

      await manager.forceSave();
      expect(manager.getMetrics().totalSaves).toBe(3);
    });

    it('should calculate average save duration', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('test-1');
      manager.addMission(mission);

      await manager.forceSave();
      const metrics1 = manager.getMetrics();
      expect(metrics1.averageSaveDuration).toBeDefined();
      expect(metrics1.averageSaveDuration).toBe(metrics1.lastSaveDuration);

      await manager.forceSave();
      const metrics2 = manager.getMetrics();
      expect(metrics2.averageSaveDuration).toBeDefined();
      expect(metrics2.averageSaveDuration).toBeGreaterThan(0);
    });
  });

  describe('Load Metrics', () => {
    it('should collect load duration on state load', async () => {
      // First create and save a state
      const manager1 = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('test-1');
      manager1.addMission(mission);
      await manager1.forceSave();

      // Create new manager and load state
      const manager2 = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const metrics = manager2.getMetrics();

      expect(metrics.totalLoads).toBe(1);
      expect(metrics.lastLoadDuration).toBeDefined();
      expect(metrics.lastLoadDuration).toBeGreaterThan(0);
    });

    it('should collect deserialization time on load', async () => {
      // First create and save a state
      const manager1 = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('test-1');
      manager1.addMission(mission);
      await manager1.forceSave();

      // Create new manager and load state
      const manager2 = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const metrics = manager2.getMetrics();

      expect(metrics.lastDeserializationTime).toBeDefined();
      expect(metrics.lastDeserializationTime).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average load duration', async () => {
      // First create and save a state
      const manager1 = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('test-1');
      manager1.addMission(mission);
      await manager1.forceSave();

      // Create new manager and load state
      const manager2 = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const metrics = manager2.getMetrics();

      expect(metrics.averageLoadDuration).toBeDefined();
      expect(metrics.averageLoadDuration).toBe(metrics.lastLoadDuration);
    });
  });

  describe('Performance with Different Data Sizes', () => {
    it('should handle metrics for small state', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('small-1');
      manager.addMission(mission);
      await manager.forceSave();

      const metrics = manager.getMetrics();

      expect(metrics.stateFileSize).toBeGreaterThan(0);
      expect(metrics.stateFileSize).toBeLessThan(10000); // Should be small
    });

    it('should handle metrics for larger state', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      // Add multiple missions
      for (let i = 0; i < 10; i++) {
        manager.addMission(createTestMission(`large-${i}`));
      }

      await manager.forceSave();

      const metrics = manager.getMetrics();

      expect(metrics.stateFileSize).toBeGreaterThan(1000);
      expect(metrics.lastSerializationTime).toBeGreaterThan(0);
    });
  });

  describe('Metrics Without Persistence', () => {
    it('should not collect metrics when persistence disabled', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: false,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('test-1');
      manager.addMission(mission);

      const metrics = manager.getMetrics();

      expect(metrics.totalSaves).toBe(0);
      expect(metrics.totalLoads).toBe(0);
      expect(metrics.lastSaveDuration).toBeUndefined();
      expect(metrics.lastLoadDuration).toBeUndefined();
    });
  });

  describe('Metrics Structure', () => {
    it('should return all expected metric fields', async () => {
      const manager = await StateManager.create({
        stateDir: TEST_STATE_DIR,
        enablePersistence: true,
        completedRetentionDays: 30,
        failedRetentionDays: 90
      });

      const mission = createTestMission('test-1');
      manager.addMission(mission);
      await manager.forceSave();

      const metrics = manager.getMetrics();

      expect(metrics).toHaveProperty('totalSaves');
      expect(metrics).toHaveProperty('totalLoads');
      expect(metrics).toHaveProperty('lastSaveDuration');
      expect(metrics).toHaveProperty('lastLoadDuration');
      expect(metrics).toHaveProperty('lastSerializationTime');
      expect(metrics).toHaveProperty('lastDeserializationTime');
      expect(metrics).toHaveProperty('stateFileSize');
      expect(metrics).toHaveProperty('averageSaveDuration');
      expect(metrics).toHaveProperty('averageLoadDuration');
    });
  });
});
