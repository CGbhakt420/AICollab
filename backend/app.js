
import express from "express";
import morgan from "morgan";
import connect from "./db/db.js";
import router from "./routes/user.routes.js";

connect();
const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

app.use('/users', router)

app.get('/', (req, res)=>{
    res.send("Hello");
})

export default app;

