import { getDB } from '../config/connect.js'

// Has to be fixed for reading data from node 2 that belongs in node 3 (i.e. need to access node 1 pa)
export async function findById(id) {
  const pool = await getDB(); // Ensure we await the connection

  const [rows] = await pool.query(
    'SELECT * FROM title_basics WHERE tconst = ?', 
    [id]
  );

  return rows.length > 0 ? rows[0] : null;
}

// NOTE: This has to be fixed for reading from other nodes as well (if ur reading in the context of 2 and 3)
export async function findAllFromNode() {
  const pool = await getDB(); // Ensure we await the connection

  const [rows] = await pool.query(
    'SELECT * FROM title_basics'
  );

  return rows;
}

export async function canBeCreated(data) {
  const pool = await getDB();

  if (!data.tconst) {
    throw new Error("tconst (primary key) is required");
  }

  // Check if tconst already exists
  const [rows] = await pool.query(
    "SELECT 1 FROM title_basics WHERE tconst = ? LIMIT 1",
    [data.tconst]
  );

  if (rows.length > 0) {
    throw new Error(`Title with tconst ${data.tconst} already exists`);
  }

  return true; // validation passed
}

export async function createTitle(data) {
  const pool = await getDB();

  const columns = Object.keys(data);
  const values = Object.values(data);

  const columnList = columns.map(col => `\`${col}\``).join(', ');
  const placeholders = columns.map(() => '?').join(', ');

  const sql = `
    INSERT INTO title_basics (${columnList})
    VALUES (${placeholders})
  `;

  const [result] = await pool.execute(sql, values);
  return result;
}

export async function updateTitle(id, data) {
  const pool = await getDB();

  const columns = Object.keys(data);
  const values = Object.values(data);

  if (columns.includes('tconst')) {
    throw new Error("Cannot modify Primary Key 'tconst'");
  }

  const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');

  const sql = `
    UPDATE title_basics
    SET ${setClause}
    WHERE tconst = ?
  `;

  const params = [...values, id];

  const [result] = await pool.execute(sql, params);
  return result;
}

export async function deleteTitle(id) {
  const pool = await getDB();

  const sql = `
  DELETE FROM title_basics 
  WHERE tconst = ?`

  const result = await pool.execute(sql, [id])

  return result
}

export async function resetDatabases() {
    const dbCentral = await getDB();

    const dropQuery = `DROP TABLE IF EXISTS title_basics;`;
    
    let result;

    const createQuery = `
        CREATE TABLE title_basics (
            tconst VARCHAR(10) PRIMARY KEY,
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

    return result;
}