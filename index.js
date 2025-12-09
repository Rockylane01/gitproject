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

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const knex = require('knex')({
    client: 'pg',
    connection: {
        host: process.env.RDS_HOSTNAME,
        port: process.env.RDS_PORT,
        user: process.env.RDS_USERNAME,
        password: process.env.RDS_PASSWORD,
        database: process.env.RDS_DB_NAME,
        ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
    }
});

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

// Make session visible in ALL EJS files (including partials)
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// global authentication middleware
app.use((req, res, next) => {
    if (req.path === '/login' || req.path === '/logout') {
        return next();
    }

    if (req.session.isLoggedIn) {
        next();
    } else {
        res.render('login', { error_message: "Please log in to access this page" });
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
// Landing page route - GET
// Landing page route - GET
app.get("/", (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.render("login", { error_message: "Must be Logged in" });
    }

    const search = req.query.search;

    // Step 1 — Get user's uuid + name
    knex("credentials")
        .select("credentials.uuid", "users.first_name", "users.last_name", "users.uuid")
        .join("users", "credentials.uuid", "users.uuid")
        .where({ username: req.session.username })
        .first()
        .then(user => {
            if (!user) {
                return res.render("login", { error_message: "User not found" });
            }

            // Step 2 — Get user's accounts
            return knex("accounts")
                .select("accountid", "acct_name", "balance")
                .where({ uuid: user.uuid })
                .then(accounts => {

                    // Step 3 — Build transaction query
                    let txQuery = knex("transactions")
                        .select(
                            "transactions.transactionid",
                            "transactions.amount",
                            "transactions.description",
                            "transactions.date",
                            "acct_from.acct_name as from_account",
                            "acct_to.acct_name as to_account"
                        )
                        .leftJoin("accounts as acct_from", "transactions.acct_from", "acct_from.accountid")
                        .leftJoin("accounts as acct_to", "transactions.acct_to", "acct_to.accountid")
                        .where("transactions.uuid", user.uuid);

                    // If search is used, filter results
                    if (search && search.trim() !== "") {
                        txQuery = txQuery.andWhere(function () {
                            this.where("transactions.description", "ilike", `%${search}%`)
                                .orWhere("acct_from.acct_name", "ilike", `%${search}%`)
                                .orWhere("acct_to.acct_name", "ilike", `%${search}%`);
                        });
                    } else {
                        // Default: show last 10 newest transactions
                        txQuery = txQuery.orderBy("transactions.date", "desc").limit(10);
                    }
                    
                    // Step 4 — Execute transaction query
                    return txQuery.then(transactions => {
                        let monthlyIncome = 0;
                        let monthlyExpenses = 0;

                        transactions.forEach(tx => {
                            if (tx.to_account) monthlyIncome += parseFloat(tx.amount);
                            if (tx.from_account) monthlyExpenses += parseFloat(tx.amount);
                        });

                        const net = monthlyIncome - monthlyExpenses;

                        // Step 5 — Render
                        res.render("landing", {
                            user,
                            accounts,
                            transactions,
                            monthlyIncome: monthlyIncome.toFixed(2),
                            monthlyExpenses: monthlyExpenses.toFixed(2),
                            net: net.toFixed(2),
                            search: search || ""
                        });
                    });
                });
        })
        .catch(err => {
            console.error("Error loading dashboard:", err);
            res.render("landing", {
                user: { first_name: "User", last_name: "" },
                accounts: [],
                transactions: [],
                monthlyIncome: "0.00",
                monthlyExpenses: "0.00",
                net: "0.00",
                error_message: "Error loading dashboard data",
                search: ""
            });
        });
});


// Login/Logout routes - GET and POST
app.get("/login", (req, res) => {
    res.render("login", {error_message: ""});
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    knex("credentials as c")
        .join("users as u", "c.uuid", "u.uuid")
        .select("c.uuid", "c.username", "u.is_admin")
        .where({ "c.username": username, "c.password": password })
        .first()
        .then(row => {
            if (row) {
                console.log("Login successful");

                req.session.isLoggedIn = true;
                req.session.username = row.username;
                req.session.uuid = row.uuid;
                req.session.isadmin = row.is_admin;

                res.redirect("/");
            } else {
                res.render("login", { error_message: "Invalid login" });
            }
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
    knex.select("users.uuid", "users.first_name", "users.last_name", "users.email", "credentials.username")
        .from("users")
        .leftJoin("credentials", "users.uuid", "credentials.uuid")
        .then(users => {
            res.render("users", { users, session: req.session });
        })
        .catch(err => {
            console.error("Error getting users:", err);
            res.render("users", { error_message: "Error getting users" });
        });
});

app.get("/addEditUser", (req, res) => {
    const { uuid } = req.query;

    if (uuid) {
        // Editing existing user
        knex.select("users.uuid", "users.first_name", "users.last_name", "users.email", "credentials.username", "credentials.password")
            .from("users")
            .leftJoin("credentials", "users.uuid", "credentials.uuid")
            .where({ "users.uuid": uuid })
            .first()
            .then(user => {
                if (!user) {
                    return res.redirect("/users");
                }
                res.render("addEditUser", { user: user });
            })
            .catch(err => {
                console.error("Error getting user:", err);
                res.redirect("/users");
            });
    } else {
        // New user
        res.render("addEditUser", { user: null });
    }
});

app.post("/addEditUser", (req, res) => {
    const { uuid, first_name, last_name, email, username, password } = req.body;

    if (uuid) {
        // Update existing user
        knex("users")
            .where({ uuid: uuid })
            .update({ first_name, last_name, email })
            .then(() => {
                // Also update credentials if username/password provided
                if (username || password) {
                    const updateData = {};
                    if (username) updateData.username = username;
                    if (password) updateData.password = password;

                    return knex("credentials")
                        .where({ uuid: uuid })
                        .update(updateData);
                }
            })
            .then(() => {
                res.redirect("/users");
            })
            .catch(err => {
                console.error("Error updating user:", err);
                res.redirect("/users");
            });
    } else {
        // Create new user
        knex("users")
            .insert({ first_name, last_name, email })
            .returning("uuid")
            .then(result => {
                const newUuid = result[0].uuid || result[0];
                // Create credentials record
                return knex("credentials")
                    .insert({ uuid: newUuid, username, password });
            })
            .then(() => {
                res.redirect("/users");
            })
            .catch(err => {
                console.error("Error creating user:", err);
                res.redirect("/users");
            });
    }
});

app.post("/deleteUser/:id", (req, res) => {
    knex("users")
        .where({ uuid: req.params.id })
        .del()
        .then(() => {
            res.redirect("/users");
        })
        .catch(err => {
            console.error("Error deleting user:", err);
            res.redirect("/users");
        });
});

app.get("/search", (req, res) => {
    const searchTerm = req.query.q;
    const username = req.session.username;

    if (!searchTerm) {
        return res.redirect("/");
    }

    // Step 1 — Find the user's UUID
    knex("credentials")
        .select("uuid")
        .where({ username: username })
        .first()
        .then(credential => {
            if (!credential) {
                return res.redirect("/");
            }

            // Step 2 — Search transactions for THIS user only
            return knex("transactions")
                .select(
                    "transactions.transactionid",
                    "transactions.amount",
                    "transactions.description",
                    "transactions.date",
                    "acct_from.acct_name as from_account",
                    "acct_to.acct_name as to_account"
                )
                .leftJoin("accounts as acct_from", "transactions.acct_from", "acct_from.accountid")
                .leftJoin("accounts as acct_to", "transactions.acct_to", "acct_to.accountid")
                .where("transactions.uuid", credential.uuid)
                .andWhere(function() {
                    this.where("transactions.description", "ilike", `%${searchTerm}%`)
                        .orWhere("transactions.amount", searchTerm)
                        .orWhere("acct_from.acct_name", "ilike", `%${searchTerm}%`)
                        .orWhere("acct_to.acct_name", "ilike", `%${searchTerm}%`);
                })
                .orderBy("transactions.date", "desc");
        })
        .then(results => {
            res.render("searchResults", {
                results: results,
                searchTerm: searchTerm
            });
        })
        .catch(err => {
            console.error("Search error:", err);
            res.redirect("/");
        });
});


// Account management routes - GET and POST
app.get("/accounts", (req, res) => {
    // Get user's uuid from session username
    knex("credentials")
        .select("uuid")
        .where({ username: req.session.username })
        .first()
        .then(credential => {
            if (!credential) {
                return res.render("accounts", { accounts: [], error_message: "User not found" });
            }

            // Get accounts for this user
            return knex.select("accountid", "acct_name", "balance").from("accounts")
                .where({ uuid: credential.uuid })
                .then(accounts => {
                    // Map to format expected by view (name instead of acct_name)
                    const formattedAccounts = accounts.map(account => ({
                        id: account.accountid,
                        name: account.acct_name,
                        balance: account.balance
                    }));
                    res.render("accounts", { accounts: formattedAccounts });
                });
        })
        .catch(err => {
            console.error("Error getting accounts:", err);
            res.render("accounts", { accounts: [], error_message: "Error getting accounts" });
        });
});

app.get("/addEditAccount", (req, res) => {
    const { accountid } = req.query;

    if (accountid) {
        // Editing existing account
        knex.select("accountid", "acct_name", "balance", "uuid").from("accounts")
            .where({ accountid: accountid })
            .first()
            .then(account => {
                if (!account) {
                    return res.redirect("/accounts");
                }
                res.render("addEditAccount", { account: account });
            })
            .catch(err => {
                console.error("Error getting account:", err);
                res.redirect("/accounts");
            });
    } else {
        // New account
        res.render("addEditAccount", { account: null });
    }
});

app.post("/addEditAccount", (req, res) => {
    const { accountid, acct_name, balance } = req.body;

    if (accountid) {
        // Update existing account
        knex("accounts")
            .where({ accountid: accountid })
            .update({ acct_name, balance })
            .then(() => {
                res.redirect("/accounts");
            })
            .catch(err => {
                console.error("Error updating account:", err);
                res.redirect("/accounts");
            });
    } else {
        // Create new account - get user's uuid from session
        knex("credentials")
            .select("uuid")
            .where({ username: req.session.username })
            .first()
            .then(credential => {
                if (!credential) {
                    throw new Error("User not found");
                }

                return knex("accounts")
                    .insert({ uuid: credential.uuid, acct_name, balance });
            })
            .then(() => {
                res.redirect("/accounts");
            })
            .catch(err => {
                console.error("Error creating account:", err);
                res.redirect("/accounts");
            });
    }
});

app.post("/deleteAccount/:id", (req, res) => {
    knex("accounts")
        .where({ accountid: req.params.id })
        .del()
        .then(() => {
            res.redirect("/accounts");
        })
        .catch(err => {
            console.error("Error deleting account:", err);
            res.redirect("/accounts");
        });
});

// Transaction management routes - GET and POST
app.get("/addEditTransaction", (req, res) => {
    const { transactionid } = req.query;

    // Get user's uuid and accounts for dropdowns
    knex("credentials")
        .select("uuid")
        .where({ username: req.session.username })
        .first()
        .then(credential => {
            if (!credential) {
                return res.redirect("/");
            }

            // Get user's accounts for dropdowns
            return knex.select("accountid", "acct_name").from("accounts")
                .where({ uuid: credential.uuid })
                .then(accounts => {
                    if (transactionid) {
                        // Editing existing transaction
                        return knex.select(
                            "transactionid",
                            "uuid",
                            "acct_from",
                            "acct_to",
                            "amount",
                            "description",
                            "date"
                        ).from("transactions")
                        .where({ transactionid: transactionid })
                        .first()
                        .then(transaction => {
                            if (!transaction) {
                                return res.redirect("/");
                            }
                            res.render("addEditTransaction", { transaction: transaction, accounts: accounts });
                        });
                    } else {
                        // New transaction
                        res.render("addEditTransaction", { transaction: null, accounts: accounts });
                    }
                });
        })
        .catch(err => {
            console.error("Error getting transaction data:", err);
            res.redirect("/");
        });
});

app.post("/addEditTransaction", (req, res) => {
    const { transactionid, acct_from, acct_to, amount, description } = req.body;

    console.log("Transaction POST data:", { transactionid, acct_from, acct_to, amount, description });

    // Get user's uuid from session
    knex("credentials")
        .select("uuid")
        .where({ username: req.session.username })
        .first()
        .then(credential => {
            if (!credential) {
                throw new Error("User not found");
            }

            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                throw new Error("Invalid amount");
            }

            const acctFromId = acct_from ? parseInt(acct_from) : null;
            const acctToId = acct_to ? parseInt(acct_to) : null;

            // Check if both accounts are null (violates database constraint)
            if (!acctFromId && !acctToId) {
                throw new Error("At least one account (From or To) must be selected");
            }

            // Check if from and to accounts are the same
            if (acctFromId && acctToId && acctFromId === acctToId) {
                throw new Error("From and To accounts cannot be the same");
            }

            const transactionData = {
                uuid: credential.uuid,
                acct_from: acctFromId,
                acct_to: acctToId,
                amount: parsedAmount,
                description: description || null
            };

            console.log("Transaction data to save:", transactionData);

            if (transactionid) {
                // Update existing transaction
                return knex("transactions")
                    .where({ transactionid: transactionid })
                    .update(transactionData);
            } else {
                // Create new transaction
                return knex("transactions")
                    .insert(transactionData);
            }
        })
        .then(() => {
            console.log("Transaction saved successfully");
            res.redirect("/");
        })
        .catch(err => {
            console.error("Error saving transaction:", err);
            res.redirect("/");
        });
});

app.post("/deleteTransaction/:id", (req, res) => {
    knex("transactions")
        .where({ transactionid: req.params.id })
        .del()
        .then(() => {
            res.redirect("/");
        })
        .catch(err => {
            console.error("Error deleting transaction:", err);
            res.redirect("/");
        });
});




// the object is listening. index.js is listening
app.listen(port, () => {
    console.log("I am listening");
})
