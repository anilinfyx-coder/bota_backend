const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
    // 1. Connect to the default 'postgres' database to create the new database
    const poolDefault = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: 'postgres',
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        const res = await poolDefault.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${process.env.DB_NAME}'`);
        if (res.rowCount === 0) {
            console.log(`Creating database ${process.env.DB_NAME}...`);
            await poolDefault.query(`CREATE DATABASE ${process.env.DB_NAME}`);
            console.log("Database created successfully.");
        } else {
            console.log(`Database ${process.env.DB_NAME} already exists.`);
        }
    } catch (err) {
        console.error("Error checking/creating database:", err.message);
    } finally {
        await poolDefault.end();
    }

    // 2. Connect to the actual app database and run the schema
    const poolApp = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        console.log("Running schema.sql...");
        await poolApp.query(schema);
        console.log("Tables created successfully!");
    } catch (err) {
        console.error("Error creating tables:", err.message);
    } finally {
        await poolApp.end();
    }
}

initDB();
