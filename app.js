const express = require('express');
const ejs = require('ejs');
var cookies = require("cookie-parser");
var app = express();

app.use(cookies());
app.use(express.json());

app.set('view engine','ejs');

app.use('/',express.static(__dirname+'/static'));
app.use('/auth',require('./routes/auth_page'));
app.use('/',require('./routes/route_page'));


app.listen(1275,()=>{
    console.log("Connected at ","http://127.0.0.1:1275");
})