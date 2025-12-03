import * as titleService from '../services/title_basics_crud.services.js';
import {
  startTransaction,
  aggregateAllTitlesFromPeers,
  startReadTitle,
  broadcastResetDatabases,
} from '../services/internal.service.js';

export const readTitle = async (req, res) => {
  const { id } = req.params;
  // optional
  const { startYear, delay } = req.query;

  try {
    const titleData = await startReadTitle(id, startYear, delay);

    if (titleData) {
      return res.status(200).json(titleData);
    }

    return res.status(404).json({ error: 'Title not found on any node' });
  } catch (err) {
    console.error('Read Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

export const readTitleAll = async (req, res) => {
  try {
    console.log("READ ALL CALLED\n")
    let localTitles = await titleService.findAllFromNode();
    // Flag to check if it should aggregate from peers or just return its rows
    if (req.query.internal === 'true') {
      console.log(`[READ] Internal request received. Returning ${localTitles.length} local rows.`);
      return res.status(200).json(localTitles);
    }

    const peerTitles = await aggregateAllTitlesFromPeers();
    const combined = localTitles.concat(peerTitles);

    console.log(peerTitles)
    console.log(combined)

    // De-duplicate
    const uniqueTitles = {};
    combined.forEach((title) => {
      if (title && title.tconst) {
        uniqueTitles[title.tconst] = title;
      }
    });

    const finalTitles = Object.values(uniqueTitles);

    console.log(`[READ] Returning ${finalTitles.length} total rows.`);
    return res.status(200).json(finalTitles);
  } catch (err) {
    console.error('Controller Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// helper function, wont connect to frontend
export const readTitleFromNode = async (req, res) => {
  try {
    const titles = await titleService.findAllFromNode();

    return res.status(200).json(titles);
  } catch (err) {
    console.error('Controller Error:', err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createTitle = async (req, res) => {
  const data = req.body;

  // 1. Basic Input Validation
  // We need tconst for locking and startYear for fragmentation routing
  if (!data.tconst || !data.startYear) {
    return res.status(400).json({
      error: "Missing required fields: 'tconst' and 'startYear' are mandatory.",
    });
  }

  try {
    // 2. Initiate the 2PC Transaction
    const result = await startTransaction({
      action: 'CREATE_TITLE', // Must match registry key
      id: data.tconst, // LOCK ID: We lock this specific Title ID
      data: data, // The payload to write
      startYear: data.startYear, // SHARD KEY: Used to route to correct nodes
      delay: data.delay, // DELAY for simulation in CRUD
    }, data.testCheckpoint);

    // 3. Handle Result
    if (result.success) {
      return res.status(201).json({
        message: 'Title created successfully',
        transactionId: result.transactionId,
        result,
      });
    } else {
      // 2PC Failure (Vote NO or Abort)
      console.error('Transaction failed:', result.error);
      return res.status(409).json({
        error: 'Create failed via Distributed Consensus',
        details: result.error,
        processTrace: result.processTrace,
      });
    }
  } catch (err) {
    console.error('Controller Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateTitle = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    // 1. Initiate the 2PC Transaction (Act as Coordinator)
    const result = await startTransaction({
      action: 'UPDATE_TITLE', // Must match crud_registry.js key
      id: id, // Used for Locking resource
      data: data, // The actual data to update
      startYear: data.startYear, // Used for your Fragmentation logic
      delay: data.delay, // DELAY for simulation in CRUD
    });

    // 2. Respond to Client based on 2PC Result
    if (result.success) {
      return res.status(200).json({
        message: 'Title updated successfully',
        transactionId: result.transactionId,
        result,
      });
    } else {
      // If 2PC failed (Abort or Voted No)
      return res.status(409).json({
        error: 'Update failed via Distributed Consensus',
        details: result.error,
        processTrace: result.processTrace,
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteTitle = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    // 1. Initiate the 2PC Transaction (Act as Coordinator)
    const result = await startTransaction({
      action: 'DELETE_TITLE', // Must match crud_registry.js key
      id: id, // Used for Locking resource
      startYear: data.startYear, // Used for your Fragmentation logic
      delay: data.delay, // DELAY for simulation in CRUD
    });

    // 2. Respond to Client based on 2PC Result
    if (result.success) {
      return res.status(200).json({
        message: 'Title deleted successfully',
        transactionId: result.transactionId,
        result,
      });
    } else {
      // If 2PC failed (Abort or Voted No)
      return res.status(409).json({
        error: 'Update failed via Distributed Consensus',
        details: result.error,
        processTrace: result.processTrace,
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export async function resetDatabases(req, res) {
  try {
    const resultPeers = await broadcastResetDatabases();

    res.status(200).json(resultPeers);
  } catch (error) {
    console.error('Error in deleteRowByIDInNode controller: ', error);

    res.status(500).json({
      message: 'Transaction failed',
      error: error.message,
    });
  }
}

export async function internalResetDatabases(req, res) {
  try {
    const result = await titleService.resetDatabases();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in deleteRowByIDInNode controller: ', error);

    res.status(500).json({
      message: 'Transaction failed',
      error: error.message,
    });
  }
}
