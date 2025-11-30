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
export async function updateRowByIDInNode(vmid, id, updates, conn) {
    const allowedColumns = [
        'titleType',
        'primaryTitle',
        'originalTitle',
        'isAdult',
        'runtimeMinutes',
        'genres'
    ];

    randomizeNodeFailure(vmid);

    try {
        if (!nodeStatus[vmid]) {
            throw new Error(`Node ${vmid} is currently offline.`);
        }
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
    
        return result;
    } catch (error) {
        console.log("Rolling back from updateRowByIDInNode");
        simulateNodeRecovery(vmid);

        throw error;
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

export async function resetDatabases() {
    const dbCentral = await getDB(1);
    const dbFragment1 = await getDB(2);
    const dbFragment2 = await getDB(3);

    const dropQuery = `DROP TABLE IF EXISTS title_basics;`;
    
    let result;

    const createQuery = `
        CREATE TABLE title_basics (
            Tconst VARCHAR(10) PRIMARY KEY,
            titleType VARCHAR(50), 
            primaryTitle VARCHAR(255), 
            originalTitle VARCHAR(255), 
            isAdult BOOLEAN, 
            startYear INT, 
            endYear INT, 
            runtimeMinutes INT, 
            genres VARCHAR(255)
        );`;

    try {
        result = await dbCentral.query(dropQuery);
        result = await dbCentral.query(createQuery);
    } catch (error) {
        throw error;
    }

    try {
        result = await dbFragment1.query(dropQuery);
        result = await dbFragment1.query(createQuery);
    } catch (error) {
        throw error;
    }

    try {
        result = await dbFragment2.query(dropQuery);
        result = await dbFragment2.query(createQuery);
    } catch (error) {
        throw error;
    }

    return result;
}

export async function routeCreateFromCentral(data) {
    // Initialize connections HERE rather than in the add row functions
    const dbCentral = await getDB(1);
    const connCentral = await dbCentral.getConnection();

    const dbFragment1 = await getDB(2);
    const connFragment1 = await dbFragment1.getConnection();

    const dbFragment2 = await getDB(3);
    const connFragment2 = await dbFragment2.getConnection();

    let resultCentral, resultFragment;

    try {
        await connCentral.beginTransaction();
        
        resultCentral = await addRowToNode(1, data, connCentral);

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
    } catch (mainError) {
        console.log("Node 1 rolls back!");
        await connCentral.rollback();
        throw mainError;
    }

    return { central: resultCentral, node: resultFragment };
}

export async function routeCreateFromFragment1(data) {
    const dbCentral = await getDB(1);
    const connCentral = await dbCentral.getConnection();

    const dbFragment1 = await getDB(2);
    const connFragment1 = await dbFragment1.getConnection();

    const dbFragment2 = await getDB(3);
    const connFragment2 = await dbFragment2.getConnection();

    let resultCentral, resultFragment;

    try {
        await connFragment1.beginTransaction();

        if (data.startYear < 2000) { // if data is going to node 2 talaga, then proceed as normal!
            resultFragment = await addRowToNode(2, data, connFragment1);

            try {
                await connCentral.beginTransaction();

                resultCentral = await addRowToNode(1, data, connCentral);

                await connCentral.commit();
            } catch (error) {
                console.log("Node 1 rolls back!");
                await connCentral.rollback();
                throw error;
            }
        } else { // data is not actually going to node 2 pala
            try { // node 3 first
                await connFragment2.beginTransaction();

                resultFragment = await addRowToNode(3, data, connFragment2);

                try { // node 1 last
                    await connCentral.beginTransaction();

                    resultCentral = await addRowToNode(1, data, connCentral);

                    await connCentral.commit();
                } catch (error) {
                    console.log("Node 1 rolls back!");
                    await connCentral.rollback();
                    throw error;
                }

                await connFragment2.commit();
            } catch (error) {
                console.log("Node 3 rolls back!");
                await connFragment2.rollback();
                throw error;
            }
        }

        await connFragment1.commit();
    } catch (mainError) {
        console.log("Node 2 rolls back!");
        await connFragment1.rollback();
        throw mainError;
    }

    return { central: resultCentral, node: resultFragment };
}

export async function routeCreateFromFragment2(data) {
    // Initialize connections HERE rather than in the add row functions
    const dbCentral = await getDB(1);
    const connCentral = await dbCentral.getConnection();

    const dbFragment1 = await getDB(2);
    const connFragment1 = await dbFragment1.getConnection();

    const dbFragment2 = await getDB(3);
    const connFragment2 = await dbFragment2.getConnection();

    let resultCentral, resultFragment;

    try {
        await connFragment2.beginTransaction();

        if (data.startYear < 2000) { // if data is not going into node 3, go node 2 then node 1
            try {
                await connFragment1.beginTransaction();

                resultFragment = await addRowToNode(2, data, connFragment1);

                try { // node 1 for last
                    await connCentral.beginTransaction();

                    resultCentral = await addRowToNode(1, data, connCentral);

                    await connCentral.commit();
                } catch(error) {
                    console.log("Node 1 rolls back!");
                    await connCentral.rollback();
                    throw error;
                }

                await connFragment1.commit();
            } catch (error) {
                console.log("Node 2 rolls back!");
                await connFragment1.rollback();
                throw error;
            }
        } else { // data is going into node 3! so do node 3 -> node 1
            resultFragment = await addRowToNode(3, data, connFragment2);

            try { // node 1 for last
                await connCentral.beginTransaction();

                resultCentral = await addRowToNode(1, data, connCentral);

                await connCentral.commit();
            } catch(error) {
                console.log("Node 1 rolls back!");
                await connCentral.rollback();
                throw error;
            }
        }

        await connFragment2.commit();
    } catch (mainError) {
        console.log("Node 3 rolls back!");
        await connFragment2.rollback();
        throw mainError;
    }

    return { central: resultCentral, node: resultFragment };
}

/* // POST '/:vmid/routeCreate'
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
        } else if (vmid === 2) {
            try {
                await connFragment1.beginTransaction();

                if (data.startYear < 2000) { // if data is going to node 2 talaga, then proceed as normal!
                    resultFragment = await addRowToNode(2, data, connFragment1);

                    try {
                        await connCentral.beginTransaction();

                        resultCentral = await addRowToNode(1, data, connCentral);

                        await connCentral.commit();
                    } catch (error) {
                        console.log("Node 1 rolls back!");
                        await connCentral.rollback();
                        throw error;
                    }
                } else { // data is not actually going to node 2 pala
                    try { // node 3 first
                        await connFragment2.beginTransaction();

                        resultFragment = await addRowToNode(3, data, connFragment2);

                        try { // node 1 last
                            await connCentral.beginTransaction();

                            resultCentral = await addRowToNode(1, data, connCentral);

                            await connCentral.commit();
                        } catch (error) {
                            console.log("Node 1 rolls back!");
                            await connCentral.rollback();
                            throw error;
                        }

                        await connFragment2.commit();
                    } catch (error) {
                        console.log("Node 3 rolls back!");
                        await connFragment2.rollback();
                        throw error;
                    }
                }

                await connFragment1.commit();
            } catch (error) {
                console.log("Node 2 rolls back!");
                await connFragment1.rollback();
                throw error;
            }
        } else if (vmid === 3) {
            try {
                await connFragment2.beginTransaction();

                if (data.startYear < 2000) { // if data is not going into node 3, go node 2 then node 1
                    try {
                        await connFragment1.beginTransaction();

                        resultFragment = await addRowToNode(2, data, connFragment1);

                        try { // node 1 for last
                            await connCentral.beginTransaction();

                            resultCentral = await addRowToNode(1, data, connCentral);

                            await connCentral.commit();
                        } catch(error) {
                            console.log("Node 1 rolls back!");
                            await connCentral.rollback();
                            throw error;
                        }

                        await connFragment1.commit();
                    } catch (error) {
                        console.log("Node 2 rolls back!");
                        await connFragment1.rollback();
                        throw error;
                    }
                } else { // data is going into node 3! so do node 3 -> node 1
                    resultFragment = await addRowToNode(3, data, connFragment2);

                    try { // node 1 for last
                        await connCentral.beginTransaction();

                        resultCentral = await addRowToNode(1, data, connCentral);

                        await connCentral.commit();
                    } catch(error) {
                        console.log("Node 1 rolls back!");
                        await connCentral.rollback();
                        throw error;
                    }
                }

                await connFragment2.commit();
            } catch (error) {
                console.log("Node 3 rolls back!");
                await connFragment2.rollback();
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

    return { central: resultCentral, node: resultFragment };
} */

export async function routeUpdateFromCentral(id, startYear, updates) {
    // Initialize connections HERE rather than in the add row functions
    const dbCentral = await getDB(1);
    const connCentral = await dbCentral.getConnection();

    const dbFragment1 = await getDB(2);
    const connFragment1 = await dbFragment1.getConnection();

    const dbFragment2 = await getDB(3);
    const connFragment2 = await dbFragment2.getConnection();

    let resultCentral, resultFragment;

    try {
        await connCentral.beginTransaction();
        
        resultCentral = await updateRowByIDInNode(1, id, updates, connCentral);

        if (startYear < 2000) {
            try {
                await connFragment1.beginTransaction();
                resultFragment = await updateRowByIDInNode(2, id, updates, connFragment1)

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
                resultFragment = await updateRowByIDInNode(3, id, updates, connFragment2)

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
    } finally {
        await connCentral.release();
        await connFragment1.release();
        await connFragment2.release();
    }

    return { central: resultCentral, node: resultFragment };
}

export async function routeUpdateFromFragment1(id, startYear, updates) { 
    // Initialize connections HERE rather than in the add row functions
    const dbCentral = await getDB(1);
    const connCentral = await dbCentral.getConnection();

    const dbFragment1 = await getDB(2);
    const connFragment1 = await dbFragment1.getConnection();

    const dbFragment2 = await getDB(3);
    const connFragment2 = await dbFragment2.getConnection();

    let resultCentral, resultFragment;

    try {
        await connFragment1.beginTransaction();

        if (startYear < 2000) { // if data is going to node 2 talaga, then proceed as normal!
            resultFragment = await updateRowByIDInNode(2, id, updates, connFragment1);

            try {
                await connCentral.beginTransaction();

                resultCentral = await updateRowByIDInNode(1, id, updates, connCentral);

                await connCentral.commit();
            } catch (error) {
                console.log("Node 1 rolls back!");
                await connCentral.rollback();
                throw error;
            }
        } else { // data is not actually going to node 2 pala
            try { // node 3 first
                await connFragment2.beginTransaction();

                resultFragment = await updateRowByIDInNode(3, id, updates, connFragment2);

                try { // node 1 last
                    await connCentral.beginTransaction();

                    resultCentral = await updateRowByIDInNode(1, id, updates, connCentral);

                    await connCentral.commit();
                } catch (error) {
                    console.log("Node 1 rolls back!");
                    await connCentral.rollback();
                    throw error;
                }

                await connFragment2.commit();
            } catch (error) {
                console.log("Node 3 rolls back!");
                await connFragment2.rollback();
                throw error;
            }
        }

        await connFragment1.commit();
    } catch (error) {
        console.log("Node 2 rolls back!");
        await connFragment1.rollback();
        throw error;
    } finally {
        await connCentral.release();
        await connFragment1.release();
        await connFragment2.release();
    }

    return { central: resultCentral, node: resultFragment };
}

export async function routeUpdateFromFragment2(id, startYear, updates) {
    // Initialize connections HERE rather than in the add row functions
    const dbCentral = await getDB(1);
    const connCentral = await dbCentral.getConnection();

    const dbFragment1 = await getDB(2);
    const connFragment1 = await dbFragment1.getConnection();

    const dbFragment2 = await getDB(3);
    const connFragment2 = await dbFragment2.getConnection();

    let resultCentral, resultFragment;

    try {
        await connFragment2.beginTransaction();

        if (startYear < 2000) { // if data is not going into node 3, go node 2 then node 1
            try {
                await connFragment1.beginTransaction();

                resultFragment = await updateRowByIDInNode(2, id, updates, connFragment1);

                try { // node 1 for last
                    await connCentral.beginTransaction();

                    resultCentral = await updateRowByIDInNode(1, id, updates, connCentral);

                    await connCentral.commit();
                } catch(error) {
                    console.log("Node 1 rolls back!");
                    await connCentral.rollback();
                    throw error;
                }

                await connFragment1.commit();
            } catch (error) {
                console.log("Node 2 rolls back!");
                await connFragment1.rollback();
                throw error;
            }
        } else { // data is going into node 3! so do node 3 -> node 1
            resultFragment = await updateRowByIDInNode(3, id, updates, connFragment2);

            try { // node 1 for last
                await connCentral.beginTransaction();

                resultCentral = await updateRowByIDInNode(1, id, updates, connCentral);

                await connCentral.commit();
            } catch(error) {
                console.log("Node 1 rolls back!");
                await connCentral.rollback();
                throw error;
            }
        }

        await connFragment2.commit();
    } catch (error) {
        console.log("Node 3 rolls back!");
        await connFragment2.rollback();
        throw error;
    } finally {
        connCentral.release();
        connFragment1.release();
        connFragment2.release();
    }

    return { central: resultCentral, node: resultFragment };
}

// PUT '/:vmid/routeUpdate/:id/:startYear'
/* export async function routeUpdateToNode(vmid, id, updates) {
    // check vmid and see if it should go to node 2 or 3
    // copy it to node 1 regardless
    console.log(`Routing this update request: ${vmid}`);

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
                
                resultCentral = await updateRowByIDInNode(1, id, updates, connCentral);
    
                if (updates.startYear < 2000) {
                    try {
                        await connFragment1.beginTransaction();
                        resultFragment = await updateRowByIDInNode(2, id, updates, connFragment1)
    
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
                        resultFragment = await updateRowByIDInNode(3, id, updates, connFragment2)
    
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
        } else if (vmid === 2) {
            try {
                await connFragment1.beginTransaction();

                if (updates.startYear < 2000) { // if data is going to node 2 talaga, then proceed as normal!
                    resultFragment = await updateRowByIDInNode(2, id, updates, connFragment1);

                    try {
                        await connCentral.beginTransaction();

                        resultCentral = await updateRowByIDInNode(1, id, updates, connCentral);

                        await connCentral.commit();
                    } catch (error) {
                        console.log("Node 1 rolls back!");
                        await connCentral.rollback();
                        throw error();
                    }
                } else { // data is not actually going to node 2 pala
                    try { // node 3 first
                        await connFragment2.beginTransaction();

                        resultFragment = await updateRowByIDInNode(3, id, updates, connFragment2);

                        try { // node 1 last
                            await connCentral.beginTransaction();

                            resultCentral = await updateRowByIDInNode(1, id, updates, connCentral);

                            await connCentral.commit();
                        } catch (error) {
                            console.log("Node 1 rolls back!");
                            await connCentral.rollback();
                            throw error;
                        }

                        await connFragment2.commit();
                    } catch (error) {
                        console.log("Node 3 rolls back!");
                        await connFragment2.rollback();
                        throw error;
                    }
                }

                await connFragment1.commit();
            } catch (error) {
                console.log("Node 2 rolls back!");
                await connFragment1.rollback();
                throw error;
            }
        } else if (vmid === 3) {
            try {
                await connFragment2.beginTransaction();

                if (updates.startYear < 2000) { // if data is not going into node 3, go node 2 then node 1
                    try {
                        await connFragment1.beginTransaction();

                        resultFragment = await updateRowByIDInNode(2, id, updates, connCentral);

                        try { // node 1 for last
                            await connCentral.beginTransaction();

                            resultCentral = await updateRowByIDInNode(1, id, updates, connCentral);

                            await connCentral.commit();
                        } catch(error) {
                            console.log("Node 1 rolls back!");
                            await connCentral.rollback();
                            throw error;
                        }

                        await connFragment1.commit();
                    } catch (error) {
                        console.log("Node 2 rolls back!");
                        await connFragment1.rollback();
                        throw error;
                    }
                } else { // data is going into node 3! so do node 3 -> node 1
                    resultFragment = await updateRowByIDInNode(3, id, updates, connFragment2);

                    try { // node 1 for last
                        await connCentral.beginTransaction();

                        resultCentral = await updateRowByIDInNode(1, id, updates, connCentral);

                        await connCentral.commit();
                    } catch(error) {
                        console.log("Node 1 rolls back!");
                        await connCentral.rollback();
                        throw error;
                    }
                }

                await connFragment2.commit();
            } catch (error) {
                console.log("Node 3 rolls back!");
                await connFragment2.rollback();
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

    return { central: resultCentral, node: resultFragment };
} */