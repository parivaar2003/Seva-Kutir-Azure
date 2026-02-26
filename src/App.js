import React, { useState } from "react";
import "./App.css";
import locationData from "./locationData.json";

/* ---------------- DATA ---------------- */

const kutirTypes = [
  "Seva Kutir",
  "Shiksha Kutir",
  "Study Center"
];

const initialFormData = {
  email: "",
  teacherName: "",
  teacherPhone: "",
  shift: "",
  attendanceCount: "",
  state: "",
  district: "",
  kutirType: "",
  studentPhoto: null
};

/* ---------------- CONFIRMATION PAGE ---------------- */

function ConfirmationPage({ data, onEdit, onConfirm, loading }) {
  const displayOrder = [
    "email",
    "teacherName",
    "teacherPhone",
    "shift",
    "attendanceCount",
    "state",
    "district",
    "kutirType",
    "studentPhoto"
  ];

  const labels = {
    email: "Email",
    teacherName: "Teacher Name",
    teacherPhone: "Teacher Phone",
    shift: "Shift",
    attendanceCount: "Attendance Count",
    state: "State",
    district: "District",
    kutirType: "Kutir Type",
    studentPhoto: "Student Photo"
  };

  return (
    <div className="review-container">
      <div className="review-card">
        <h2>Review & Confirm</h2>

        <div className="review-grid">
          {displayOrder.map((key) => (
            <div className="review-row" key={key}>
              <div className="review-label">
                {labels[key]}
              </div>

              <div className="review-value">
                {key === "studentPhoto"
                  ? data[key]?.name
                  : data[key]}
              </div>
            </div>
          ))}
        </div>

        <div className="review-actions">
          <button className="edit-btn" onClick={onEdit}>
            Edit Details
          </button>

          <button
            className="confirm-btn"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Confirm & Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- MAIN COMPONENT ---------------- */

export default function App() {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [loading, setLoading] = useState(false);

  /* DROPDOWNS */

  const states = [...new Set(locationData.map(x => x.state))];

  const districts = locationData
    .filter(x => x.state === formData.state)
    .map(x => x.district);

  /* HANDLERS */

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "teacherPhone") {
      const numeric = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, teacherPhone: numeric });
      return;
    }

    if (name === "attendanceCount") {
      const numeric = value.replace(/\D/g, "").slice(0, 3);
      setFormData({ ...formData, attendanceCount: numeric });
      return;
    }

    if (name === "studentPhoto") {
      setFormData({ ...formData, studentPhoto: files[0] });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleStateChange = (e) => {
    setFormData({
      ...formData,
      state: e.target.value,
      district: ""
    });
  };

  /* VALIDATION */

  const validate = () => {
    let newErrors = {};

    if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email";

    if (formData.teacherPhone.length !== 10)
      newErrors.teacherPhone = "Phone must be 10 digits";

    Object.entries(formData).forEach(([k, v]) => {
      if (!v) newErrors[k] = "Required";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* FIRST SUBMIT → REVIEW */

  const handleReview = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsReviewing(true);
  };

  /* FINAL SUBMIT */

  const handleFinalSubmit = async () => {
    console.log("SUBMIT STARTED");   // 👈 ADD THIS
    setLoading(true);

    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) =>
      data.append(k, v)
    );

    try {
      const res = await fetch("/api/AttendanceForm", {
        method: "POST",
        body: data
      });

      const result = await res.json();

      alert(result.message || "Submitted successfully");

      setFormData(initialFormData);
      setIsReviewing(false);
    } catch {
      alert("Submission failed");
    }

    setLoading(false);
  };

  /* ---------------- UI ---------------- */

  if (isReviewing) {
    return (
      <ConfirmationPage
        data={formData}
        onEdit={() => setIsReviewing(false)}
        onConfirm={handleFinalSubmit}
        loading={loading}
      />
    );
  }

  return (
    <div className="form-wrapper">
      <form className="details-form" onSubmit={handleReview}>
        <h2>Attendance Form</h2>

        <div className="form-group">
          <label>Email *</label>
          <input type="email" name="email"
            value={formData.email}
            onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Teacher Name *</label>
          <input name="teacherName"
            value={formData.teacherName}
            onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Teacher Phone *</label>
          <input inputMode="numeric" maxLength={10}
            name="teacherPhone"
            value={formData.teacherPhone}
            onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Shift *</label>
          <select name="shift"
            value={formData.shift}
            onChange={handleChange} required>
            <option value="">Select</option>
            <option>Morning</option>
            <option>Evening</option>
          </select>
        </div>

        <div className="form-group">
          <label>Attendance Count *</label>
          <input inputMode="numeric"
            name="attendanceCount"
            value={formData.attendanceCount}
            onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>State *</label>
          <select value={formData.state}
            onChange={handleStateChange} required>
            <option value="">Select</option>
            {states.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>District *</label>
          <select
            value={formData.district}
            disabled={!formData.state}
            onChange={(e)=>setFormData({...formData,district:e.target.value})}
            required>
            <option value="">Select</option>
            {districts.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div className="form-group full-width">
          <label>Kutir Type *</label>
          <div className="radio-group">
            {kutirTypes.map(type => (
              <label key={type}>
                <input type="radio"
                  name="kutirType"
                  value={type}
                  checked={formData.kutirType===type}
                  onChange={handleChange}
                  required />
                {type}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group full-width">
          <label>Student Photo *</label>
          <input type="file"
            name="studentPhoto"
            accept="image/*"
            onChange={handleChange} 
            required />
        </div>

        <button className="submit-btn full-width">
          Review Details
        </button>
      </form>
    </div>
  );
}
