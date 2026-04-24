import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "clapo.db");

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    age INTEGER,
    state TEXT,
    employment_status TEXT,
    citizenship TEXT,
    housing TEXT,
    has_dependents INTEGER,
    dependents_count INTEGER,
    university TEXT,
    degree_level TEXT,
    financial_aid TEXT,
    industry TEXT,
    employment_type TEXT,
    income_bracket TEXT,
    business_type TEXT,
    num_employees INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
