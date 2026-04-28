import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Assignment.css";
import { apiJson, apiRequest, openProtectedFile } from "./api";

function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

export default function SubmissionViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [gradeData, setGradeData] = useState({});
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [dashboard, submissionList] = await Promise.all([
        apiRequest("/teacher/dashboard"),
        apiRequest(`/teacher/assignments/${id}/submissions`)
      ]);
      setAssignment((dashboard.assignments || []).find((item) => String(item.id) === id) || null);
      setSubmissions(submissionList);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const saveGrade = async (submissionId) => {
    try {
      await apiJson(`/teacher/submissions/${submissionId}/grade`, "PUT", gradeData[submissionId] || {});
      await load();
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => navigate("/teacher")}>Back to Dashboard</button>
      </div>

      <h2>{assignment?.title || "Assignment"} - Submissions</h2>
      {error && <div className="assignment-card">{error}</div>}
      {submissions.length === 0 && <p>No Submissions Yet</p>}

      {submissions.map((submission) => (
        <div key={submission.id} className="assignment-card">
          <p><strong>Student:</strong> {submission.studentName}</p>
          <p><strong>Email:</strong> {submission.studentEmail}</p>
          <p><strong>Submitted At:</strong> {formatDateTime(submission.submittedAt)}</p>

          {assignment?.type === "FILE" && submission.uploadedFileName && (
            <button onClick={() => openProtectedFile(`/files/submissions/${submission.id}`)}>
              View Uploaded File
            </button>
          )}

          {assignment?.type === "TEXT" && <p><strong>Answer:</strong> {submission.textAnswer}</p>}

          {assignment?.type === "MCQ" &&
            (submission.mcqAnswers || []).map((answer, index) => (
              <p key={index}>Q{index + 1}: {answer}</p>
            ))}

          <input
            type="number"
            placeholder="Enter Grade"
            defaultValue={submission.grade ?? ""}
            onChange={(e) =>
              setGradeData((prev) => ({
                ...prev,
                [submission.id]: { ...prev[submission.id], grade: Number(e.target.value) }
              }))
            }
          />

          <input
            placeholder="Enter Remarks"
            defaultValue={submission.remarks || ""}
            onChange={(e) =>
              setGradeData((prev) => ({
                ...prev,
                [submission.id]: { ...prev[submission.id], remarks: e.target.value }
              }))
            }
          />

          <button onClick={() => saveGrade(submission.id)}>Save Grade</button>
          {submission.graded && (
            <p style={{ color: "#047857", fontWeight: "600", marginTop: "10px" }}>
              Graded
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
