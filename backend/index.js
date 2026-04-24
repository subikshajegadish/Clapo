import "dotenv/config";
import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running");
});

const insertProfile = db.prepare(`
  INSERT INTO profiles (
    name, age, state, employment_status,
    citizenship, housing, has_dependents,
    dependents_count, university, degree_level,
    financial_aid, industry, employment_type,
    income_bracket, business_type, num_employees
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const selectById = db.prepare("SELECT * FROM profiles WHERE id = ?");
const selectAll = db.prepare("SELECT * FROM profiles");

app.post("/profiles", (req, res) => {
  const {
    name,
    age,
    state,
    employment_status,
    citizenship,
    housing,
    has_dependents,
    dependents_count,
    university,
    degree_level,
    financial_aid,
    industry,
    employment_type,
    income_bracket,
    business_type,
    num_employees,
  } = req.body;

  console.log("Profile creation", { name, state });

  const result = insertProfile.run(
    name,
    age,
    state,
    employment_status,
    citizenship,
    housing,
    has_dependents,
    dependents_count,
    university,
    degree_level,
    financial_aid,
    industry,
    employment_type,
    income_bracket,
    business_type,
    num_employees
  );

  const created = selectById.get(result.lastInsertRowid);
  res.json(created);
});

app.get("/profiles", (req, res) => {
  console.log("Fetch profiles request");
  const profiles = selectAll.all();
  res.json(profiles);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
