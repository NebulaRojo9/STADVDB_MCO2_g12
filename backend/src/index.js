import express from 'express';
import 'dotenv/config';
import titleBasicsRouter from './routes/title_basics.routes.js';
import internalRouter from './routes/internal.routes.js'
import { initDB } from './config/connect.js';
const app = express();
await initDB()

app.use(express.json());
app.use('/title-basics', titleBasicsRouter);
app.use('/internal', internalRouter);

app.get("/", (req,res) => {
    res.send("Server is ready")
})

const port = process.env.PORT
if (port == null) {
    console.error("PORT environment variable is not set.");
    process.exit(1);
}

app.listen(port, () => {
  console.log(`Serve at http://localhost:${port}`);
});
