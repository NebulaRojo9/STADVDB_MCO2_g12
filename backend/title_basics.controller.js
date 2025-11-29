import * as TitleBasicsService from './title_basics.services.js';

export async function init(req, res) {
    try {
        await TitleBasicsService.init();
        res.status(200).send('Title Basics endpoint is working');
    } catch (error) {
        console.error('Error in initTitleBasics controller: ', error);
    }
}

export async function getAll(req, res) {
    try {
        const vmid = req.params.vmid;
        const title_basics = await TitleBasicsService.getAll(vmid);
        res.status(200).json(title_basics);
    } catch (error) {
        console.error('Error in getTitleBasics controller: ', error);
    }
}

export async function addRow(req, res) {
    try {
        const data = req.body;
        const result = await TitleBasicsService.addRow(data);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error in addRow controller: ', error);
    }
}

export async function updateRowByID(req, res) {
    try {
        const vmid = req.params.vmid;
        const id = req.params.id;
        const updates = req.body;
        const result = await TitleBasicsService.updateRowByID(vmid, id, updates);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in updateRowByID controller: ', error);
    }
}
