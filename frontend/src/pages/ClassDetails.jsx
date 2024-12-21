import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "./ClassDetails.css"

const Header = () => {
  return (
    <header className="class-header">
      <div className="logo">
        <img src="path-to-your-logo.png" alt="Logo" />
      </div>
      <div className="search-container">
        <input type="text" placeholder="Search..." />
      </div>
    </header>
  );
};

const ClassDetails = () => {
  const { id } = useParams(); // Get the class ID from the URL parameters
  const classCode = localStorage.getItem("classCode"); // Retrieve class code from localStorage
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyClassCode = () => {
    if (classCode) {
      navigator.clipboard.writeText(classCode)
        .then(() => {
          setCopySuccess(true);
          toast.success("Class code copied to clipboard!");
        })
        .catch((err) => {
          setCopySuccess(false);
          toast.error("Failed to copy class code.");
        });
    } else {
      toast.error("No class code available to copy.");
    }
  };

  return (
    <div>
      <Header />
      <div className="class-details-container">
        <h2>Class Details</h2>
        {/* Display the class code */}
        {classCode ? (
          <div>
            <p><strong>Class Code:</strong> {classCode}</p>
            <button onClick={handleCopyClassCode}>
              {copySuccess ? "Copied!" : "Copy Class Code"}
            </button>
          </div>
        ) : (
          <p>No class code found.</p>
        )}
        <ToastContainer />
      </div>
    </div>
  );
};

export default ClassDetails;
