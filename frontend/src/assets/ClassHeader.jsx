import React, { useState } from 'react';
import './ClassHeader.css'; // Add styles for ClassHeader component
import { useNavigate } from 'react-router-dom';

const ClassHeader = ({ classCode, handleCopyClassCode, copySuccess }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/class-details?search=${searchQuery}`);
    }
  };

  return (
    <header className="class-header">
      <div className="logo">
        <img src="/logo.png" alt="Logo" />
      </div>
      <div className="search-container">
        <input 
          type="text" 
          placeholder="Search..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} 
        />
        <button onClick={handleSearch}>Search</button>
      </div>
      <div className="class-code-container">
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
      </div>
    </header>
  );
};

export default ClassHeader;
