// Load environment variables from .env file into memory
require('dotenv').config();

const express = require("express");

// needed for the session variable
const session = require('express-session')

let path = require("path");

// allows us to work with html forms
let bodyParser = require("body-parser");

// make expres object
let app = express();

// look in the views directory for ejs files
app.set("view engine", "ejs")

// create a variable for port
const port = process.env.PORT || 3000;


// app.use(session({
//     secret: process.env.SESSION_SECRET || 'fallback-secret-key',
//     resave: false,
//     saveUninitialized: false,
// }));

app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

// global authentication middleware - runs on every request
// app.use((req, res, next) => {
//     // skip authentication for login routes
//     if (req.path === '/' || req.path === '/login' || req.path === '/logout') {
//         // continue with the request path
//         return next();
//     }

//     // check if user is logged in for all routes
//     if (req.session.isLoggedIn) {
//         // notice no return because nothing below it
//         next(); // user is logged in, continue
//     } else {
//         res.render('login', {error_message: "Please log in to access this page"});
//     }
// });


// get method to get req and res. Sends message to client and puts it on page
app.get("/", (req, res) => {
    res.render("landing");
})

// the object is listening. index.js is listening
app.listen(port, () => {
    console.log("I am listening");
})
