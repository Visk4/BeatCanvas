import React from "react";
import { Link } from "react-router-dom";
import "../styles/Navbar.css";

export default function Navbar() {
    return (
        <nav className="dashboard-navbar">
            <div className="nav-logo">Beat Canvas Dashboard</div>
            <div className="nav-links">
                <Link to="/template-extraction">Template Extraction</Link>
                <Link to="/beat-detection">Beat Detection</Link>
            </div>
        </nav>
    );
}
