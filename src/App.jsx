import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./Components/Home";
import Notes from "./Components/Notes";
import Task from "./Components/Tasks";
import AuthForm from "./Components/AuthForm";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

const App = () => {
  useEffect(() => {
    // Automatically sign out any previously logged-in user
    signOut(auth)
      .then(() => console.log("Signed out as guest on app load"))
      .catch((error) => console.error("Error signing out:", error));
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/Notes" element={<Notes />} />
        <Route path="/Task" element={<Task />} />
        <Route path="/auth" element={<AuthForm />} />
      </Route>
    </Routes>
  );
};

export default App;
