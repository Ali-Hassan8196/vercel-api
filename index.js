const express = require("express");

const app = express();

app.get('/api',(req,res)=>{
    res.send('Hello vercel!')
})
 app.listen(3000,()=>{
    console.log("Server is running on port 3000");
 })