import axios from 'axios';
import 'dotenv/config';
import * as testUtils from '../utils/crash_utils.js'; // <--- Updated Import

export const triggerCrash = (req, res) => {
    // Default to 'true' if enable is not explicitly false
    const enable = req.body.enable !== false; 
    const type = req.body.type || 'HARD';
    
    testUtils.setCrashState(enable, type);
    
    return res.status(200).json({ 
        message: `Crash simulation ${enable ? 'ENABLED' : 'DISABLED'}`,
        config: testUtils.TestConfig 
    });
};

export const setDelay = (req, res) => {
    const delayInput = req.body.delay || req.query.delay;
    const delay = parseInt(delayInput, 10) || 0;
    
    testUtils.setDelay(delay);
    
    return res.status(200).json({ 
        message: `Delay set to ${delay}ms`,
        config: testUtils.TestConfig 
    });
};

export const resetState = (req, res) => {
    testUtils.resetTestState();
    return res.status(200).json({ 
        message: "Test state reset to normal (No crash, No delay)" 
    });
};

export const writeNodeFCrashF = async (req, res) => {
  const testCheckpoint = parseInt(req.params.testCheckpoint, 10); // 1 means stop at PREPARE, 2 means stop at COMMIT
  const id = 'tt99999971'; 
  // Payload for a movie < 2000 so it belongs to Node 2
  let bufferString; 
  if (testCheckpoint === 1)
    bufferString = "PREPARE";
  else
    bufferString = "COMMIT";

  const payload = {
    tconst: id,
    titleType: "movie",
    primaryTitle: "Write node fragment crash same fragment",
    originalTitle: `Crashes at step ${bufferString}`,
    isAdult: false,
    startYear: 1995, // < 2000: Routes to Node 2 (Coordinator) and Node 1 (Participant)
    endYear: null,
    runtimeMinutes: 100,
    genres: "Test",
    testCheckpoint: testCheckpoint
  };

  console.log('--- Starting Write(2) -> Crash(2) Test [Middleware Method] ---');
  const start = Date.now();

  try {
    // 1. Arm Node 2 (Coordinator) to crash during its internal processing
    // This tells Node 2: "Next time you run a transaction step, die."
    await axios.post(`${process.env.NODE_B_URL}/test/crash`, { enable: true, type: 'HARD' });
    console.log("-> Node 2 (Coordinator) armed to crash.");

    // 2. Send Write Request to Node 2
    
    // We expect this request to fail because the server processing it will die.
    await axios.post(`${process.env.NODE_B_URL}/title-basics/create`, payload);
    
    // If we reach here, the test FAILED because the server didn't crash
    res.json({ status: 'UNEXPECTED SUCCESS', message: 'Node 2 should have crashed but returned success.' });

  } catch (error) {
    const duration = Date.now() - start;
    console.log(`-> Transaction failed as expected: ${error.message}`);
    
    res.json({
      scenario: 'Write to Node 2 (Coordinator) -> Crash Node 2 (Self)',
      expectation: 'Node 2 crashes during processing (handlePrepare). Client receives "socket hang up" or network error.',
      results: [{ error: error.message, duration }] // Should be "socket hang up" or similar
    });
  } 
};

export const writeNodeCCrashF = async (req, res) => {
  const testCheckpoint = parseInt(req.params.testCheckpoint, 10);
  const id = 'tt99999970'; 
  // Payload for a movie < 2000 so it belongs to Node 2

  let bufferString; 
  if (testCheckpoint === 1)
    bufferString = "PREPARE";
  else
    bufferString = "COMMIT";

  const payload = {
    tconst: id,
    titleType: "movie",
    primaryTitle: "Write Node Central Crash Node Fragment (2)",
    originalTitle: `Crashes at step ${bufferString}`,
    isAdult: false,
    startYear: 1995, // < 2000: Routes to Node 2 (Coordinator) and Node 1 (Participant)
    endYear: null,
    runtimeMinutes: 100,
    genres: "Test",
    testCheckpoint: testCheckpoint
  };

  console.log('--- Starting Write(1) -> Crash(2) Test [Middleware Method] ---');
  const start = Date.now();

  try {
    // 1. Arm Node 2 (Coordinator) to crash during its internal processing
    // This tells Node 2: "Next time you run a transaction step, die."
    await axios.post(`${process.env.NODE_B_URL}/test/crash`, { enable: true, type: 'HARD' });
    console.log("-> Node 2 (Coordinator) armed to crash.");

    // 2. Send Write Request to Node 2
    
    // We expect this request to fail because the server processing it will die.
    await axios.post(`${process.env.NODE_A_URL}/title-basics/create`, payload);
    
    // If we reach here, the test FAILED because the server didn't crash
    res.json({ status: 'UNEXPECTED SUCCESS', message: 'Node 2 should have crashed but returned success.' });

  } catch (error) {
    const duration = Date.now() - start;

    const isNetworkError = !error.response;

    console.log(`-> Transaction failed as expected: ${error.message}`);
    
    res.json({
      scenario: 'Write to Node 1 (Coordinator) -> Crash Node 2 (Participant)',
      expectation: 'Node 2 crashes. Node 1 detects failure/timeout and returns 500/409 Abort error.',
      results: [{ NetworkError: isNetworkError ? error.message : error.response.data, duration }]

    });
  } 
};
