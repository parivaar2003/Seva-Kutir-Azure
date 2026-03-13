import React, { useState } from "react";
import "./App.css";
import locationData from "./locationData.json";
import clusterData from "./clusterData.json";
import kutirNameData from "./kutirNameData.json";

/* ---------------- DATA ---------------- */

const kutirTypes = [
  "Seva Kutir - सेवा कुटीर",
  "Shiksha Kutir - शिक्षा कुटीर",
  "Study Center - अध्ययन केंद्र"
];

const initialFormData = {
  email: "",
  teacherName: "",
  teacherPhone: "",
  shift: "",
  attendanceCount: "",
  state: "",
  district: "",
  cluster: "",
  kutirName: "",
  kutirType: "",
  studentPhoto: null,
  studentPhoto2: null,
  studentPhoto3: null
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
    "cluster",
    "kutirName",
    "kutirType",
    "studentPhoto",
    "studentPhoto2", 
    "studentPhoto3"
  ];

  const labels = {
    email: "Email / ईमेल",
    teacherName: "Teacher Name / शिक्षक का नाम",
    teacherPhone: "Teacher Phone / शिक्षक का फोन",
    shift: "Shift / पाली",
    attendanceCount: "Attendance Count / उपस्थिति संख्या",
    state: "State / राज्य",
    district: "District / जिला",
    cluster: "Cluster / क्लस्टर",
    kutirName: "Kutir Name / कुटीर का नाम",
    kutirType: "Kutir Type / कुटीर का प्रकार",
    studentPhoto: "Student Photo / छात्र का फोटो",
    studentPhoto2: "Student Photo 2 / छात्र का फोटो 2",
    studentPhoto3: "Student Photo 3 / छात्र का फोटो 3"
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
                {key.startsWith("studentPhoto")
                  ? (data[key] ? data[key].name : "Not Uploaded")
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

  const clusters = clusterData.find(x => x.district === formData.district)?.cluster;
  const kutirNames = kutirNameData.find(x => x.cluster === formData.cluster)?.kutirName;

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

    if (name.startsWith("studentPhoto")) {
      setFormData({ ...formData, [name]: files[0] || null });
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

  const handleDistrictChange = (e) => {
    setFormData({
      ...formData,
      district:e.target.value,
    });
    
  }

  /* VALIDATION */

  const validate = () => {
    let newErrors = {};

    if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email";

    if (formData.teacherPhone.length !== 10)
      newErrors.teacherPhone = "Phone must be 10 digits";

    Object.entries(formData).forEach(([k, v]) => {
      // We skip checking Photo 2 and Photo 3 so they remain optional
      if (!v && k !== "studentPhoto2" && k !== "studentPhoto3") {
        newErrors[k] = "Required";
      }
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
          <label>Email / ईमेल *</label>
          <input type="email" name="email"
            value={formData.email}
            onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Teacher Name / शिक्षक का नाम *</label>
          <input name="teacherName"
            value={formData.teacherName}
            onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Teacher Mobile / शिक्षक का फोन *</label>
          <input inputMode="numeric" minlength="10" maxlength="10"
            name="teacherPhone"
            value={formData.teacherPhone}
            onChange={handleChange} required />
            {errors.teacherPhone && <span className="error-message">{errors.teacherPhone}</span>}
        </div>

        <div className="form-group">
          <label>Shift / पाली *</label>
          <select name="shift"
            value={formData.shift}
            onChange={handleChange} required>
            <option value="">Select</option>
            <option>Morning - सुबह</option>
            <option>Evening - शाम</option>
          </select>
        </div>

        <div className="form-group">
          <label>Attendance Count / उपस्थिति संख्या *</label>
          <input inputMode="numeric"
            name="attendanceCount"
            value={formData.attendanceCount}
            onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>State / राज्य *</label>
          <select value={formData.state}
            onChange={handleStateChange} required>
            <option value="">Select</option>
            {states.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>District / जिला *</label>
          <select
            value={formData.district}
            disabled={!formData.state}
            onChange={handleDistrictChange}
            required>
            <option value="">Select</option>
            {districts.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        
        <div className="form-group">
          <label>Cluster / क्लस्टर *</label>
          <select
            value={formData.cluster}
            disabled={!formData.district}
            onChange={(e)=>setFormData({...formData,cluster:e.target.value})}
            required>
            <option value="">Select</option>
            {clusters?.map(d => <option key={d}>{d}</option>)}
          </select>
          </div>

          <div className="form-group">
          <label>Kutir Name / कुटीर का नाम *</label>
          <select
            value={formData.kutirName}
            disabled={!formData.cluster}
            onChange={(e)=>setFormData({...formData,kutirName:e.target.value})}
            required>
            <option value="">Select</option>
            {kutirNames?.map(d => <option key={d}>{d}</option>)}
          </select>
          </div>

        <div className="form-group">
          <label>Kutir Type / कुटीर का प्रकार *</label>
          <select
            value={formData.kutirType}
            onChange={(e)=>setFormData({...formData,kutirType:e.target.value})}
            required>
            <option value="">Select</option>
            {kutirTypes?.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div className="form-group full-width">
          <label>Student Photo 1 / छात्र का फोटो 1 *</label>
          <input type="file" name="studentPhoto" accept="image/*"
            onChange={handleChange} required />
        </div>

        <div className="form-group full-width">
          <label>Student Photo 2 / छात्र का फोटो 2</label>
          <input type="file" name="studentPhoto2" accept="image/*"
            onChange={handleChange} />
        </div>

        <div className="form-group full-width">
          <label>Student Photo 3 / छात्र का फोटो 3</label>
          <input type="file" name="studentPhoto3" accept="image/*"
            onChange={handleChange} />
        </div>

        <button className="submit-btn full-width">
          Review Details
        </button>
      </form>
    </div>
  );
}
