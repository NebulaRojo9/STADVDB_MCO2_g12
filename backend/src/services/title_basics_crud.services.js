import { getDB } from '../config/connect.js'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const SCHEMA = {
  tconst: { type: 'string', max: 10 },
  titleType: { type: 'string', max: 50 },
  primaryTitle: { type: 'string', max: 255 },
  originalTitle: { type: 'string', max: 255 },
  isAdult: { type: 'boolean' },
  startYear: { type: 'number', min: 1800, max: 2100 },
  endYear: { type: 'number', min: 1800, max: 2100 },
  runtimeMinutes: { type: 'number', min: 0 },
  genres: { type: 'string', max: 255 }
};

function validateDataRules(data) {
  for (const [key, value] of Object.entries(data)) {
    // Skip fields not in schema (or throw error if you want strict mode)
    const rule = SCHEMA[key];
    if (!rule) continue; 

    // 1. Check Type
    // Note: typeof null is 'object', so we handle nulls if allowed
    if (value !== null && value !== undefined) {
        if (rule.type === 'number') {
             const num = Number(value);
             if (isNaN(num)) throw new Error(`Validation: '${key}' must be a number`);
             if (rule.min !== undefined && num < rule.min) throw new Error(`Validation: '${key}' must be >= ${rule.min}`);
             if (rule.max !== undefined && num > rule.max) throw new Error(`Validation: '${key}' must be <= ${rule.max}`);
        } else if (typeof value !== rule.type) {
             throw new Error(`Validation: '${key}' must be a ${rule.type}`);
        }
    }

    // 2. Check Length (Strings)
    if (rule.type === 'string' && value) {
        if (rule.max && value.length > rule.max) {
            throw new Error(`Validation: '${key}' exceeds max length of ${rule.max}`);
        }
    }
  }
}

export async function findById(id, delay = 0) {
  const pool = await getDB();
  if (delay > 0) await sleep(delay);
  const [rows] = await pool.query('SELECT * FROM title_basics WHERE tconst = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
}

export async function findAllFromNode() {
  const pool = await getDB();
  const [rows] = await pool.query('SELECT * FROM title_basics');
  return rows;
}

export async function canBeCreated(data, delay = 0) {
  const pool = await getDB();
  if (delay > 0) await sleep(delay);

  const { delay: _ignored, ...dbData } = data || {};

  // A. Check Required Fields (Specific to Create)
  const REQUIRED = ['tconst', 'primaryTitle', 'startYear'];
  for (const field of REQUIRED) {
    if (!dbData[field] && dbData[field] !== 0 && dbData[field] !== false) {
      throw new Error(`Validation: Missing required field '${field}'`);
    }
  }

  // B. Run Shared Rules (Length, Type, etc.)
  validateDataRules(dbData);

  // C. Check Duplicates (Database)
  const [rows] = await pool.query(
    "SELECT 1 FROM title_basics WHERE tconst = ? LIMIT 1",
    [dbData.tconst]
  );

  if (rows.length > 0) {
    throw new Error(`Title with tconst ${dbData.tconst} already exists`);
  }

  return true;
}

export async function createTitle(data, delay = 0) {
  const pool = await getDB();
  if (delay > 0) await sleep(delay);

  const { delay: _ignored, ...dbData } = data || {};
  if (Object.keys(dbData).length === 0) return;

  const columns = Object.keys(dbData);
  const values = Object.values(dbData);
  const columnList = columns.map(col => `\`${col}\``).join(', ');
  const placeholders = columns.map(() => '?').join(', ');

  const sql = `INSERT INTO title_basics (${columnList}) VALUES (${placeholders})`;
  return await pool.execute(sql, values);
}

export async function updateTitle(id, data, delay = 0) {
  const pool = await getDB();
  if (delay > 0) await sleep(delay);

  const { delay: _ignored, ...dbData } = data || {};
  if (Object.keys(dbData).length === 0) return;

  // A. Check Prohibited Actions (Specific to Update)
  if (dbData.tconst) {
    throw new Error("Cannot modify Primary Key 'tconst'");
  }

  // B. Run Shared Rules
  // This ensures updated fields are also valid!
  validateDataRules(dbData);

  const columns = Object.keys(dbData);
  const values = Object.values(dbData);
  const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');

  const sql = `UPDATE title_basics SET ${setClause} WHERE tconst = ?`;
  const params = [...values, id]; // id is the WHERE clause

  return await pool.execute(sql, params);
}

export async function deleteTitle(id, delay = 0) {
  const pool = await getDB();
  if (delay > 0) await sleep(delay);
  return await pool.execute(`DELETE FROM title_basics WHERE tconst = ?`, [id]);
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