const express = require("express");


const cors = require("cors");
const dotenv = require("dotenv")

dotenv.config();

const rootRouter = require("./routes/index");
const { PORT } = require('./config');



const app = express();



app.use(cors());
app.use(express.json());

app.use("/api/v1", rootRouter);

app.listen(PORT, () => {
    console.log(`Server listening at ${PORT}`)
})