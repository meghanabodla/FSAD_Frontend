import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-container">
      <div className="hero-section">
        {/* Use logo from public folder */}
        <img src="KLLOGO.png" alt="KL Logo" className="header-logo" />

        <h2>Streamline Your Academic Journey</h2>

        <p className="quote">
          “Success is the sum of small efforts, repeated day in and day out.”
        </p>

        <p className="description">
          Submit assignments, manage deadlines, track grades,
          and simplify the academic workflow for both students and teachers.
        </p>

        <div className="home-buttons">
          <Link to="/login">
            <button className="primary-btn">Login</button>
          </Link>
        </div>
      </div>

      <div className="info-section">
        <Link to="/login?role=STUDENT" className="info-card role-card">
          <h3>For Students</h3>
          <p>Submit assignments and track feedback easily.</p>
        </Link>

        <Link to="/login?role=TEACHER" className="info-card role-card">
          <h3>For Teachers</h3>
          <p>Create assignments and evaluate submissions efficiently.</p>
        </Link>

        <div className="info-card">
          <h3>Organized System</h3>
          <p>All academic activities in one structured platform.</p>
        </div>
      </div>
    </div>
  );
}
