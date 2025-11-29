import { initDB, getDB } from '../config/connect.js';

// GET '/title-basics/init'
export async function init() {
    // This function can be used to perform any initialization logic if needed
    await initDB();
    return;
}

// GET '/title-basics/:vmid/getAll'
export async function getAllFromNode(vmid) {
    const db = await getDB(vmid);
    const [title_basics] = await db.query('SELECT * FROM title_basics');
    
    return title_basics
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

    try {
        await conn.beginTransaction();

        const [rows] = await conn.execute(
            `INSERT INTO title_basics (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres]
        )

        await conn.commit();
    } catch (error) {
        await conn.rollback();
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
        await conn.rollback();
        throw error;
    } finally {
        await conn.release();
    }
}

export async function routeCreateToNode(vmid, data) {
    // check vmid and see if it should go to node 2 or 3
    // copy it to node 1 regardless

    const resultCentral = await addRowToNode(1, data);

    if (vmid === 2 || vmid === 3) {
        const resultFragment = await addRowToNode(vmid, data);

        return { central: resultCentral, node: resultFragment };
    }
}

export async function routeUpdateToNode(vmid, id, updates) {
    // check vmid and see if it should go to node 2 or 3
    // copy it to node 1 regardless

    const resultCentral = await updateRowByIDInNode(1, id, updates);

    if (vmid === 2 || vmid === 3) {
        const resultFragment = await updateRowByIDInNode(vmid, id, updates);
        return { central: resultCentral, node: resultFragment };
    }
}