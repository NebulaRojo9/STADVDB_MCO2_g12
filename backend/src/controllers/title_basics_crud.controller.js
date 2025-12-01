// controllers/title_basics.controller.js

// IMPORT THE SERVICE, NOT THE CONTROLLER
import { startTransaction } from '../services/internal.service.js'; 

export const readTitle = async (req, res) => {

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