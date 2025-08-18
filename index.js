import express from "express";
import cookie from "cookie-parser"
import { dbConnection } from "./db/dbconnection.js";
import router from "./route/routes.js";


const app=express();
app.use(express.json());
app.use(cookie())
app.use("/api",router);


dbConnection("db2","postgres","12345")
app.listen(8081,()=>{
    console.log("Server is running at port 8081")
})