#!/usr/bin/env ts-node
/**
 * Comprehensive System Test
 *
 * Tests all major functionality of the Mission Control MCP system:
 * 1. Mission Definition (all strategies)
 * 2. Attempt Submission & Validation
 * 3. State Persistence & Recovery
 * 4. Error Handling
 * 5. Feedback Generation
 */

import { StateManager } from '../../src/state/StateManager.js';
import { DefineMissionTool } from '../../src/tools/defineMission.js';
import { SubmitAttemptTool } from '../../src/tools/submitAttempt.js';
import { ValidationStrategy, NumericOperator } from '../../src/types/validation.js';
import { MissionState } from '../../src/types/mission.js';
import path from 'path';
import fs from 'fs';

const TEST_STATE_DIR = path.join(process.cwd(), '.test-state-comprehensive');

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

function recordResult(name: string, passed: boolean, error?: string, duration?: number) {
  results.push({ name, passed, error, duration });
  const icon = passed ? '✅' : '❌';
  const durationStr = duration ? ` (${duration}ms)` : '';
  console.log(`${icon} ${name}${durationStr}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
}

// Clean up test directory
function cleanupTestDir() {
  if (fs.existsSync(TEST_STATE_DIR)) {
    fs.rmSync(TEST_STATE_DIR, { recursive: true, force: true });
  }
}

// Test 1: Numeric Validation Strategy
async function testNumericValidation() {
  console.log('\n📊 Test 1: Numeric Validation Strategy');
  console.log('='.repeat(60));

  try {
    const config = {
      stateDir: TEST_STATE_DIR,
      enablePersistence: false,
      completedRetentionDays: 30,
      failedRetentionDays: 90
    };

    const stateManager = await StateManager.create(config);
    const defineTool = new DefineMissionTool(stateManager);
    const submitTool = new SubmitAttemptTool(stateManager);

    // Define mission with NUMERIC strategy
    const defineResult = await defineTool.execute({
      goal: 'Achieve score greater than 100',
      strategy: 'NUMERIC',
      criteria: {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: 100,
        metricName: 'score'
      },
      maxAttempts: 5
    });

    const defineData = JSON.parse(defineResult);
    recordResult('1.1: Define NUMERIC mission', defineData.success === true);

    const missionId = defineData.missionId;

    // Test failed attempt
    const failResult = await submitTool.execute({
      missionId,
      output: 'Attempt 1',
      value: 50
    });

    const failData = JSON.parse(failResult);
    recordResult('1.2: Submit failed attempt (50 < 100)',
      failData.success === true && failData.passed === false);

    // Test successful attempt
    const passResult = await submitTool.execute({
      missionId,
      output: 'Attempt 2',
      value: 150
    });

    const passData = JSON.parse(passResult);
    recordResult('1.3: Submit successful attempt (150 > 100)',
      passData.success === true && passData.passed === true && passData.final === true);

    // Verify mission completed
    const mission = stateManager.getMission(missionId);
    recordResult('1.4: Mission state is COMPLETED', mission.state === MissionState.COMPLETED);
    recordResult('1.5: Mission success flag is true', mission.success === true);

  } catch (error) {
    recordResult('1.x: Numeric Validation Test', false, error instanceof Error ? error.message : String(error));
  }
}

// Test 2: Exit Code Validation Strategy
async function testExitCodeValidation() {
  console.log('\n🔧 Test 2: Exit Code Validation Strategy');
  console.log('='.repeat(60));

  try {
    const config = {
      stateDir: TEST_STATE_DIR,
      enablePersistence: false,
      completedRetentionDays: 30,
      failedRetentionDays: 90
    };

    const stateManager = await StateManager.create(config);
    const defineTool = new DefineMissionTool(stateManager);
    const submitTool = new SubmitAttemptTool(stateManager);

    // Define mission with EXIT_CODE strategy
    const defineResult = await defineTool.execute({
      goal: 'Execute command successfully',
      strategy: 'EXIT_CODE',
      criteria: {
        expectedCode: 0
      },
      maxAttempts: 3
    });

    const defineData = JSON.parse(defineResult);
    recordResult('2.1: Define EXIT_CODE mission', defineData.success === true);

    const missionId = defineData.missionId;

    // Test failed attempt (non-zero exit code)
    const failResult = await submitTool.execute({
      missionId,
      output: 'Command failed',
      value: 1
    });

    const failData = JSON.parse(failResult);
    recordResult('2.2: Submit failed attempt (exit code 1)',
      failData.success === true && failData.passed === false);

    // Test successful attempt (exit code 0)
    const passResult = await submitTool.execute({
      missionId,
      output: 'Command succeeded',
      value: 0
    });

    const passData = JSON.parse(passResult);
    recordResult('2.3: Submit successful attempt (exit code 0)',
      passData.success === true && passData.passed === true);

  } catch (error) {
    recordResult('2.x: Exit Code Validation Test', false, error instanceof Error ? error.message : String(error));
  }
}

// Test 3: Keyword Validation Strategy
async function testKeywordValidation() {
  console.log('\n🔍 Test 3: Keyword Validation Strategy');
  console.log('='.repeat(60));

  try {
    const config = {
      stateDir: TEST_STATE_DIR,
      enablePersistence: false,
      completedRetentionDays: 30,
      failedRetentionDays: 90
    };

    const stateManager = await StateManager.create(config);
    const defineTool = new DefineMissionTool(stateManager);
    const submitTool = new SubmitAttemptTool(stateManager);

    // Define mission with KEYWORD strategy
    const defineResult = await defineTool.execute({
      goal: 'Output contains success keyword',
      strategy: 'KEYWORD',
      criteria: {
        keyword: 'SUCCESS',
        mustContain: true,
        caseSensitive: false
      },
      maxAttempts: 3
    });

    const defineData = JSON.parse(defineResult);
    recordResult('3.1: Define KEYWORD mission', defineData.success === true);

    const missionId = defineData.missionId;

    // Test failed attempt (no keywords)
    const failResult = await submitTool.execute({
      missionId,
      output: 'Task is still running...',
    });

    const failData = JSON.parse(failResult);
    recordResult('3.2: Submit failed attempt (no keywords)',
      failData.success === true && failData.passed === false);

    // Test successful attempt (contains keyword)
    const passResult = await submitTool.execute({
      missionId,
      output: 'Build completed successfully!',
    });

    const passData = JSON.parse(passResult);
    recordResult('3.3: Submit successful attempt (contains "successfully")',
      passData.success === true && passData.passed === true);

  } catch (error) {
    recordResult('3.x: Keyword Validation Test', false, error instanceof Error ? error.message : String(error));
  }
}

// Test 4: Max Attempts and Failure
async function testMaxAttemptsFailure() {
  console.log('\n⚠️  Test 4: Max Attempts and Failure Handling');
  console.log('='.repeat(60));

  try {
    const config = {
      stateDir: TEST_STATE_DIR,
      enablePersistence: false,
      completedRetentionDays: 30,
      failedRetentionDays: 90
    };

    const stateManager = await StateManager.create(config);
    const defineTool = new DefineMissionTool(stateManager);
    const submitTool = new SubmitAttemptTool(stateManager);

    // Define mission with very low max attempts
    const defineResult = await defineTool.execute({
      goal: 'Test max attempts',
      strategy: 'NUMERIC',
      criteria: {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.EQUAL,
        threshold: 999,
        metricName: 'value'
      },
      maxAttempts: 3
    });

    const defineData = JSON.parse(defineResult);
    const missionId = defineData.missionId;

    // Submit 3 failed attempts
    for (let i = 1; i <= 3; i++) {
      await submitTool.execute({
        missionId,
        output: `Attempt ${i}`,
        value: 100
      });
    }

    // 4th attempt should fail with max attempts exceeded
    const exceedResult = await submitTool.execute({
      missionId,
      output: 'Attempt 4',
      value: 100
    });

    const exceedData = JSON.parse(exceedResult);
    recordResult('4.1: Max attempts exceeded returns error',
      exceedData.success === false && exceedData.passed === false);

    // Verify mission state is FAILED
    const mission = stateManager.getMission(missionId);
    recordResult('4.2: Mission state is FAILED', mission.state === MissionState.FAILED);
    recordResult('4.3: Mission success flag is false', mission.success === false);
    recordResult('4.4: Error message mentions max attempts',
      mission.errorMessage?.includes('Maximum attempts exceeded') === true);

  } catch (error) {
    recordResult('4.x: Max Attempts Test', false, error instanceof Error ? error.message : String(error));
  }
}

// Test 5: Persistence and Recovery
async function testPersistenceRecovery() {
  console.log('\n💾 Test 5: Persistence and Recovery');
  console.log('='.repeat(60));

  try {
    cleanupTestDir();

    // Create first state manager with persistence
    const config1 = {
      stateDir: TEST_STATE_DIR,
      enablePersistence: true,
      completedRetentionDays: 30,
      failedRetentionDays: 90
    };

    const stateManager1 = await StateManager.create(config1);
    const defineTool1 = new DefineMissionTool(stateManager1);
    const submitTool1 = new SubmitAttemptTool(stateManager1);

    // Create mission and submit attempts
    const defineResult = await defineTool1.execute({
      goal: 'Persistence test mission',
      strategy: 'NUMERIC',
      criteria: {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: 50,
        metricName: 'score'
      },
      maxAttempts: 10
    });

    const defineData = JSON.parse(defineResult);
    const missionId = defineData.missionId;

    // Submit 3 attempts
    await submitTool1.execute({ missionId, output: 'Attempt 1', value: 10 });
    await submitTool1.execute({ missionId, output: 'Attempt 2', value: 20 });
    await submitTool1.execute({ missionId, output: 'Attempt 3', value: 30 });

    // Force save
    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for debounced save

    recordResult('5.1: State file created', fs.existsSync(path.join(TEST_STATE_DIR, 'state.json')));

    // Create new state manager (simulating restart)
    const config2 = {
      stateDir: TEST_STATE_DIR,
      enablePersistence: true,
      completedRetentionDays: 30,
      failedRetentionDays: 90
    };

    const stateManager2 = await StateManager.create(config2);

    // Verify mission was loaded
    const recoveredMission = stateManager2.getMission(missionId);
    recordResult('5.2: Mission recovered from disk', recoveredMission !== undefined);
    recordResult('5.3: Recovered attempt count is 3', recoveredMission.currentAttempt === 3);
    recordResult('5.4: Recovered attempts array length is 3', recoveredMission.attempts.length === 3);
    recordResult('5.5: Mission state is IN_PROGRESS', recoveredMission.state === MissionState.IN_PROGRESS);

    // Continue with new state manager
    const submitTool2 = new SubmitAttemptTool(stateManager2);
    const continueResult = await submitTool2.execute({
      missionId,
      output: 'Attempt 4 after recovery',
      value: 60
    });

    const continueData = JSON.parse(continueResult);
    recordResult('5.6: Can continue mission after recovery',
      continueData.success === true && continueData.passed === true);

    cleanupTestDir();

  } catch (error) {
    recordResult('5.x: Persistence Test', false, error instanceof Error ? error.message : String(error));
    cleanupTestDir();
  }
}

// Test 6: Edge Cases and Error Handling
async function testEdgeCases() {
  console.log('\n🔬 Test 6: Edge Cases and Error Handling');
  console.log('='.repeat(60));

  try {
    const config = {
      stateDir: TEST_STATE_DIR,
      enablePersistence: false,
      completedRetentionDays: 30,
      failedRetentionDays: 90
    };

    const stateManager = await StateManager.create(config);
    const defineTool = new DefineMissionTool(stateManager);
    const submitTool = new SubmitAttemptTool(stateManager);

    // Test 6.1: Submit to non-existent mission
    const nonExistentResult = await submitTool.execute({
      missionId: 'non-existent-mission-id',
      output: 'test',
      value: 100
    });

    const nonExistentData = JSON.parse(nonExistentResult);
    recordResult('6.1: Submit to non-existent mission returns error',
      nonExistentData.success === false &&
      (nonExistentData.error?.includes('not found') || nonExistentData.error?.includes('Mission not found')));

    // Test 6.2: Submit to completed mission
    const defineResult = await defineTool.execute({
      goal: 'Quick completion',
      strategy: 'NUMERIC',
      criteria: {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: 10,
        metricName: 'value'
      },
      maxAttempts: 5
    });

    const defineData = JSON.parse(defineResult);
    const missionId = defineData.missionId;

    // Complete the mission
    await submitTool.execute({ missionId, output: 'Success', value: 100 });

    // Try to submit again
    const resubmitResult = await submitTool.execute({
      missionId,
      output: 'Another attempt',
      value: 200
    });

    const resubmitData = JSON.parse(resubmitResult);
    recordResult('6.2: Cannot submit to completed mission',
      resubmitData.success === false && resubmitData.error?.includes('not in progress'));

    // Test 6.3: maxAttempts = 1
    const singleAttemptResult = await defineTool.execute({
      goal: 'Single attempt mission',
      strategy: 'NUMERIC',
      criteria: {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.EQUAL,
        threshold: 100,
        metricName: 'value'
      },
      maxAttempts: 1
    });

    const singleData = JSON.parse(singleAttemptResult);
    const singleMissionId = singleData.missionId;

    // Fail the only attempt
    await submitTool.execute({ missionId: singleMissionId, output: 'Fail', value: 50 });

    // Try second attempt
    const secondAttempt = await submitTool.execute({
      missionId: singleMissionId,
      output: 'Second',
      value: 100
    });

    const secondData = JSON.parse(secondAttempt);
    recordResult('6.3: maxAttempts=1 enforced correctly', secondData.success === false);

    // Test 6.4: Missing value for NUMERIC validation
    const numericMissionResult = await defineTool.execute({
      goal: 'Numeric test',
      strategy: 'NUMERIC',
      criteria: {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: 50,
        metricName: 'score'
      },
      maxAttempts: 3
    });

    const numericData = JSON.parse(numericMissionResult);
    const numericMissionId = numericData.missionId;

    const missingValueResult = await submitTool.execute({
      missionId: numericMissionId,
      output: 'No value provided'
      // value is missing
    });

    const missingValueData = JSON.parse(missingValueResult);
    recordResult('6.4: Missing value handled gracefully',
      missingValueData.success === true && missingValueData.passed === false);

  } catch (error) {
    recordResult('6.x: Edge Cases Test', false, error instanceof Error ? error.message : String(error));
  }
}

// Test 7: Attempt Counter Warning Thresholds
async function testWarningThresholds() {
  console.log('\n⚠️  Test 7: Warning Thresholds');
  console.log('='.repeat(60));

  try {
    let warningCount = 0;
    const originalWarn = console.warn;
    console.warn = (message: string, ...args: unknown[]) => {
      if (String(message).includes('Approaching attempt limit')) {
        warningCount++;
      }
      originalWarn(message, ...args);
    };

    const config = {
      stateDir: TEST_STATE_DIR,
      enablePersistence: false,
      completedRetentionDays: 30,
      failedRetentionDays: 90
    };

    const stateManager = await StateManager.create(config);
    const defineTool = new DefineMissionTool(stateManager);
    const submitTool = new SubmitAttemptTool(stateManager);

    const defineResult = await defineTool.execute({
      goal: 'Warning threshold test',
      strategy: 'NUMERIC',
      criteria: {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.EQUAL,
        threshold: 999,
        metricName: 'value'
      },
      maxAttempts: 10
    });

    const defineData = JSON.parse(defineResult);
    const missionId = defineData.missionId;

    // Submit 7 attempts (should trigger warning at attempt 7: 3 remaining)
    warningCount = 0;
    for (let i = 1; i <= 7; i++) {
      await submitTool.execute({ missionId, output: `Attempt ${i}`, value: 100 });
    }

    recordResult('7.1: Warning triggered when reaching threshold', warningCount >= 1);

    console.warn = originalWarn;

  } catch (error) {
    recordResult('7.x: Warning Threshold Test', false, error instanceof Error ? error.message : String(error));
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 COMPREHENSIVE SYSTEM TEST');
  console.log('='.repeat(60));
  console.log('Testing all major functionality of the Universal Orchestrator MCP\n');

  const startTime = Date.now();

  await testNumericValidation();
  await testExitCodeValidation();
  await testKeywordValidation();
  await testMaxAttemptsFailure();
  await testPersistenceRecovery();
  await testEdgeCases();
  await testWarningThresholds();

  const totalDuration = Date.now() - startTime;

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Duration: ${totalDuration}ms\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}`);
      if (r.error) {
        console.log(`     ${r.error}`);
      }
    });
  }

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED! 🎉\n');
    return 0;
  } else {
    console.log(`❌ ${failed} TEST(S) FAILED\n`);
    return 1;
  }
}

// Run tests
runAllTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
