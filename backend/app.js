
import express from "express";
import morgan from "morgan";
import connect from "./db/db.js";
import router from "./routes/user.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import projectRouter from "./routes/project.routes.js"
import aiRouter from "./routes/ai.routes.js"

connect();
const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cookieParser());
app.use('/users', router)
app.use('/projects', projectRouter);
app.use('/ai', aiRouter);

app.get('/', (req, res)=>{
    res.send("Hello");
})

export default app;

