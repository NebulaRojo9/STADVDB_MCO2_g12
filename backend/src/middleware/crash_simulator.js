// middleware/crash_simulator.js

export const delayedCrash = (req, res, next) => {
  // Check mostly query params for ease of testing via URL
  // e.g., POST /create?crashDelay=2000
  let crashDelay = req.query.crashDelay || req.body.crashDelay;

  // If no crash instruction is present, just move on
  if (crashDelay === undefined || crashDelay === null) {
    return next();
  }

  const delayInt = parseInt(crashDelay, 10);

  if (isNaN(delayInt)) {
    return res.status(400).json({
      success: false,
      error: "Invalid Parameter: 'crashDelay' must be a number."
    });
  }

  console.warn(`⚠️ SYSTEM ARMED: Will crash in ${delayInt}ms...`);

  // Set the timer to kill the process
  setTimeout(() => {
    console.error("💥 SIMULATING HARD CRASH NOW. GOODBYE.");
    process.exit(1); // Forcefully kills the Node.js process
  }, delayInt);

  // IMPORTANT: We call next() immediately so the request continues processing!
  // The crash will happen in the background while the request is running.
  next();
};