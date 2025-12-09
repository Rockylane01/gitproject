/**
 * Inlcude dependent classes as variables
 */
const session = require('express-session')
let path = require("path");
const express = require("express");
let bodyParser = require("body-parser"); // allows us to work with html forms
require('dotenv').config(); // Load environment variables from .env file into memory

// Connecting to the database
const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME || "localhost",
        user: process.env.RDS_USERNAME || "postgres",
        password: process.env.RDS_PASSWORD,
        database: process.env.RDS_DB_NAME || "project3",
        port: process.env.RDS_PORT || 5432,
    },
});

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
    // Skip authentication for login/logout routes
    if (req.path === '/login' || req.path === '/logout') {
        return next();
    }

    // Check if user is logged in for all other routes
    if (req.session.isLoggedIn) {
        next(); 
    } 
    else {
        res.render("login", { error_message: "Please log in to access this page" });
    }
});


/**
 * ROUTES
 *  - GET   /
 * 
 *  - GET  /login
 *  - POST  /login
 *  - GET   /logout
 * 
 *  - GET   /users
 *  - GET   /addEditUser
 *  - POST   /addEditUser
 *  - POST   /deleteUser
 * 
 *  - GET   /accounts
 *  - GET   /addEditAccount
 *  - POST   /addEditAccount
 *  - POST   /deleteAccount
 */
// Landing page route - GET
app.get("/", (req, res) => {
    if (req.session.isLoggedIn) {
        res.render("landing");
    }
    else {
        res.render("login", {error_message: "Must be Logged in"});
    }
});

// Login/Logout routes - GET and POST
app.get("/login", (req, res) => {
    res.render("login", { error_message: "" });
});

app.post("/login", (req, res) => {
    let sName = req.body.username;
    let sPassword = req.body.password;

    // Finding credentials in table
    knex("credentials")
        .where("username", sName)
        .andWhere("password", sPassword)
        .first()
        .then(creds => {
            if (!creds) {
                return res.render("login", { error_message: "Invalid login" });
            }

            // Look up matching user
            knex("users")
                .where("uuid", creds.uuid)
                .first()
                .then(user => {
                    if (!user) {
                        return res.render("login", { error_message: "User profile missing" });
                    }

                    // Set session variables
                    req.session.isLoggedIn = true;
                    req.session.username = sName;
                    req.session.uuid = user.uuid;
                    req.session.is_admin = user.is_admin;

                    return res.redirect("/");
                });
        })
        .catch(err => {
            console.error("Login error:", err);
            res.render("login", { error_message: "Invalid login" });
        });
});



app.get("/logout", (req, res) => {
    // Get rid of the session object
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect("/login");
    });
});


// User management routes - GET and POST
app.get("/users", (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.render("login", { error_message: "" });
    }

    if (!req.session.is_admin) {
        return res.status(403).send("Access denied.");
    }

    res.render("users");
});


// Account management routes - GET and POST
app.get("/accounts", (req, res) => {
    const userUUID = req.session.uuid;

    knex("accounts")
        .where("uuid", userUUID)
        .then(accounts => {
            res.render("accounts", { accounts: accounts });
        })
        .catch(err => {
            console.error("Error loading accounts:", err);
            res.render("accounts", { accounts: [] });
        });
});





// the object is listening. index.js is listening
app.listen(port, () => {
    console.log("I am listening");
})
