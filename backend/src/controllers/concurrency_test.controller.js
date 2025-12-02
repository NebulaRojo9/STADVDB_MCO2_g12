import axios from 'axios';
import 'dotenv/config';

const NODE_URL = `http://localhost:${process.env.PORT}/title-basics`;
const NODE_1 = `http://localhost:3000/title-basics`;
const NODE_2 = `http://localhost:3001/title-basics`;
const NODE_3 = `http://localhost:3002/title-basics`;

export const testReadRead = async (req, res) => {
const id = 'tt1234567';
    const startYear = 1894;
    console.log("Starting Global Read-Read Test...");
    const results = await Promise.all([
        // REQUEST A: Slow Read on Node 1
        (async () => {
            const start = Date.now();
            try {
                await axios.get(`${NODE_1}/read/${id}`, { 
                    params: { startYear, delay: 3000 } 
                });
                return { name: "Tx A (Slow Read)", duration: Date.now() - start, status: "OK" };
            } catch (e) {
                return { name: "Tx A", error: e.message, duration: Date.now() - start };
            }
        })(),

        // REQUEST B: Fast Read on Node 2 (Should NOT wait)
        (async () => {
            const start = Date.now();
            try {
                await axios.get(`${NODE_2}/read/${id}`, { 
                    params: { startYear, delay: 0 } 
                });
                return { name: "Tx B (Fast Read)", duration: Date.now() - start, status: "OK" };
            } catch (e) {
                return { name: "Tx B", error: e.message, duration: Date.now() - start };
            }
        })(),

        // REQUEST C: Very Slow Read on Node 3 (Should )
        (async () => {
            const start = Date.now();
            try {
                await axios.get(`${NODE_3}/read/${id}`, { 
                    params: { startYear, delay: 6000 } 
                });
                return { name: "Tx C (Very Slow Read)", duration: Date.now() - start, status: "OK" };
            } catch (e) {
                return { name: "Tx C", error: e.message, duration: Date.now() - start };
            }
        })()
    ]);

    res.json({
        scenario: "1. Concurrent Reads (Shared Locks)",
        expectation: "Tx B should finish fast (no delay). Tx A should take > 3000ms (3s delay). Tx C should finish last (6s delay)",
        results
    });
}