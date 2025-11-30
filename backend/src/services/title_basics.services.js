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
        console.log(`NODE ${vmid} IS BEING RECOVERED`);
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
// Connections being accepted here have already begun transaction
export async function addRowToNode(vmid, data, conn) {
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

    randomizeNodeFailure(vmid);

    try {
        // Check if node has failed
        if (!nodeStatus[vmid]) {
            throw new Error(`Node ${vmid} is currently offline.`);
        }

        const [rows] = await conn.execute(
            `INSERT INTO title_basics (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres]
        )
    } catch (error) {
        console.log("Rolling back from addRowToNode");
        // Temporary fix: recover the node after failure
        simulateNodeRecovery(vmid);

        throw error;
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
        console.log("Rolling back form updateRowByIdInNode");
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
        console.log("Rolling back from deleteRowByIDInNode");
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

    // Initialize connections HERE rather than in the add row functions
    const dbCentral = await getDB(1);
    const connCentral = await dbCentral.getConnection();

    const dbFragment1 = await getDB(2);
    const connFragment1 = await dbFragment1.getConnection();

    const dbFragment2 = await getDB(3);
    const connFragment2 = await dbFragment2.getConnection();

    let resultCentral, resultFragment;

    try {
        if (vmid === 1) {
            try {
                await connCentral.beginTransaction();
                
                resultCentral = await addRowToNode(vmid, data, connCentral);
    
                if (data.startYear < 2000) {
                    try {
                        await connFragment1.beginTransaction();
                        resultFragment = await addRowToNode(2, data, connFragment1)
    
                        // This only gets hit if previous succeeded
                        await connFragment1.commit();
                    } catch (error) {
                        console.log("Node 2 rolls back!");
                        await connFragment1.rollback();
                        throw error; // throws error to connCentral catch block
                    }
                } else {
                    try {
                        await connFragment2.beginTransaction();
                        resultFragment = await addRowToNode(3, data, connFragment2)
    
                        // Only gets hit if previous succeeded
                        await connFragment2.commit();
                    } catch (error) {
                        console.log("Node 3 rolls back!");
                        await connFragment2.rollback();
                        throw error; // throws error to connCentral catch block
                    }
                }
    
                await connCentral.commit();
            } catch (error) {
                console.log("Node 1 rolls back!");
                await connCentral.rollback();
                throw error;
            }
        }
    } catch (mainError) {
        throw mainError;
    } finally {
        connCentral.release();
        connFragment1.release();
        connFragment2.release();
    }

    /* try {
        if (vmid === 1) { // Node 1 creates
            connCentral.beginTransaction();
            resultCentral = await addRowToNode(vmid, data, connCentral);
            
            if (data.startYear < 2000) {
                connFragment1.beginTransaction();
                console.log("Adding to node 2!");
                resultFragment = await addRowToNode(2, data, connFragment1);
                connFragment1.commit();
            }
            else {
                console.log("Adding to node 3!");
                resultFragment = await addRowToNode(3, data, connFragment2);
            }
        } else if (vmid === 2) {
            if (data.startYear >= 2000) { // invalid
                console.log("Cannot add to node 2, will add to node 3 instead!");
                resultFragment = await addRowToNode(3, data, connFragment2);
            } else {
                resultFragment = await addRowToNode(2, data, connFragment1);
            }
    
            console.log("Adding to central node next!");
            resultCentral = await addRowToNode(1, data, connCentral);
        } else if (vmid === 3) {
            if (data.startYear < 2000) { // invalid
                console.log("Cannot add to node 3, will add to node 2 instead!");
                resultFragment = await addRowToNode(2, data, connFragment1);
            } else {
                console.log("Adding to node 3!");
                resultFragment = await addRowToNode(3, data, connFragment2);
            }
    
            console.log("Adding to central node next!");
            resultCentral = await addRowToNode(1, data, connCentral);
        }
    } catch (error) {
        console.log("Rolling back from rooute create to node");
        throw error;
    } */


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