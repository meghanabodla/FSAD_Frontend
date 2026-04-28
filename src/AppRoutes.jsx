import { HashRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Home from "./Home";
import LoginPage from "./LoginPage";
import TeacherDashboardPage from "./TeacherDashboardPage";
import StudentDashboardPage from "./StudentDashboardPage";
import SubmissionViewPage from "./SubmissionViewPage";
import AttemptAssignmentPage from "./AttemptAssignmentPage";
import StudentSubmissionReviewPage from "./StudentSubmissionReviewPage";
import { getCurrentUser } from "./api";

function ProtectedRoute({ children, allowedRole }) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === "TEACHER" ? "/teacher" : "/student"} replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRole="TEACHER">
              <TeacherDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/:id"
          element={
            <ProtectedRoute allowedRole="TEACHER">
              <SubmissionViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="STUDENT">
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attempt/:id"
          element={
            <ProtectedRoute allowedRole="STUDENT">
              <AttemptAssignmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/review/:id"
          element={
            <ProtectedRoute allowedRole="STUDENT">
              <StudentSubmissionReviewPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
