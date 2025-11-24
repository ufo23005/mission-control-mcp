#!/usr/bin/env ts-node
/**
 * Integration Test: Verify P1 Optimization
 *
 * This test verifies that the redundant logging issue is fixed.
 * Before the fix, calling submit_attempt would trigger warning logs
 * multiple times as it replayed the attempt history.
 *
 * After the fix, warnings should only appear for NEW attempts,
 * not during state restoration.
 */

import { StateManager } from '../../src/state/StateManager.js';
import { SubmitAttemptTool } from '../../src/tools/submitAttempt.js';
import { DefineMissionTool } from '../../src/tools/defineMission.js';
import { StateConfig } from '../../src/types/state.js';
import { ValidationStrategy, NumericOperator } from '../../src/types/validation.js';

// Track warnings
let warningCount = 0;
const warnings: string[] = [];
const originalWarn = console.warn;

// Mock console.warn to count warnings
console.warn = (message: string, ...args: unknown[]) => {
  const fullMessage = `${message} ${args.join(' ')}`;
  if (fullMessage.includes('Approaching attempt limit')) {
    warningCount++;
    warnings.push(fullMessage);
  }
  // Still output for visibility
  originalWarn(message, ...args);
};

async function runTest() {
  console.log('🧪 Integration Test: Verify No Redundant Logs\n');
  console.log('=' .repeat(60));

  try {
    // Setup state manager (no persistence for test)
    const config: StateConfig = {
      stateDir: './test-state-logs',
      enablePersistence: false,
      completedRetentionDays: 30,
      failedRetentionDays: 90
    };

    const stateManager = await StateManager.create(config);
    const defineTool = new DefineMissionTool(stateManager);
    const submitTool = new SubmitAttemptTool(stateManager);

    // Step 1: Create mission with maxAttempts=10, warnThreshold=3 (default)
    console.log('\n📝 Step 1: Create mission (maxAttempts=10, warnThreshold=3)');
    const defineResult = await defineTool.execute({
      goal: 'Test mission for logging verification',
      strategy: 'NUMERIC',
      criteria: {
        strategy: ValidationStrategy.NUMERIC,
        operator: NumericOperator.GREATER_THAN,
        threshold: 100,
        metricName: 'score'
      },
      maxAttempts: 10
    });

    const defineData = JSON.parse(defineResult);
    const missionId = defineData.missionId;
    console.log(`✅ Mission created: ${missionId}`);

    // Step 2: Simulate 6 failed attempts (not yet at warning threshold)
    console.log('\n📊 Step 2: Submitting 6 failed attempts...');
    warningCount = 0;
    warnings.length = 0;

    for (let i = 1; i <= 6; i++) {
      const result = await submitTool.execute({
        missionId,
        output: `Attempt ${i}`,
        value: 50 // Less than threshold of 100
      });

      const data = JSON.parse(result);
      console.log(`  Attempt ${i}: ${data.passed ? 'PASS' : 'FAIL'} - ${warnings.length > 0 ? '⚠️  WARNING' : 'no warning'}`);
    }

    console.log(`\n⏱️  After 6 attempts: ${warningCount} warnings logged`);
    console.log(`   Expected: 0 warnings (4 remaining > 3 threshold)`);

    if (warningCount !== 0) {
      throw new Error(`❌ Unexpected warnings at attempt 6 (${warningCount} warnings)`);
    }
    console.log('✅ Correct: No warnings yet');

    // Step 3: Submit 7th attempt (should trigger first warning: 3 remaining = threshold)
    console.log('\n📊 Step 3: Submitting 7th attempt (should warn: 3 remaining)...');
    warningCount = 0;
    warnings.length = 0;

    await submitTool.execute({
      missionId,
      output: 'Attempt 7',
      value: 50
    });

    console.log(`\n⏱️  After 7th attempt: ${warningCount} warnings logged`);
    console.log(`   Expected: EXACTLY 1 warning`);

    if (warningCount !== 1) {
      console.error(`\n❌ FAILED: Expected 1 warning, got ${warningCount}`);
      console.error('Warnings logged:');
      warnings.forEach((w, i) => console.error(`  ${i + 1}. ${w}`));
      throw new Error('Redundant logging detected!');
    }

    console.log('✅ Correct: Exactly 1 warning (no redundant logs)');

    // Step 4: Submit 8th attempt (should warn again: 2 remaining)
    console.log('\n📊 Step 4: Submitting 8th attempt (should warn: 2 remaining)...');
    warningCount = 0;
    warnings.length = 0;

    await submitTool.execute({
      missionId,
      output: 'Attempt 8',
      value: 50
    });

    console.log(`\n⏱️  After 8th attempt: ${warningCount} warnings logged`);
    console.log(`   Expected: EXACTLY 1 warning`);

    if (warningCount !== 1) {
      console.error(`\n❌ FAILED: Expected 1 warning, got ${warningCount}`);
      throw new Error('Redundant logging detected!');
    }

    console.log('✅ Correct: Exactly 1 warning (no redundant logs)');

    // Step 5: Submit 9th attempt (should warn again: 1 remaining)
    console.log('\n📊 Step 5: Submitting 9th attempt (should warn: 1 remaining)...');
    warningCount = 0;
    warnings.length = 0;

    await submitTool.execute({
      missionId,
      output: 'Attempt 9',
      value: 50
    });

    console.log(`\n⏱️  After 9th attempt: ${warningCount} warnings logged`);
    console.log(`   Expected: EXACTLY 1 warning`);

    if (warningCount !== 1) {
      console.error(`\n❌ FAILED: Expected 1 warning, got ${warningCount}`);
      throw new Error('Redundant logging detected!');
    }

    console.log('✅ Correct: Exactly 1 warning (no redundant logs)');

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ ALL CHECKS PASSED! 🎉\n');
    console.log('P1 Optimization Verification:');
    console.log('  ✓ No warnings during early attempts (1-6)');
    console.log('  ✓ Exactly 1 warning at attempt 7 (3 remaining)');
    console.log('  ✓ Exactly 1 warning at attempt 8 (2 remaining)');
    console.log('  ✓ Exactly 1 warning at attempt 9 (1 remaining)');
    console.log('  ✓ No redundant logs from attempt replay');
    console.log('\nConclusion: Factory method successfully eliminates redundant logging!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    // Restore console.warn
    console.warn = originalWarn;
  }
}

// Run test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
