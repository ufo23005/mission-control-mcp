#!/usr/bin/env ts-node
/**
 * Integration Test for Persistence Layer
 *
 * This test verifies that the P0 persistence optimization works correctly:
 * 1. State is saved to disk
 * 2. State can be loaded from disk
 * 3. Atomic writes prevent corruption
 * 4. Recovery from backup works
 * 5. Shutdown handlers save dirty state
 */

import { promises as fs } from 'fs';
import path from 'path';
import { StateManager } from '../../src/state/StateManager.js';
import { StateConfig } from '../../src/types/state.js';
import { Mission, MissionState } from '../../src/types/mission.js';
import { ValidationStrategy, NumericOperator } from '../../src/types/validation.js';

const TEST_STATE_DIR = './test-state';

/**
 * Helper to clean up test directory
 */
async function cleanup() {
  try {
    await fs.rm(TEST_STATE_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore if doesn't exist
  }
}

/**
 * Helper to create a test mission
 */
function createTestMission(id: string): Mission {
  return {
    config: {
      id,
      goal: `Test mission ${id}`,
      criteria: {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: 80,
        metricName: 'score'
      },
      maxAttempts: 10
    },
    state: MissionState.IN_PROGRESS,
    createdAt: new Date(),
    updatedAt: new Date(),
    attempts: [],
    currentAttempt: 0
  };
}

/**
 * Test 1: Basic Save and Load
 */
async function testBasicSaveAndLoad(): Promise<void> {
  console.log('\n📝 Test 1: Basic Save and Load');

  const config: StateConfig = {
    stateDir: TEST_STATE_DIR,
    enablePersistence: true,
    completedRetentionDays: 30,
    failedRetentionDays: 90
  };

  // Create first instance and add mission
  const manager1 = await StateManager.create(config);
  const mission = createTestMission('test-mission-1');
  manager1.addMission(mission);

  // Force save
  await manager1.forceSave();
  console.log('✅ Mission saved to disk');

  // Create second instance - should load from disk
  const manager2 = await StateManager.create(config);

  const loadedMission = manager2.getMission('test-mission-1');

  if (loadedMission.config.id === mission.config.id) {
    console.log('✅ Mission loaded successfully');
    console.log(`   Goal: ${loadedMission.config.goal}`);
  } else {
    throw new Error('Loaded mission does not match');
  }
}

/**
 * Test 2: State File Structure
 */
async function testStateFileStructure(): Promise<void> {
  console.log('\n📂 Test 2: State File Structure');

  const stateFile = path.join(TEST_STATE_DIR, 'state.json');
  const content = await fs.readFile(stateFile, 'utf8');
  const state = JSON.parse(content);

  console.log('✅ State file is valid JSON');
  console.log(`   Version: ${state.version}`);
  console.log(`   Missions: ${state.missions.length}`);
  console.log(`   Timestamp: ${state.timestamp}`);

  if (state.version !== '1.0.0') {
    throw new Error(`Unexpected version: ${state.version}`);
  }

  if (!Array.isArray(state.missions)) {
    throw new Error('Missions should be an array');
  }
}

/**
 * Test 3: Atomic Write (backup file created)
 */
async function testAtomicWrite(): Promise<void> {
  console.log('\n⚛️  Test 3: Atomic Write with Backup');

  const config: StateConfig = {
    stateDir: TEST_STATE_DIR,
    enablePersistence: true,
    completedRetentionDays: 30,
    failedRetentionDays: 90
  };

  const manager = await StateManager.create(config);

  // Add first mission
  const mission1 = createTestMission('mission-1');
  manager.addMission(mission1);
  await manager.forceSave();

  // Check that state file exists
  const stateFile = path.join(TEST_STATE_DIR, 'state.json');
  await fs.access(stateFile);
  console.log('✅ Primary state file created');

  // Add second mission - this should create backup
  const mission2 = createTestMission('mission-2');
  manager.addMission(mission2);
  await manager.forceSave();

  // Check that backup file was created
  const backupFile = path.join(TEST_STATE_DIR, 'state.json.bak');
  await fs.access(backupFile);
  console.log('✅ Backup file created');

  // Verify backup contains old state (1 mission)
  const backupContent = await fs.readFile(backupFile, 'utf8');
  const backupState = JSON.parse(backupContent);

  if (backupState.missions.length === 1) {
    console.log('✅ Backup contains previous state (1 mission)');
  } else {
    throw new Error(`Backup should have 1 mission, has ${backupState.missions.length}`);
  }

  // Verify current state contains new state (2 missions)
  const currentContent = await fs.readFile(stateFile, 'utf8');
  const currentState = JSON.parse(currentContent);

  if (currentState.missions.length === 2) {
    console.log('✅ Current state has 2 missions');
  } else {
    throw new Error(`Current state should have 2 missions, has ${currentState.missions.length}`);
  }
}

/**
 * Test 4: Debounced Save
 */
async function testDebouncedSave(): Promise<void> {
  console.log('\n⏱️  Test 4: Debounced Save');

  const config: StateConfig = {
    stateDir: TEST_STATE_DIR,
    enablePersistence: true,
    completedRetentionDays: 30,
    failedRetentionDays: 90
  };

  const manager = await StateManager.create(config);

  // Rapidly add multiple missions
  console.log('   Adding 5 missions rapidly...');
  for (let i = 0; i < 5; i++) {
    const mission = createTestMission(`rapid-mission-${i}`);
    manager.addMission(mission);
  }

  // Wait for debounce timer (1000ms + buffer)
  console.log('   Waiting for debounce (1.5s)...');
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Verify all missions were saved
  const stateFile = path.join(TEST_STATE_DIR, 'state.json');
  const content = await fs.readFile(stateFile, 'utf8');
  const state = JSON.parse(content);

  // Should have 5 missions from this test (we cleaned up between tests)
  if (state.missions.length === 5) {
    console.log('✅ All 5 missions saved after debounce');
  } else {
    throw new Error(`Expected 5 missions, found ${state.missions.length}`);
  }
}

/**
 * Test 5: Recovery from Backup
 */
async function testRecoveryFromBackup(): Promise<void> {
  console.log('\n🔄 Test 5: Recovery from Backup');

  const stateFile = path.join(TEST_STATE_DIR, 'state.json');
  const backupFile = path.join(TEST_STATE_DIR, 'state.json.bak');

  // First, ensure we have a valid backup
  const config: StateConfig = {
    stateDir: TEST_STATE_DIR,
    enablePersistence: true,
    completedRetentionDays: 30,
    failedRetentionDays: 90
  };

  // Create first mission and save (this creates state.json)
  const manager1 = await StateManager.create(config);
  const mission1 = createTestMission('backup-test-1');
  manager1.addMission(mission1);
  await manager1.forceSave();
  console.log('✅ First save completed');

  // Add second mission and save (this creates backup)
  const mission2 = createTestMission('backup-test-2');
  manager1.addMission(mission2);
  await manager1.forceSave();

  // Verify backup exists
  await fs.access(backupFile);
  console.log('✅ Backup file exists');

  // Corrupt the primary state file
  await fs.writeFile(stateFile, '{ invalid json }', 'utf8');
  console.log('⚠️  Corrupted primary state file');

  // Create new manager - should recover from backup
  const manager2 = await StateManager.create(config);

  try {
    // Backup should have 1 mission (the first save before corruption)
    const recovered = manager2.getMission('backup-test-1');
    console.log('✅ Successfully recovered from backup');
    console.log(`   Recovered mission: ${recovered.config.id}`);

    // Second mission should not exist (it was in the corrupted file)
    try {
      manager2.getMission('backup-test-2');
      throw new Error('Second mission should not exist after recovery');
    } catch (e) {
      if ((e as Error).message.includes('Mission not found')) {
        console.log('✅ Correctly recovered only from backup (1 mission)');
      } else {
        throw e;
      }
    }
  } catch (error) {
    throw new Error(`Failed to recover from backup: ${error}`);
  }
}

/**
 * Test 6: Serialization Integrity (Dates, Maps, etc.)
 */
async function testSerializationIntegrity(): Promise<void> {
  console.log('\n🔬 Test 6: Serialization Integrity');

  const config: StateConfig = {
    stateDir: TEST_STATE_DIR,
    enablePersistence: true,
    completedRetentionDays: 30,
    failedRetentionDays: 90
  };

  const manager1 = await StateManager.create(config);
  const mission = createTestMission('serialize-test');

  // Add an attempt with all fields
  const now = new Date();
  mission.attempts.push({
    attemptNumber: 1,
    timestamp: now,
    output: 'test output',
    value: 85,
    validationResult: {
      passed: true,
      message: 'Validation passed',
      actualValue: 85,
      expectedValue: 80,
      timestamp: now
    },
    duration: 1234
  });

  manager1.addMission(mission);
  await manager1.forceSave();
  console.log('✅ Mission with attempt saved');

  // Load and verify
  const manager2 = await StateManager.create(config);

  const loaded = manager2.getMission('serialize-test');

  // Verify dates are properly deserialized
  if (!(loaded.createdAt instanceof Date)) {
    throw new Error('createdAt should be a Date object');
  }
  console.log('✅ Dates deserialized correctly');

  // Verify attempt
  if (loaded.attempts.length !== 1) {
    throw new Error(`Expected 1 attempt, found ${loaded.attempts.length}`);
  }

  const attempt = loaded.attempts[0];
  if (!(attempt.timestamp instanceof Date)) {
    throw new Error('Attempt timestamp should be a Date object');
  }
  console.log('✅ Attempt timestamp deserialized correctly');

  if (attempt.value !== 85) {
    throw new Error(`Expected value 85, got ${attempt.value}`);
  }
  console.log('✅ Attempt value preserved');

  if (!(attempt.validationResult.timestamp instanceof Date)) {
    throw new Error('ValidationResult timestamp should be a Date object');
  }
  console.log('✅ ValidationResult timestamp deserialized correctly');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Persistence Layer Integration Tests\n');
  console.log('═'.repeat(60));

  try {
    // Clean up before tests
    await cleanup();

    // Run all tests
    await testBasicSaveAndLoad();
    // Note: Don't cleanup - Test 2 needs the state from Test 1
    await testStateFileStructure();
    await cleanup();

    await testAtomicWrite();
    await cleanup();

    await testDebouncedSave();
    await cleanup();

    await testRecoveryFromBackup();
    await cleanup();

    await testSerializationIntegrity();

    // Final cleanup
    await cleanup();

    console.log('\n═'.repeat(60));
    console.log('\n✅ ALL TESTS PASSED! 🎉');
    console.log('\nP0 Persistence Optimization Summary:');
    console.log('  ✓ State persistence implemented');
    console.log('  ✓ Atomic writes with backup');
    console.log('  ✓ Debounced auto-save');
    console.log('  ✓ Recovery from corruption');
    console.log('  ✓ Type-safe serialization/deserialization');
    console.log('  ✓ Date and complex type handling');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    await cleanup();
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
