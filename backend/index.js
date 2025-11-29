import express from 'express'
import 'dotenv/config';
import { initDB, getDB, closeDB } from './config/connect.js';
import titleBasicsRouter from './title_basics.routes.js';

const app = express()

app.use(express.json());
app.use('/title-basics', titleBasicsRouter);

app.get("/", (req,res) => {
    res.send("Server is ready")
})

const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`Serve at http://localhost:${port}`)
})