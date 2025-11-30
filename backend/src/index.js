import express from 'express';
import 'dotenv/config';
import titleBasicsRouter from './routes/title_basics.routes.js';

const app = express();

app.use(express.json());
app.use('/title-basics', titleBasicsRouter);

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
