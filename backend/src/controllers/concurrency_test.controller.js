import axios from 'axios';
import 'dotenv/config';

// hacky fix
const PEER_NODES = process.env.PEERS ? process.env.PEERS.split(',') : [];

const NODE_1 = `${process.env.NODE_URL}/title-basics`;
const NODE_2 = `${PEER_NODES[0]}/title-basics` || "umaybatwala";
const NODE_3 = `${PEER_NODES[1]}/title-basics` || "umaybatwala";

export const testReadRead = async (req, res) => {
  const id = 'tt1234567';
  const startYear = 1894;
  console.log('Starting Global Read-Read Test...');
  const results = await Promise.all([
    // REQUEST A: Slow Read on Node 1
    (async () => {
      const start = Date.now();
      try {
        await axios.get(`${NODE_1}/read/${id}`, {
          params: { startYear, delay: 3000 },
        });
        return { name: 'Tx A (Slow Read)', duration: Date.now() - start, status: 'OK' };
      } catch (e) {
        return { name: 'Tx A', error: e.message, duration: Date.now() - start };
      }
    })(),

    // REQUEST B: Fast Read on Node 2 (Should NOT wait)
    (async () => {
      const start = Date.now();
      try {
        await axios.get(`${NODE_2}/read/${id}`, {
          params: { startYear, delay: 0 },
        });
        return { name: 'Tx B (Fast Read)', duration: Date.now() - start, status: 'OK' };
      } catch (e) {
        return { name: 'Tx B', error: e.message, duration: Date.now() - start };
      }
    })(),

    // REQUEST C: Very Slow Read on Node 3 (Should )
    (async () => {
      const start = Date.now();
      try {
        await axios.get(`${NODE_3}/read/${id}`, {
          params: { startYear, delay: 6000 },
        });
        return { name: 'Tx C (Very Slow Read)', duration: Date.now() - start, status: 'OK' };
      } catch (e) {
        return { name: 'Tx C', error: e.message, duration: Date.now() - start };
      }
    })(),
  ]);

  res.json({
    scenario: '1. Concurrent Reads (Shared Locks)',
    expectation:
      'Tx B should finish fast (no delay). Tx A should take > 3000ms (3s delay). Tx C should finish last (6s delay)',
    results,
  });
};

export const testWriteRead = async (req, res) => {
  const id = 'tt1234567';
  const startYear = 1894; // Targets Node 1

  console.log('Starting Global Write-Read Test...');

  const results = await Promise.all([
    // REQUEST A: Slow Write on Node 1 (Holds EXCLUSIVE Lock)
    (async () => {
      const start = Date.now();
      try {
        await axios.put(`${NODE_1}/update/${id}`, {
          startYear,
          delay: 3000,
          primaryTitle: 'Conflict Test Update',
        });
        return { name: 'Tx A (Slow Write)', duration: Date.now() - start, status: 'OK' };
      } catch (e) {
        return { name: 'Tx A', error: e.message, duration: Date.now() - start };
      }
    })(),

    // REQUEST B: Fast Read on Node 2 (Must WAIT for A)
    (async () => {
      const start = Date.now();
      try {
        // Wait 100ms to ensure Tx A gets to the Lock Manager first
        await new Promise((resolve) => setTimeout(resolve, 100));

        await axios.get(`${NODE_2}/read/${id}`, {
          params: { startYear, delay: 0 },
        });
        return { name: 'Tx B (Fast Read)', duration: Date.now() - start, status: 'OK' };
      } catch (e) {
        return { name: 'Tx B', error: e.message, duration: Date.now() - start };
      }
    })(),

    // REQUEST C: Fast Read on Node 3 (Must WAIT for A)
    (async () => {
      const start = Date.now();
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        await axios.get(`${NODE_3}/read/${id}`, {
          params: { startYear, delay: 0 },
        });
        return { name: 'Tx C (Fast Read)', duration: Date.now() - start, status: 'OK' };
      } catch (e) {
        return { name: 'Tx C', error: e.message, duration: Date.now() - start };
      }
    })(),
  ]);

  res.json({
    scenario: '2. Write vs Reads (Exclusive vs Shared)',
    expectation:
      'Tx A takes ~3000ms. Tx B and C must BLOCK and wait for A, so they should also take > 3000ms.',
    results,
  });
};

export const testWriteWrite = async (req, res) => {
  const id = 'tt1234567';
  const startYear = 1894; // Targets Node 1

  console.log('Starting Global Write-Write Test...');

  const results = await Promise.all([
    // REQUEST A: Slow Update on Node 1 (EXCLUSIVE)
    (async () => {
      const start = Date.now();
      try {
        await axios.put(`${NODE_1}/update/${id}`, {
          startYear,
          delay: 3000,
          primaryTitle: 'Write A',
        });
        return { name: 'Tx A (Slow Update)', duration: Date.now() - start, status: 'OK' };
      } catch (e) {
        return { name: 'Tx A', error: e.message, duration: Date.now() - start };
      }
    })(),

    // REQUEST B: Fast Delete on Node 2 (EXCLUSIVE - Must Wait)
    (async () => {
      const start = Date.now();
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Note: axios.delete requires 'data' property for body
        await axios.delete(`${NODE_2}/delete/${id}`, {
          data: { startYear, delay: 0 },
        });
        return { name: 'Tx B (Fast Delete)', duration: Date.now() - start, status: 'OK' };
      } catch (e) {
        return { name: 'Tx B', error: e.message, duration: Date.now() - start };
      }
    })(),

    // REQUEST C: Fast Update on Node 3 (EXCLUSIVE - Must Wait)
    (async () => {
      const start = Date.now();
      try {
        // Wait slightly longer to see if it queues behind B
        await new Promise((resolve) => setTimeout(resolve, 200));

        await axios.put(`${NODE_3}/update/${id}`, {
          startYear,
          delay: 0,
          primaryTitle: 'Write C',
        });
        return { name: 'Tx C (Fast Update)', duration: Date.now() - start, status: 'OK' };
      } catch (e) {
        return { name: 'Tx C', error: e.message, duration: Date.now() - start };
      }
    })(),
  ]);

  res.json({
    scenario: '3. Concurrent Writes (Exclusive vs Exclusive)',
    expectation: 'Strict Serialization. Tx B waits for A (~3s). Tx C waits for A and B.',
    results,
  });
};
