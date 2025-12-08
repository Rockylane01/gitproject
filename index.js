/**
 * Inlcude dependent classes as variables
 */
const session = require('express-session')
let path = require("path");
const express = require("express");
let bodyParser = require("body-parser"); // allows us to work with html forms
require('dotenv').config(); // Load environment variables from .env file into memory

// make expres object
let app = express();

// look in the views directory for ejs files
app.set("view engine", "ejs")

// create a variable for port
const port = process.env.PORT || 3000;

/**
 * Set app "use" information
 */
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
}));

app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

// global authentication middleware - runs on every request
app.use((req, res, next) => {
//     // skip authentication for login routes
    if (req.path === '/login' || req.path === '/logout') {
        // continue with the request path
        return next();
    }

    req.session.isLoggedIn = true;
    next();
    // check if user is logged in for all routes
    // if (req.session.isLoggedIn) {
    //     // notice no return because nothing below it
    //     next(); // user is logged in, continue
    // } else {
    //     res.render('login', {error_message: "Please log in to access this page"});
    // }
});

/**
 * ROUTES
 *  - GET   /
 *  - GET  /login
 *  - POST  /login
 *  - GET   /logout
 *  - GET   /users
 * 
 * 
 */

app.get("/", (req, res) => {
    if (req.session.isLoggedIn) {
        res.render("landing");
    }
    else {
        res.render("login", {error_message: "Must be Logged in"});
    }
});

app.post("/login", (req, res) => {
    // let username = req.body.username;
    // let password = req.body.password;
    const {username, password} = req.body;

    knex("users")
        .where({username: username, password: password})
        .then(user => {
            if (user.length > 0) {
                req.session.isLoggedIn = true;
                req.session.username = username;
                res.redirect("/");
            }
            else {
                // No matching user found
                res.render("login", { error_message: "Invalid login" });
            }
        })
        .catch(err => {
            console.error("Login error:", err);
            res.render("login", { error_message: "Error loging in" });
        });
});

// Logout route
app.get("/logout", (req, res) => {
    // Get rid of the session object
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect("/");
    });
});

app.get("/users", (req, res) => {
    res.render("users");
})

// the object is listening. index.js is listening
app.listen(port, () => {
    console.log("I am listening");
})
