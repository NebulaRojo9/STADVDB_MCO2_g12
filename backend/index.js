import express from 'express';
import 'dotenv/config';
import { initDB, getDB, closeDB } from './config/connect.js';

const app = express();

app.get('/', (req, res) => {
  res.send('Server is ready');
});

app.get('/init-db', async (req, res) => {
  try {
    await initDB();
    res.status(200).send('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error: ', err);
    res.status(500).send('Database initialization failed');
  }
});

app.get('/view-db1', async (req, res) => {
  try {
    const db = await getDB(1);
    const [title_basics] = await db.query('SELECT * FROM title_basics');
    console.log(title_basics);
    res.status(200).send('Database connection is active');
  } catch (err) {
    console.error('Database retrieval error: ', err);
    res.status(500).send('Failed to retrieve database connection');
  }
});

app.get('/view-db2', async (req, res) => {
  try {
    const db = await getDB(2);
    const [title_basics] = await db.query('SELECT * FROM title_basics');
    console.log(title_basics);
    res.status(200).send('Database connection is active');
  } catch (err) {
    console.error('Database retrieval error: ', err);
    res.status(500).send('Failed to retrieve database connection');
  }
});

app.get('/view-db3', async (req, res) => {
  try {
    const db = await getDB(3);
    const [title_basics] = await db.query('SELECT * FROM title_basics');
    console.log(title_basics);
    res.status(200).send('Database connection is active');
  } catch (err) {
    console.error('Database retrieval error: ', err);
    res.status(500).send('Failed to retrieve database connection');
  }
});

app.get('/close-db', async (req, res) => {
  try {
    await closeDB();
    res.status(200).send('Database connection closed successfully');
  } catch (err) {
    console.error('Database closure error: ', err);
    res.status(500).send('Database closure failed');
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Serve at http://localhost:${port}`);
});
