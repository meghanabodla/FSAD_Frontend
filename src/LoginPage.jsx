import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import "./Login.css";
import { apiJson, clearSession, saveSession } from "./api";

const initialLogin = { email: "", password: "" };
const initialSignup = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: ""
};

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const selectedRole = roleParam === "TEACHER" || roleParam === "STUDENT" ? roleParam : "";
  const selectedRoleLabel = selectedRole === "TEACHER" ? "Teacher" : selectedRole === "STUDENT" ? "Student" : "";
  const [mode, setMode] = useState("login");
  const [loginData, setLoginData] = useState(initialLogin);
  const [signupData, setSignupData] = useState({
    ...initialSignup,
    role: selectedRole === "TEACHER" || selectedRole === "STUDENT" ? selectedRole : ""
  });
  const [redirectTo, setRedirectTo] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (setter, value) => setter((prev) => ({ ...prev, ...value }));

  useEffect(() => {
    clearSession();
  }, []);

  const login = async () => {
    if (!loginData.email.trim() || !loginData.password.trim()) {
      setError("Please fill all fields");
      return;
    }

    const normalizedLogin = {
      email: loginData.email.trim().toLowerCase(),
      password: loginData.password.trim()
    };

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const response = await apiJson("/auth/login", "POST", normalizedLogin);
      if (selectedRole && response.role !== selectedRole) {
        setError(`Please use the ${response.role === "TEACHER" ? "Teacher" : "Student"} login option for this account`);
        return;
      }
      saveSession(response);
      setRedirectTo(response.role === "TEACHER" ? "/teacher" : "/student");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signup = async () => {
    const { name, email, password, confirmPassword, role } = signupData;

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !role) {
      setError("Please fill all required fields");
      return;
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!strongPassword.test(password)) {
      setError("Password must include uppercase, lowercase, number and special character");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const normalizedSignup = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      role
    };

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const message = await apiJson("/auth/register", "POST", normalizedSignup);
      setMode("login");
      setLoginData({ email: normalizedSignup.email, password: "" });
      setSignupData({
        ...initialSignup,
        role: selectedRole === "TEACHER" || selectedRole === "STUDENT" ? selectedRole : ""
      });
      setSuccess(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="container">
      <div className="login-box">
        <h2>
          {mode === "login" && `${selectedRoleLabel ? `${selectedRoleLabel} ` : ""}Login`}
          {mode === "signup" && `${selectedRoleLabel ? `${selectedRoleLabel} ` : ""}Signup`}
        </h2>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        {mode === "login" && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={loginData.email}
              onChange={(e) => handleChange(setLoginData, { email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginData.password}
              onChange={(e) => handleChange(setLoginData, { password: e.target.value })}
            />
            <button type="button" onClick={login} disabled={loading}>
              {loading ? "Please wait..." : "Login"}
            </button>
            <p onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}>
              Don't have account? Signup
            </p>
          </>
        )}

        {mode === "signup" && (
          <>
            <input
              type="text"
              placeholder="Full Name"
              value={signupData.name}
              onChange={(e) => handleChange(setSignupData, { name: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email"
              value={signupData.email}
              onChange={(e) => handleChange(setSignupData, { email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              value={signupData.password}
              onChange={(e) => handleChange(setSignupData, { password: e.target.value })}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={signupData.confirmPassword}
              onChange={(e) => handleChange(setSignupData, { confirmPassword: e.target.value })}
            />
            <select
              value={signupData.role}
              disabled={Boolean(selectedRoleLabel)}
              onChange={(e) => handleChange(setSignupData, { role: e.target.value })}
            >
              <option value="">Select Role</option>
              <option value="TEACHER">Teacher</option>
              <option value="STUDENT">Student</option>
            </select>
            <button type="button" onClick={signup} disabled={loading}>
              {loading ? "Please wait..." : "Signup"}
            </button>
            <p onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>
              Already have account? Login
            </p>
          </>
        )}

      </div>
    </div>
  );
}
