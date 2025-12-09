---------------------------------------------------------
-- DROP TABLES (for rebuild)
---------------------------------------------------------
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS credentials CASCADE;
DROP TABLE IF EXISTS users CASCADE;

---------------------------------------------------------
-- USERS TABLE
---------------------------------------------------------
CREATE TABLE users (
    uuid SERIAL PRIMARY KEY,
    first_name VARCHAR(40) NOT NULL,
    last_name VARCHAR(40),
    email VARCHAR(255) NOT NULL UNIQUE,
    is_admin BOOLEAN
);

---------------------------------------------------------
-- CREDENTIALS TABLE
---------------------------------------------------------
CREATE TABLE credentials (
    credentialsid SERIAL PRIMARY KEY,
    uuid INT NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    username VARCHAR(25) NOT NULL UNIQUE,
    password VARCHAR(30) NOT NULL
);

---------------------------------------------------------
-- ACCOUNTS TABLE
---------------------------------------------------------
CREATE TABLE accounts (
    accountid SERIAL PRIMARY KEY,
    uuid INT NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    acct_name VARCHAR(50) NOT NULL,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

---------------------------------------------------------
-- TRANSACTIONS TABLE
---------------------------------------------------------
CREATE TABLE transactions (
    transactionid SERIAL PRIMARY KEY,
    uuid INT NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    acct_from INT REFERENCES accounts(accountid) ON DELETE CASCADE,
    acct_to INT REFERENCES accounts(accountid) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_same_account CHECK (acct_from IS DISTINCT FROM acct_to)
);

---------------------------------------------------------
-- SEED DATA
---------------------------------------------------------

-------------------------
-- Insert Users
-------------------------
INSERT INTO users (first_name, last_name, email, is_admin) VALUES
('Alice', 'Admin', 'alice.admin@example.com', TRUE),
('Bob', 'Admin', 'bob.admin@example.com', TRUE),
('Carol', 'User', 'carol.user@example.com', FALSE),
('Dave', 'User', 'dave.user@example.com', FALSE);

-------------------------
-- Insert Credentials
-------------------------
INSERT INTO credentials (uuid, username, password) VALUES
(1, 'alice', 'pass1'),
(2, 'bob', 'pass2'),
(3, 'carol', 'pass3'),
(4, 'dave', 'pass4');

-------------------------
-- Insert Accounts
-- 3 accounts per user: checking, spending, unallocated funds
-------------------------
INSERT INTO accounts (uuid, acct_name, balance) VALUES
(1, 'checking', 0), (1, 'spending', 0), (1, 'unallocated funds', 0),
(2, 'checking', 0), (2, 'spending', 0), (2, 'unallocated funds', 0),
(3, 'checking', 0), (3, 'spending', 0), (3, 'unallocated funds', 0),
(4, 'checking', 0), (4, 'spending', 0), (4, 'unallocated funds', 0);

-- Accounts now have IDs 1–12.

---------------------------------------------------------
-- Insert Transactions
-- 4 transactions per account → 12 per user → 48 total
-- All outside-source deposits for simplicity.
---------------------------------------------------------

-- Helper macro: For each acct_id, create four income transactions.
-- Accounts 1–12 belong to users 1–4 in groups of three.

-- User 1 accounts (1,2,3)
INSERT INTO transactions (uuid, acct_to, amount, description) VALUES
(1, 1, 50, 'Initial deposit'),
(1, 1, 20, 'Income'),
(1, 1, 10, 'Gift'),
(1, 1, 5, 'Adjustment'),

(1, 2, 40, 'Initial deposit'),
(1, 2, 30, 'Income'),
(1, 2, 15, 'Gift'),
(1, 2, 5, 'Adjustment'),

(1, 3, 60, 'Initial deposit'),
(1, 3, 25, 'Income'),
(1, 3, 10, 'Gift'),
(1, 3, 5, 'Adjustment');

-- User 2 accounts (4,5,6)
INSERT INTO transactions (uuid, acct_to, amount, description) VALUES
(2, 4, 50, 'Initial deposit'),
(2, 4, 20, 'Income'),
(2, 4, 10, 'Gift'),
(2, 4, 5, 'Adjustment'),

(2, 5, 40, 'Initial deposit'),
(2, 5, 30, 'Income'),
(2, 5, 15, 'Gift'),
(2, 5, 5, 'Adjustment'),

(2, 6, 60, 'Initial deposit'),
(2, 6, 25, 'Income'),
(2, 6, 10, 'Gift'),
(2, 6, 5, 'Adjustment');

-- User 3 accounts (7,8,9)
INSERT INTO transactions (uuid, acct_to, amount, description) VALUES
(3, 7, 50, 'Initial deposit'),
(3, 7, 20, 'Income'),
(3, 7, 10, 'Gift'),
(3, 7, 5, 'Adjustment'),

(3, 8, 40, 'Initial deposit'),
(3, 8, 30, 'Income'),
(3, 8, 15, 'Gift'),
(3, 8, 5, 'Adjustment'),

(3, 9, 60, 'Initial deposit'),
(3, 9, 25, 'Income'),
(3, 9, 10, 'Gift'),
(3, 9, 5, 'Adjustment');

-- User 4 accounts (10,11,12)
INSERT INTO transactions (uuid, acct_to, amount, description) VALUES
(4, 10, 50, 'Initial deposit'),
(4, 10, 20, 'Income'),
(4, 10, 10, 'Gift'),
(4, 10, 5, 'Adjustment'),

(4, 11, 40, 'Initial deposit'),
(4, 11, 30, 'Income'),
(4, 11, 15, 'Gift'),
(4, 11, 5, 'Adjustment'),

(4, 12, 60, 'Initial deposit'),
(4, 12, 25, 'Income'),
(4, 12, 10, 'Gift'),
(4, 12, 5, 'Adjustment');


---------------------------------------------------------
-- INTERNAL TRANSFERS (acct_from → acct_to)
-- Two transfers per user.
-- All transfers are between accounts owned by the same user.
---------------------------------------------------------

-------------------------
-- USER 1 (accounts 1,2,3)
-------------------------
INSERT INTO transactions (uuid, acct_from, acct_to, amount, description)
VALUES
(1, 1, 2, 25.00, 'Transfer: checking → spending'),
(1, 2, 3, 15.00, 'Transfer: spending → unallocated funds');

-------------------------
-- USER 2 (accounts 4,5,6)
-------------------------
INSERT INTO transactions (uuid, acct_from, acct_to, amount, description)
VALUES
(2, 4, 5, 30.00, 'Transfer: checking → spending'),
(2, 5, 6, 20.00, 'Transfer: spending → unallocated funds');

-------------------------
-- USER 3 (accounts 7,8,9)
-------------------------
INSERT INTO transactions (uuid, acct_from, acct_to, amount, description)
VALUES
(3, 7, 8, 40.00, 'Transfer: checking → spending'),
(3, 8, 9, 15.00, 'Transfer: spending → unallocated funds');

-------------------------
-- USER 4 (accounts 10,11,12)
-------------------------
INSERT INTO transactions (uuid, acct_from, acct_to, amount, description)
VALUES
(4, 10, 11, 35.00, 'Transfer: checking → spending'),
(4, 11, 12, 20.00, 'Transfer: spending → unallocated funds');


---------------------------------------------------------
-- APPLICATION-LEVEL LOGIC (NOT ENFORCED BY DATABASE)
---------------------------------------------------------

-- Every user must always have an account named "unallocated funds".
--    The database does not enforce this; the webapp must ensure that:
--    * When a user is created, create an "unallocated funds" account.
--    * This account is never deleted by the UI.
--    * This account is shown as the default destination for orphaned funds.

-- When deleting a user-owned account:
--    * The webapp must:
--         (a) Lookup the account balance.
--         (b) Insert a transaction moving that balance FROM the account
--             INTO the user's "unallocated funds" account (acct_from → acct_to).
--         (c) Only after the transfer is committed, perform:
--                 DELETE FROM accounts WHERE accountid = :id;
--    * This ensures no funds disappear from the system.
--    * The database does NOT perform this transfer automatically.

-- A user can only select their own accounts OR null account for a transfer. This can be achieved with a dropdown.
-- Null acct_from or acct_to should be shown as "outside source"
-- updating the account totals after a transaction is NOT automatic in the database; this needs to be handled in the app.

-- WHEN CREATING A USER: also create their records in credentials table, and create an “unallocated funds” account for it
---------------------------------------------------------
-- END OF APPLICATION-LEVEL LOGIC
---------------------------------------------------------

