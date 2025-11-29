import { initDB, getDB } from './config/connect.js';

// GET '/title-basics/init'
export async function initTitleBasics() {
    // This function can be used to perform any initialization logic if needed
    await initDB();
    return;
}

// GET '/title-basics/:vmid'
export async function getTitleBasics(vmid) {
    const db = await getDB(vmid);
    const [title_basics] = await db.query('SELECT * FROM title_basics');
    
    return title_basics
}