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

export const checkTestState = async () => {
    // 1. Simulate Network Delay (Latency)
    if (TestConfig.delayMs > 0) {
        console.warn(`[TEST MODE] Sleeping for ${TestConfig.delayMs}ms...`);
        // Using a Promise to block the async execution flow
        await new Promise(resolve => setTimeout(resolve, TestConfig.delayMs));
        console.warn(`[TEST MODE] Resuming execution after delay.`);
    }

    // 2. Simulate Node Crash
    if (TestConfig.shouldCrash) {
        console.error(`[TEST MODE] Simulating ${TestConfig.crashType} Crash NOW.`);
        
        if (TestConfig.crashType === 'HARD') {
            // "Hard" crash: The process dies immediately.
            // This simulates a power failure or segfault.
            process.exit(1); 
        } else {
            // "Soft" crash: The process hangs indefinitely.
            // This simulates a deadlock, infinite loop, or unresponsive network socket.
            // The request will eventually time out on the sender's side.
            await new Promise(() => {}); 
        }
    }
};