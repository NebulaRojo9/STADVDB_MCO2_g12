import { getDB } from '../config/connect.js'

export async function findById(id) {
  const pool = await getDB(); // Ensure we await the connection

  const [rows] = await pool.query(
    'SELECT * FROM title_basics WHERE tconst = ?', 
    [id]
  );

  if (rows.length === 0) {
    throw new Error(`Title ${id} does not exist`);
  }
  return rows[0];
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