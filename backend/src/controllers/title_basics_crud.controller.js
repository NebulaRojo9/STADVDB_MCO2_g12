// controllers/title_basics.controller.js

// IMPORT THE SERVICE, NOT THE CONTROLLER
import * as titleService from '../services/title_basics_crud.services.js';
import { startTransaction, broadcastReadRow, aggregateAllTitlesFromPeers, getHostNodeUrl, isHost} from '../services/internal.service.js'; 

export const readTitle = async (req, res) => {
  const { id } = req.params;

  try {
    const localData = await titleService.findById(id);
    if (localData) {
      console.log(`[READ] Found ${id} locally`);
      return res.status(200).json(localData);
    }

    const peerData = await broadcastReadRow(id);

    if (peerData) {
      return res.status(200).json(peerData);
    }

    return res.status(404).json({ error: "Title not found on any node" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export const readTitleAll = async (req, res) => {
  try {
    let localTitles = await titleService.findAllFromNode();
    let finalTitles = localTitles

    
    if (!isHost()) { // if it is NOT host
      const hostURL = getHostNodeUrl();

      if (hostURL) {
        console.log("HOST WAS FOUND")
        const peerTitles = await aggregateAllTitlesFromPeers(hostURL);
        console.log("done agg")

        const combined = localTitles.concat(peerTitles);

        // De-duplicating
        const uniqueTitles = {};
        combined.forEach(title => {
            uniqueTitles[title.tconst] = title;
        });

        finalTitles = Object.values(uniqueTitles);

        console.log("final Titles");
        console.log(finalTitles);
      }
    }

    return res.status(200).json(finalTitles);
  } catch (err) {
    console.error("Controller Error:". err)
    return res.status(500).json({ error: err })
  }
}

// helper function, wont connect to frontend
export const readTitleFromNode = async (req, res) => {
  try {
    const titles = await titleService.findAllFromNode();

    return res.status(200).json(titles);
  } catch (err) {
    console.error("Controller Error:". err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

export const createTitle = async (req, res) => {
  const data = req.body;

  // 1. Basic Input Validation
  // We need tconst for locking and startYear for fragmentation routing
  if (!data.tconst || !data.startYear) {
    return res.status(400).json({ 
      error: "Missing required fields: 'tconst' and 'startYear' are mandatory." 
    });
  }

  try {
    // 2. Initiate the 2PC Transaction
    const result = await startTransaction({
      action: 'CREATE_TITLE',     // Must match registry key
      id: data.tconst,            // LOCK ID: We lock this specific Title ID
      data: data,                 // The payload to write
      startYear: data.startYear   // SHARD KEY: Used to route to correct nodes
    });

    // 3. Handle Result
    if (result.success) {
      return res.status(201).json({ 
        message: 'Title created successfully', 
        transactionId: result.transactionId 
      });
    } else {
      // 2PC Failure (Vote NO or Abort)
      console.error("Transaction failed:", result.error);
      return res.status(409).json({ 
        error: 'Create failed via Distributed Consensus', 
        details: result.error 
      });
    }

  } catch (err) {
    console.error("Controller Error:", err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateTitle = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    // 1. Initiate the 2PC Transaction (Act as Coordinator)
    const result = await startTransaction({
      action: 'UPDATE_TITLE',      // Must match crud_registry.js key
      id: id,                      // Used for Locking resource
      data: data,                  // The actual data to update
      startYear: data.startYear    // Used for your Fragmentation logic
    });

    // 2. Respond to Client based on 2PC Result
    if (result.success) {
      return res.status(200).json({ 
        message: 'Title updated successfully', 
        transactionId: result.transactionId 
      });
    } else {
      // If 2PC failed (Abort or Voted No)
      return res.status(409).json({ 
        error: 'Update failed via Distributed Consensus', 
        details: result.error 
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
      action: 'DELETE_TITLE',      // Must match crud_registry.js key
      id: id,                      // Used for Locking resource
      startYear: data.startYear    // Used for your Fragmentation logic
    });

    // 2. Respond to Client based on 2PC Result
    if (result.success) {
      return res.status(200).json({ 
        message: 'Title updated successfully', 
        transactionId: result.transactionId 
      });
    } else {
      // If 2PC failed (Abort or Voted No)
      return res.status(409).json({ 
        error: 'Update failed via Distributed Consensus', 
        details: result.error 
      });
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}