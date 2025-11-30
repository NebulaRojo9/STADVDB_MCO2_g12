import * as TitleBasicsService from '../services/title_basics.services.js';

export async function init(req, res) {
    try {
        await TitleBasicsService.init();
        res.status(200).send('Title Basics endpoint is working');
    } catch (error) {
        console.error('Error in init controller: ', error);

        res.status(500).json({ 
            message: "Transaction failed", 
            error: error.message 
        });
    }
}

export async function getAllFromNode(req, res) {
    try {
        const vmid = parseInt(req.params.vmid);

        // check if vmid == 1, 2, or 3
        if (!(vmid == 1 || vmid == 2 || vmid == 3)) {
            let error = new Error("VMID must be 1, 2, or 3");
            throw error;
        }

        const title_basics = await TitleBasicsService.getAllFromNode(vmid);
        res.status(200).json(title_basics);
    } catch (error) {
        console.error('Error in getAllFromNode controller: ', error);

        res.status(500).json({ 
            message: "Transaction failed", 
            error: error.message 
        });
    }
}

export async function addRowToNode(req, res) {
    try {
        const vmid = parseInt(req.params.vmid);
        const data = req.body;
        const result = await TitleBasicsService.addRowToNode(vmid, data);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error in addRowToNode controller: ', error);

        res.status(500).json({ 
            message: "Transaction failed", 
            error: error.message 
        });
    }
}

export async function updateRowByIDInNode(req, res) {
    try {
        const vmid = parseInt(req.params.vmid);
        const id = req.params.id;
        const updates = req.body;
        const result = await TitleBasicsService.updateRowByIDInNode(vmid, id, updates);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in updateRowByIDInNode controller: ', error);

        res.status(500).json({ 
            message: "Transaction failed", 
            error: error.message 
        });
    }
}

export async function deleteRowByIDInNode(req, res) {
    try {
        const vmid = parseInt(req.params.vmid);
        const id = req.params.id;
        const result = await TitleBasicsService.deleteRowByIDInNode(vmid, id);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in deleteRowByIDInNode controller: ', error);
        
        res.status(500).json({
            message: "Transaction failed",
            error: error.message
        });
    }
}

export async function routeCreateToNode(req, res) {
    // Steps:
    // 1. Check if this should go to node 1 or 2 
    try {
        const data = req.body;
        const vmid = parseInt(req.params.vmid);

        // check if vmid == 1, 2, or 3
        if (!(vmid == 1 || vmid == 2 || vmid == 3)) {
            let error = new Error("VMID must be 1, 2, or 3");
            throw error;
        }

        const result = await TitleBasicsService.routeCreateToNode(vmid, data);

        res.status(201).json(result);
    } catch (error) {
        console.error('Error in routeCreateToNode controller: ', error);

        res.status(500).json({ 
            message: "Transaction failed", 
            error: error.message 
        });
    }
}

export async function routeUpdateToNode(req, res) {
    // 1. Check if this should go to node 1 or 2 
    try {
        const updates = req.body;
        const vmid = parseInt(req.params.vmid);
        const id = req.params.id;

        // check if vmid == 1, 2, or 3
        if (!(vmid == 1 || vmid == 2 || vmid == 3)) {
            let error = new Error("VMID must be 1, 2, or 3");
            throw error;
        }

        const result = await TitleBasicsService.routeUpdateToNode(vmid, id, updates);

        res.status(201).json(result);
    } catch (error) {
        console.error('Error in routeUpdateToNode controller: ', error);

        res.status(500).json({ 
            message: "Transaction failed", 
            error: error.message 
        });
    }
}