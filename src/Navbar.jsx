import React, { useContext } from "react";
import { Link } from "react-router-dom";
import "./static/Navbar.css";
import { AuthContext } from "./AuthContext";
import { auth } from "./firebase";

function Navbar() {
  const { currentUser } = useContext(AuthContext);

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <div className="Navbar">
      <div className="logo">
        <Link to="/" className="Logo-link">
          <h1>TaskSage</h1>
        </Link>
      </div>
      <div className="nav">
        <ul>
          <Link to="/" className="nav-link"><li>Home</li></Link>
          <Link to="/Notes" className="nav-link"><li>Notes</li></Link>
          <Link to="/Task" className="nav-link"><li>Task</li></Link>
        </ul>
      </div>
      <div className="SignUp">
        {currentUser ? (
          <button className="auth-btn" onClick={handleLogout}>Logout</button>
        ) : (
          <Link to="/auth">
            <button className="auth-btn">Sign Up</button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default Navbar;
