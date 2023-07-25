const express = require("express");

const app = express();
const port = 3000;

app.use('/',(req,res)=>{
    res.send('Hello vercel!')
})
 app.listen(3000,()=>{
    console.log(`Server is running on port ${port}`);
 })