import { useMemo, useState } from "react";
import { createProfile } from "./api.js";
import "./CreateProfile.css";

const EMPLOYMENT_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "student", label: "Student" },
  { value: "employed", label: "Employed" },
  { value: "self-employed", label: "Self-employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "other", label: "Other" },
];

function emptyForm() {
  return {
    name: "",
    age: "",
    state: "",
    employment_status: "",
    university: "",
    industry: "",
    business_type: "",
  };
}

/**
 * @param {{ onSuccess?: () => void; onCancel?: () => void }} props
 */
export default function CreateProfile({ onSuccess, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const flags = useMemo(() => {
    const s = form.employment_status;
    return {
      showUniversity: s === "student",
      showIndustry: s === "employed",
      showBusinessType: s === "self-employed",
    };
  }, [form.employment_status]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.employment_status) {
      setError("Choose an employment status.");
      return;
    }
    if (flags.showUniversity && !form.university.trim()) {
      setError("University is required for students.");
      return;
    }
    if (flags.showIndustry && !form.industry.trim()) {
      setError("Industry is required when employed.");
      return;
    }
    if (flags.showBusinessType && !form.business_type.trim()) {
      setError("Business type is required when self-employed.");
      return;
    }

    const ageNum = form.age === "" ? null : Number(form.age);
    const payload = {
      name: form.name.trim(),
      age: Number.isFinite(ageNum) ? ageNum : null,
      state: form.state.trim() || null,
      employment_status: form.employment_status,
      citizenship: null,
      housing: null,
      has_dependents: null,
      dependents_count: null,
      university: flags.showUniversity ? form.university.trim() : null,
      degree_level: null,
      financial_aid: null,
      industry: flags.showIndustry ? form.industry.trim() : null,
      employment_type: null,
      income_bracket: null,
      business_type: flags.showBusinessType ? form.business_type.trim() : null,
      num_employees: null,
    };

    setSubmitting(true);
    try {
      await createProfile(payload);
      setForm(emptyForm());
      onSuccess?.();
    } catch (err) {
      setError(err?.message || "Could not create profile.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-profile" onSubmit={handleSubmit} noValidate>
      <h2 className="create-profile-title">New profile</h2>

      <label className="create-profile-field">
        <span>Name</span>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          autoComplete="name"
        />
      </label>

      <div className="create-profile-row">
        <label className="create-profile-field">
          <span>Age</span>
          <input
            type="number"
            name="age"
            min={0}
            max={120}
            value={form.age}
            onChange={(e) => update("age", e.target.value)}
          />
        </label>
        <label className="create-profile-field">
          <span>State</span>
          <input
            type="text"
            name="state"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            autoComplete="address-level1"
            placeholder="e.g. NY"
          />
        </label>
      </div>

      <label className="create-profile-field">
        <span>Employment status</span>
        <select
          name="employment_status"
          value={form.employment_status}
          onChange={(e) => update("employment_status", e.target.value)}
        >
          {EMPLOYMENT_OPTIONS.map((o) => (
            <option key={o.value || "empty"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {flags.showUniversity && (
        <label className="create-profile-field">
          <span>University</span>
          <input
            type="text"
            name="university"
            value={form.university}
            onChange={(e) => update("university", e.target.value)}
            placeholder="School name"
          />
        </label>
      )}

      {flags.showIndustry && (
        <label className="create-profile-field">
          <span>Industry</span>
          <input
            type="text"
            name="industry"
            value={form.industry}
            onChange={(e) => update("industry", e.target.value)}
            placeholder="e.g. Healthcare"
          />
        </label>
      )}

      {flags.showBusinessType && (
        <label className="create-profile-field">
          <span>Business type</span>
          <input
            type="text"
            name="business_type"
            value={form.business_type}
            onChange={(e) => update("business_type", e.target.value)}
            placeholder="e.g. Consulting"
          />
        </label>
      )}

      {error && (
        <p className="create-profile-error" role="alert">
          {error}
        </p>
      )}

      <div className="create-profile-actions">
        {onCancel && (
          <button
            type="button"
            className="create-profile-btn create-profile-btn--ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="create-profile-btn create-profile-btn--primary"
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
