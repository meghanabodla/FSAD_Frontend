import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Assignment.css";
import { apiRequest, clearSession, getCurrentUser } from "./api";

function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

export default function StudentDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    apiRequest("/student/dashboard")
      .then(setDashboard)
      .catch((err) => setError(err.message));
  }, []);

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  const assignments = dashboard?.assignments || [];
  const upcomingDeadlines = dashboard?.upcomingDeadlines || [];

  return (
    <div className="dashboard-container">
      <div className="logout-container">
        <img src="logout.png" alt="Logout" className="logout-icon" onClick={logout} />
      </div>

      <h1>Student Dashboard</h1>
      {error && <div className="assignment-card">{error}</div>}

      {upcomingDeadlines.length > 0 && (
        <div
          style={{
            background: "#fff3cd",
            padding: "15px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid #ffeeba"
          }}
        >
          <strong>Upcoming Deadlines</strong>
          {upcomingDeadlines.map((assignment) => (
            <p key={assignment.id}>
              "{assignment.title}" due on {formatDateTime(assignment.deadline)}
            </p>
          ))}
        </div>
      )}

      <div className="assignment-card profile-box">
        <img src="profile.png" alt="Profile" width="80" />
        <div>
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
        </div>
      </div>

      {dashboard && (
        <div className="assignment-card">
          <h3>Performance Analytics</h3>
          <p>Total Attempts: {dashboard.totalAttempts}</p>
          <p>Average Score: {dashboard.averageScore.toFixed ? dashboard.averageScore.toFixed(2) : dashboard.averageScore}</p>
          <p>Highest Score: {dashboard.highestScore}</p>
          <p>Lowest Score: {dashboard.lowestScore}</p>
        </div>
      )}

      <div className="assignment-card">
        <h2>Assignments</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Grade</th>
              <th>Submitted At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => {
              const submission = assignment.mySubmission;
              const status = submission
                ? submission.graded ? "Graded" : "Submitted"
                : "Pending";

              return (
                <tr key={assignment.id}>
                  <td>{assignment.title}</td>
                  <td>{assignment.type}</td>
                  <td>{formatDateTime(assignment.deadline)}</td>
                  <td>
                    <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>
                  </td>
                  <td>{submission?.grade ?? "-"}</td>
                  <td>{formatDateTime(submission?.submittedAt)}</td>
                  <td>
                    <button
                      onClick={() =>
                        submission
                          ? navigate(`/review/${assignment.id}`)
                          : navigate(`/attempt/${assignment.id}`)
                      }
                    >
                      {submission ? "View" : "Start"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
