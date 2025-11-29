import { initDB, getDB } from '../config/connect.js';

// GET '/title-basics/init'
export async function init() {
    // This function can be used to perform any initialization logic if needed
    await initDB();
    return;
}

// GET '/title-basics/:vmid/getAll'
export async function getAll(vmid) {
    const db = await getDB(vmid);
    const [title_basics] = await db.query('SELECT * FROM title_basics');
    
    return title_basics
}

// POST '/:vmid/create'
export async function addRow(vmid, data) {
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
export async function updateRowByID(vmid, id, updates) {
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