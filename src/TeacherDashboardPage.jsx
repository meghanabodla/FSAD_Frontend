import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Assignment.css";
import { apiJson, apiMultipart, apiRequest, clearSession } from "./api";

const emptyForm = {
  title: "",
  description: "",
  type: "TEXT",
  deadline: "",
  durationMinutes: 1,
  totalMarks: 100,
  questions: []
};

function formatDateForInput(value) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState("create");
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [questionFile, setQuestionFile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      const data = await apiRequest("/teacher/dashboard");
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const assignments = dashboard?.assignments || [];

  const filteredAssignments = useMemo(() => {
    if (activeTab === "all") return assignments;
    if (activeTab === "graded") return assignments.filter((a) => (a.gradedCount || 0) > 0);
    if (activeTab === "ungraded") return assignments.filter((a) => (a.ungradedCount || 0) > 0);
    if (activeTab === "pending") return assignments.filter((a) => (a.pendingCount || 0) > 0);
    return assignments;
  }, [activeTab, assignments]);

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        { questionText: "", options: ["", "", "", ""], correctAnswer: "", marks: 1 }
      ]
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.questions];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, questions: updated };
    });
  };

  const submitAssignment = async () => {
    try {
      setError("");
      const payload = {
        ...form,
        durationMinutes: form.type === "MCQ" ? Number(form.durationMinutes) : null,
        totalMarks: Number(form.totalMarks),
        questions: form.type === "MCQ" ? form.questions.map((q) => ({ ...q, marks: Number(q.marks) })) : []
      };

      if (editingAssignment) {
        await apiMultipart(`/teacher/assignments/${editingAssignment.id}`, "PUT", payload, questionFile);
      } else {
        await apiMultipart("/teacher/assignments", "POST", payload, questionFile);
      }

      setForm(emptyForm);
      setEditingAssignment(null);
      setQuestionFile(null);
      setActiveTab("all");
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteAssignment = async (id) => {
    try {
      await apiRequest(`/teacher/assignments/${id}`, { method: "DELETE" });
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="logout-container">
        <img src="logout.png" className="logout-icon" onClick={logout} alt="Logout" />
      </div>

      <h1>Teacher Dashboard</h1>
      {error && <div className="assignment-card">{error}</div>}

      <div className="teacher-navbar">
        {["create", "all", "graded", "ungraded", "pending"].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active-tab" : ""}
            onClick={() => {
              setActiveTab(tab);
              if (tab !== "create") {
                setEditingAssignment(null);
                setForm(emptyForm);
                setQuestionFile(null);
              }
            }}
          >
            {tab === "create" ? "Create Assignment" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "create" && (
        <div className="assignment-card">
          <h3>{editingAssignment ? "Edit Assignment" : "Create Assignment"}</h3>

          <input
            name="title"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <input
            type="datetime-local"
            name="deadline"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />

          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, questions: [] })}>
            <option value="TEXT">Text</option>
            <option value="MCQ">MCQ</option>
            <option value="FILE">File</option>
          </select>

          {form.type === "MCQ" && (
            <>
              <input
                type="number"
                value={form.durationMinutes}
                placeholder="Duration in minutes"
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              />
              <button onClick={addQuestion}>Add Question</button>
              {form.questions.map((question, index) => (
                <div key={index} className="assignment-card">
                  <input
                    placeholder="Question"
                    value={question.questionText}
                    onChange={(e) => handleQuestionChange(index, "questionText", e.target.value)}
                  />
                  {question.options.map((option, optionIndex) => (
                    <input
                      key={optionIndex}
                      placeholder={`Option ${optionIndex + 1}`}
                      value={option}
                      onChange={(e) => {
                        const updatedOptions = [...question.options];
                        updatedOptions[optionIndex] = e.target.value;
                        handleQuestionChange(index, "options", updatedOptions);
                      }}
                    />
                  ))}
                  <input
                    placeholder="Correct Answer"
                    value={question.correctAnswer}
                    onChange={(e) => handleQuestionChange(index, "correctAnswer", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Marks"
                    value={question.marks}
                    onChange={(e) => handleQuestionChange(index, "marks", e.target.value)}
                  />
                </div>
              ))}
            </>
          )}

          {form.type === "FILE" && (
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setQuestionFile(e.target.files?.[0] || null)} />
          )}

          <button onClick={submitAssignment}>
            {editingAssignment ? "Save Changes" : "Create"}
          </button>
        </div>
      )}

      {activeTab === "all" && dashboard && (
        <div className="assignment-card">
          <h3>Analytics Overview</h3>
          <p>Total Assignments: {dashboard.totalAssignments}</p>
          <p>Active Assignments: {dashboard.activeAssignments}</p>
          <p>Closed Assignments: {dashboard.closedAssignments}</p>
          <p>Total Submissions: {dashboard.totalSubmissions}</p>
        </div>
      )}

      {activeTab !== "create" &&
        filteredAssignments.map((assignment) => {
          const totalStudents = (assignment.submissionCount || 0) + (assignment.pendingCount || 0);
          const percentage = totalStudents > 0 ? ((assignment.submissionCount || 0) / totalStudents) * 100 : 0;

          return (
            <div key={assignment.id} className="assignment-card">
              <h3>{assignment.title}</h3>
              <p>Status: {assignment.status}</p>
              <p>Deadline: {new Date(assignment.deadline).toLocaleString()}</p>
              <p>Submitted: {assignment.submissionCount || 0}</p>
              <p>Pending: {assignment.pendingCount || 0}</p>

              <div style={{ width: "100%", height: "10px", background: "#eee", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ width: `${percentage}%`, height: "100%", background: "#6a1b9a" }} />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={() => navigate(`/teacher/${assignment.id}`)}>View Submissions</button>
                <button
                  disabled={(assignment.submissionCount || 0) > 0 || assignment.status === "CLOSED"}
                  onClick={() => {
                    setEditingAssignment(assignment);
                    setForm({
                      title: assignment.title,
                      description: assignment.description || "",
                      type: assignment.type,
                      deadline: formatDateForInput(assignment.deadline),
                      durationMinutes: assignment.durationMinutes || 1,
                      totalMarks: assignment.totalMarks || 100,
                      questions: (assignment.questions || []).map((question) => ({
                        questionText: question.questionText,
                        options: question.options || ["", "", "", ""],
                        correctAnswer: "",
                        marks: question.marks || 1
                      }))
                    });
                    setQuestionFile(null);
                    setActiveTab("create");
                  }}
                >
                  Edit
                </button>
                <button onClick={() => deleteAssignment(assignment.id)}>Delete</button>
              </div>
            </div>
          );
        })}
    </div>
  );
}
