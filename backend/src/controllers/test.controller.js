// Place controllers for testing here!
import * as testService from '../services/test.services.js';

export const triggerCrash = (req, res) => {
    const { enable, type } = req.body; // { "enable": true, "type": "HARD" }
    
    testService.setCrashState(enable, type);
    
    return res.status(200).json({ 
        message: `Crash simulation ${enable ? 'ENABLED' : 'DISABLED'}`,
        config: testService.TestConfig 
    });
};

export const setDelay = (req, res) => {
    const { delay } = req.body; // { "delay": 5000 }
    
    testService.setDelay(delay || 0);
    
    return res.status(200).json({ 
        message: `Delay set to ${delay}ms`,
        config: testService.TestConfig 
    });
};

export const resetState = (req, res) => {
    testService.resetTestState();
    return res.status(200).json({ message: "Test state reset" });
};