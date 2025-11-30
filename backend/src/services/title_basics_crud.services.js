import { getDB } from '../config/connect.js'

export async function findById(id) {
  const pool = await getDB(); // Ensure we await the connection

  const [rows] = await pool.query(
    'SELECT * FROM title_basics WHERE Tconst = ?', 
    [id]
  );

  if (rows.length === 0) {
    throw new Error(`Title ${id} does not exist`);
  }
  return rows[0];
}

export async function updateTitle(id, data) {
  const pool = await getDB();

  const columns = Object.keys(data);
  const values = Object.values(data);

  if (columns.includes('Tconst')) {
    throw new Error("Cannot modify Primary Key 'Tconst'");
  }

  const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');

  const sql = `
    UPDATE title_basics
    SET ${setClause}
    WHERE Tconst = ?
  `;

  const params = [...values, id];

  const [result] = await pool.execute(sql, params);
  return result;
}