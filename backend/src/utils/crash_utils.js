// backend/src/utils/test.utils.js

// 1. Global State Object
export const TestConfig = {
    shouldCrash: false,      // If true, node simulates a crash
    crashType: 'HARD',       // 'HARD' (process.exit) or 'SOFT' (infinite loop/hang)
    delayMs: 0,              // Milliseconds to wait before responding
};

// 2. Control Functions (Used by Controller)
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

// 3. The "Trigger" Function (Used by Internal Services)
// Import this into your transaction logic (e.g., handlePrepare)
export const checkTestState = async () => {
    // Simulate Network Delay
    if (TestConfig.delayMs > 0) {
        console.warn(`[TEST MODE] Sleeping for ${TestConfig.delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, TestConfig.delayMs));
        console.warn(`[TEST MODE] Resuming execution after delay.`);
    }

    // Simulate Node Crash
    if (TestConfig.shouldCrash) {
        console.error(`[TEST MODE] Simulating ${TestConfig.crashType} Crash NOW.`);
        
        if (TestConfig.crashType === 'HARD') {
            await new Promise(resolve => setTimeout(resolve, 100));

            process.exit(1); // Kills the Node process instantly
        } else {
            // Soft crash: Hang indefinitely (simulating unresponsive socket)
            await new Promise(() => {}); 
        }
    }
};