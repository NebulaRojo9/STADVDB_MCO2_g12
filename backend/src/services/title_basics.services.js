import { initDB, getDB } from '../config/connect.js';

// GET '/title-basics/init'
export async function init() {
    // This function can be used to perform any initialization logic if needed
    await initDB();
    return;
}

// GET '/title-basics/:vmid'
export async function getAll(vmid) {
    const db = await getDB(vmid);
    const [title_basics] = await db.query('SELECT * FROM title_basics');
    
    return title_basics
}

// POST '/addRow'
export async function addRow(data) {
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
    
    const dbCentral = await getDB(1);

    const connCentral = await dbCentral.getConnection();
    try {
        await connCentral.beginTransaction();

        const [rows] = await connCentral.execute(
            `INSERT INTO title_basics (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres]
        )

        await connCentral.commit();
    } catch (error) {
        await connCentral.rollback();
        throw error;
    } finally {
        connCentral.release();
    }

    let vmid;

    // Perform fragmentation here
    if (startYear < 2000) {
        vmid = 2;
    } else {
        vmid = 3;
    }

    const dbFragment = await getDB(vmid);

    const connFragment = await dbFragment.getConnection();

    try {
        await connFragment.beginTransaction();

        const [rows] = await connFragment.execute(
            `INSERT INTO title_basics (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres]
        )

        await connFragment.commit();

        return rows
    } catch (error) {
        await connFragment.rollback();
        throw error;
    } finally {
        connFragment.release();
    }
}

// PUT '/vm/:vmid/update/:id'
export async function updateRowByID(vmid, id, updates) {
    const db = await getDB(vmid);

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

    const [result] = await db.execute(
        `UPDATE title_basics SET \`${column}\` = ? WHERE Tconst = ?`,
        [value, id]
    )

    return result
}