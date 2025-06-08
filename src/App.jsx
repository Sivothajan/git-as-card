import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Git from "./components/Git/Git";
import "./App.css";

function App() {
  useEffect(() => {
    // Add ready class for transitions after initial load
    document.body.classList.add("ready");

    // Focus search input when pressing '/'
    const handleKeyPress = (e) => {
      if (e.key === "/" && e.target.tagName !== "INPUT") {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <Router>
      <div className="app-container">
        <div className="background-gradient"></div>
        <Routes>
          <Route path="/" element={<Git />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
