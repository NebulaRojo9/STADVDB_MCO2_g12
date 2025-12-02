// Place services for testing here!

// Global state object, can be switched for testing
export const TestConfig = {
    shouldCrash: false,      // If true, node simulates a crash
    crashType: 'HARD',       // 'HARD' (process.exit) or 'SOFT' (throw error/timeout)
    delayMs: 0,              // Milliseconds to wait before responding
    targetTransactionId: null // Optional: Only crash/delay specific transactions
};

// shouldCrash is boolean (true/false) if crashing should occur
export const setCrashState = (shouldCrash, type = 'HARD') => {
    TestConfig.shouldCrash = shouldCrash;
    TestConfig.crashType = type;
    console.log(`[TEST MODE] Crash State set to: ${shouldCrash} (${type})`);
};

export const setDelay = (milliseconds) => {
    TestConfig.delayMs = milliseconds;
    console.log(`[TEST MODE] Global Delay set to: ${milliseconds}ms`);
};

export const resetTestState = () => {
    TestConfig.shouldCrash = false;
    TestConfig.delayMs = 0;
    TestConfig.crashType = 'HARD';
    console.log(`[TEST MODE] State reset to normal.`);
};