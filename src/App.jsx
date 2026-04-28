import { HashRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import SubmissionView from "./SubmissionView";
import AttemptAssignment from "./AttemptAssignment";
import StudentSubmissionReview from "./StudentSubmissionReview"; // 🔥 ADDED

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/:id" element={<SubmissionView />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/attempt/:id" element={<AttemptAssignment />} />

        {/* 🔥 NEW ROUTE ADDED */}
        <Route path="/review/:id" element={<StudentSubmissionReview />} />

      </Routes>
    </Router>
  );
}

export default App;
