// Place routes for testing here!

// POST /test/crash -> Body: { "enable": true }
router.post('/crash', testController.triggerCrash);

// POST /test/delay -> Body: { "delay": 10000 }
router.post('/delay', testController.setDelay);

// POST /test/reset
router.post('/reset', testController.resetState);