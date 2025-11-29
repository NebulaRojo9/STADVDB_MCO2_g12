import * as TitleBasicsService from './title_basics.services.js';

export async function initTitleBasics(req, res) {
    try {
        await TitleBasicsService.initTitleBasics();
        res.status(200).send('Title Basics endpoint is working');
    } catch (error) {
        console.error('Error in initTitleBasics controller: ', error);
    }
}

export async function getTitleBasics(req, res) {
    try {
        const vmid = req.params.vmid;
        const title_basics = await TitleBasicsService.getTitleBasics(vmid);
        res.status(200).json(title_basics);
    } catch (error) {
        console.error('Error in getTitleBasics controller: ', error);
    }
}
