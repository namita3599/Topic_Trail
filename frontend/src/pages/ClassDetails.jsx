// ClassDetails.js
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import ClassHeader from '../assets/ClassHeader'; // Import ClassHeader
import './ClassDetails.css';

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
      <ClassHeader 
        classCode={classCode} 
        handleCopyClassCode={handleCopyClassCode} 
        copySuccess={copySuccess}
      />
      <div className="class-details-container">
        <h2>Class Details</h2>
        {/* Display additional class details here */}
        <ToastContainer />
      </div>
    </div>
  );
};

export default ClassDetails;
