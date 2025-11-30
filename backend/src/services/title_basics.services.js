import { initDB, getDB } from '../config/connect.js';

const nodeStatus = {
    1: true,
    2: true,
    3: true
};

export function randomizeNodeFailure(vmid) {
    const randomNum = Math.random();
    if (randomNum < 0.3) { // 30% chance to fail
        nodeStatus[vmid] = false;
        console.log(`NODE ${vmid} HAS RANDOMLY FAILED`);
    }
}

export function simulateNodeFailure(vmid) {
    if (nodeStatus.hasOwnProperty(vmid)) {
        nodeStatus[vmid] = false;
        console.log(`NODE ${vmid} IS NOW OFFLINE`);
    }
}

export function simulateNodeRecovery(vmid) {
    if (nodeStatus.hasOwnProperty(vmid)) {
        nodeStatus[vmid] = true;
        console.log(`NODE ${vmid} IS NOW OFFLINE`);
    }
}

// GET '/title-basics/init'
export async function init() {
    // This function can be used to perform any initialization logic if needed
    await initDB();
    return;
}

// GET '/title-basics/:vmid/getAll'
export async function getAllFromNode(vmid) {
    try {
        const db = await getDB(vmid);
        const [title_basics] = await db.query('SELECT * FROM title_basics');
        
        return title_basics
    } catch (error) {
        throw error
    }
}

// POST '/:vmid/create'
export async function addRowToNode(vmid, data) {
    const { 
        tconst,
        titleType, 
        primaryTitle, 
        originalTitle, 
        isAdult, 
        startYear, 
        endYear, 
        runtimeMinutes, 
        genres 
    } = data;
        
    const db = await getDB(vmid);

    const conn = await db.getConnection();

    randomizeNodeFailure(vmid);

    try {
        await conn.beginTransaction();

        // Check if node has failed
        if (!nodeStatus[vmid]) {
            throw new Error(`Node ${vmid} is currently offline.`);
        }

        const [rows] = await conn.execute(
            `INSERT INTO title_basics (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres]
        )

        await conn.commit();
    } catch (error) {
        console.log("Rolling back!!!");
        await conn.rollback();

        // Temporary fix: recover the node after failure
        simulateNodeRecovery(vmid);

        throw error;
    } finally {
        conn.release();
    }
}

// PUT '/:vmid/update/:id'
export async function updateRowByIDInNode(vmid, id, updates) {
    const db = await getDB(vmid);
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const allowedColumns = [
            'titleType',
            'primaryTitle',
            'originalTitle',
            'isAdult',
            'runtimeMinutes',
            'genres'
        ];
        
        const keys = Object.keys(updates);
    
        if (keys.length !== 1 || !allowedColumns.includes(keys[0])) {
            throw new Error('Only one valid column can be updated at a time.');
        }
        
        const column = keys[0];
        const value = updates[column];
    
        const [result] = await conn.execute(
            `UPDATE title_basics SET \`${column}\` = ? WHERE Tconst = ?`,
            [value, id]
        );

        await conn.commit();
    
        return result;
    } catch (error) {
        console.log("Rolling back!!!");
        await conn.rollback();
        throw error;
    } finally {
        await conn.release();
    }
}

export async function deleteRowByIDInNode(vmid, id) {
    const db = await getDB(vmid);
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [result] = await conn.execute(
            `DELETE FROM title_basics WHERE Tconst = ?`,
            [id]
        );
        
        await conn.commit();

        return result;
    } catch (error) {
        console.log("Rolling back!!!");
        await conn.rollback();
        throw error;
    } finally {
        await conn.release();
    }
}

// POST '/:vmid/routeCreate'
export async function routeCreateToNode(vmid, data) {
    // check vmid and see if it should go to node 2 or 3
    // copy it to node 1 regardless
    console.log(`Routing this create request: ${vmid}`);
    let resultCentral, resultFragment;

    if (vmid === 2 || vmid === 3) {
        console.log("Adding to fragment node first!")
        resultFragment = await addRowToNode(vmid, data);
        
        console.log("Adding to central node next!")
        resultCentral = await addRowToNode(1, data);

    } else if (vmid === 1) {
        console.log("Adding to node 1!");
        resultCentral = await addRowToNode(vmid, data);
        
        if (data.startYear < 2000) {
            console.log("Adding to node 2!");
            resultFragment = await addRowToNode(2, data);
        }
        else {
            console.log("Adding to node 3!");
            resultFragment = await addRowToNode(3, data);
        }
    }

    return { central: resultCentral, node: resultFragment };
}

// PUT '/:vmid/routeUpdate/:id/:startYear'
export async function routeUpdateToNode(vmid, id, updates) {
    // check vmid and see if it should go to node 2 or 3
    // copy it to node 1 regardless

    const resultCentral = await updateRowByIDInNode(1, id, updates);

    if (vmid === 2 || vmid === 3) {
        const resultFragment = await updateRowByIDInNode(vmid, id, updates);
        return { central: resultCentral, node: resultFragment };
    }
}