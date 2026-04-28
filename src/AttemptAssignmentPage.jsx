import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Assignment.css";
import { apiMultipart, apiRequest } from "./api";

export default function AttemptAssignmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [fileAnswer, setFileAnswer] = useState(null);
  const [deadlineLeft, setDeadlineLeft] = useState("");
  const [mcqTimeLeft, setMcqTimeLeft] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/student/dashboard")
      .then(async (data) => {
        const found = (data.assignments || []).find((item) => String(item.id) === id);
        if (!found) {
          setError("Assignment not found");
          return;
        }
        if (found.mySubmission && !found.mySubmission.canModify) {
          navigate(`/review/${id}`, { replace: true });
          return;
        }

        if (found.mySubmission?.canModify) {
          const existing = await apiRequest(`/student/assignments/${id}/submission`);
          setTextAnswer(existing.textAnswer || "");
          setAnswers(existing.mcqAnswers || []);
        }

        setAssignment(found);
        if (found.type === "MCQ") {
          setMcqTimeLeft((found.durationMinutes || 1) * 60);
        }
      })
      .catch((err) => setError(err.message));
  }, [id, navigate]);

  useEffect(() => {
    if (!assignment) return;

    const interval = setInterval(() => {
      const diff = new Date(assignment.deadline) - new Date();
      if (diff <= 0) {
        setDeadlineLeft("Deadline Passed");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setDeadlineLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [assignment]);

  const submit = async () => {
    if (!assignment) return;

    try {
      const metadata = {
        textAnswer,
        mcqAnswers: answers
      };

      await apiMultipart(`/student/assignments/${assignment.id}/submit`, "POST", metadata, fileAnswer);
      navigate("/student");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (assignment?.type !== "MCQ" || mcqTimeLeft === null) return;
    if (mcqTimeLeft <= 0) {
      submit();
      return;
    }

    const timer = setInterval(() => {
      setMcqTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [mcqTimeLeft, assignment]);

  const isDeadlinePassed = useMemo(() => {
    if (!assignment) return false;
    return new Date() > new Date(assignment.deadline);
  }, [assignment]);

  if (error) {
    return <div className="assignment-card">{error}</div>;
  }

  if (!assignment) {
    return <div className="assignment-card">Loading assignment...</div>;
  }

  if (isDeadlinePassed) {
    return (
      <div className="assignment-card">
        <h2>Deadline Passed</h2>
        <button onClick={() => navigate("/student")}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h2>{assignment.title}</h2>
      <div className="timer">Deadline Countdown: {deadlineLeft}</div>

      {assignment.type === "MCQ" && mcqTimeLeft !== null && (
        <div className="timer" style={{ top: "80px" }}>
          Test Timer: {Math.floor(mcqTimeLeft / 60)}m {mcqTimeLeft % 60}s
        </div>
      )}

      <div className="assignment-card">
        {assignment.type === "TEXT" && (
          <>
            <p>{assignment.description}</p>
            <textarea value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} />
          </>
        )}

        {assignment.type === "MCQ" &&
          (assignment.questions || []).map((question, index) => (
            <div key={question.id || index}>
              <p>{question.questionText}</p>
              {(question.options || []).map((option, optionIndex) => (
                <div key={optionIndex}>
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={option}
                    onChange={(e) => {
                      const updated = [...answers];
                      updated[index] = e.target.value;
                      setAnswers(updated);
                    }}
                  />
                  {option}
                </div>
              ))}
            </div>
          ))}

        {assignment.type === "FILE" && (
          <>
            <p>{assignment.description}</p>
            <input type="file" onChange={(e) => setFileAnswer(e.target.files?.[0] || null)} />
          </>
        )}

        <button onClick={submit}>Submit</button>
      </div>
    </div>
  );
}
