import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Assignment.css";
import { apiRequest, openProtectedFile } from "./api";

function formatDateTime(dateString) {
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

export default function StudentSubmissionReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [dashboard, mySubmission] = await Promise.all([
        apiRequest("/student/dashboard"),
        apiRequest(`/student/assignments/${id}/submission`)
      ]);
      setAssignment((dashboard.assignments || []).find((item) => String(item.id) === id) || null);
      setSubmission(mySubmission);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleDelete = async () => {
    try {
      await apiRequest(`/student/assignments/${id}/submission`, { method: "DELETE" });
      navigate("/student");
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <div className="assignment-card">{error}</div>;
  if (!assignment || !submission) return <div className="assignment-card">Loading submission...</div>;

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => navigate("/student")}>Back to Dashboard</button>
      </div>

      <div className="assignment-card">
        <h2>Submission Review</h2>
        <p><strong>Submitted At:</strong> {formatDateTime(submission.submittedAt)}</p>
        <p><strong>Grade:</strong> {submission.grade ?? "Not Graded"}</p>
        <p><strong>Remarks:</strong> {submission.remarks || "None"}</p>

        {assignment.type === "TEXT" && <p><strong>Your Answer:</strong> {submission.textAnswer}</p>}

        {assignment.type === "MCQ" &&
          (submission.mcqAnswers || []).map((answer, index) => (
            <p key={index}><strong>Q{index + 1}:</strong> {answer}</p>
          ))}

        {assignment.type === "FILE" && submission.uploadedFileName && (
          <button onClick={() => openProtectedFile(`/files/submissions/${submission.id}`)} style={{ marginTop: "15px" }}>
            View Submitted File
          </button>
        )}

        {submission.canModify && (
          <div style={{ marginTop: "20px" }}>
            <button onClick={() => navigate(`/attempt/${assignment.id}`)} style={{ marginRight: "10px" }}>
              Edit Submission
            </button>
            <button onClick={handleDelete} style={{ background: "red", color: "white" }}>
              Delete Submission
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
