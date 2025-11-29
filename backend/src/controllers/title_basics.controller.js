import * as TitleBasicsService from '../services/title_basics.services.js';

export async function init(req, res) {
    try {
        await TitleBasicsService.init();
        res.status(200).send('Title Basics endpoint is working');
    } catch (error) {
        console.error('Error in initTitleBasics controller: ', error);
    }
}

export async function getAllFromNode(req, res) {
    try {
        const vmid = req.params.vmid;
        const title_basics = await TitleBasicsService.getAllFromNode(vmid);
        res.status(200).json(title_basics);
    } catch (error) {
        console.error('Error in getTitleBasics controller: ', error);
    }
}

export async function addRowToNode(req, res) {
    try {
        const vmid = req.params.vmid;
        const data = req.body;
        const result = await TitleBasicsService.addRowToNode(vmid, data);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error in addRow controller: ', error);
    }
}

export async function updateRowByIDInNode(req, res) {
    try {
        const vmid = req.params.vmid;
        const id = req.params.id;
        const updates = req.body;
        const result = await TitleBasicsService.updateRowByIDInNode(vmid, id, updates);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in updateRowByID controller: ', error);
    }
}

export async function routeCreateToNode(req, res) {
    // Steps:
    // 1. Check if this should go to node 1 or 2 
    try {
        const data = req.body;

        let vmid = 1;
    
        // Determine target fragment
        if (data.startYear < 2000)
            vmid = 2;
        else
            vmid = 3;

        const result = await TitleBasicsService.routeCreateToNode(vmid, data);

        res.status(201).json(result);
    } catch (error) {
        console.error('Error in routeCreateToNode controller: ', error);
    }
}

export async function routeUpdateToNode(req, res) {
    // 1. Check if this should go to node 1 or 2 
    try {
        const updates = req.body;
        const id = req.params.id;
        const startYear = req.params.startYear;
    
        let vmid = 1;
    
        if (startYear < 2000)
            vmid = 2;
        else
            vmid = 3;

        const result = await TitleBasicsService.routeUpdateToNode(vmid, id, updates);

        res.status(201).json(result);
    } catch (error) {
        console.error('Error in routeUpdateToNode controller: ', error);
    }
}