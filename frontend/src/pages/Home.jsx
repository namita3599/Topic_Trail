import React, { useEffect, useState } from "react";
import Header from "../assets/Header";
import "./Home.css";
import { ToastContainer, toast } from "react-toastify";
import { handleError } from "../utils";
import { useNavigate } from "react-router-dom";

function Home() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClasses = async () => {
      if (!token) {
        handleError("No token found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        // Fetch classes from the backend
        const response = await fetch("http://localhost:8080/classes", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch classes. Please try again.");
        }

        const result = await response.json();
        const classesWithCreators = await Promise.all(
          result.classes.map(async (classItem) => {
            try {
              // Fetch creator details
              const creatorResponse = await fetch(
                `http://localhost:8080/users/${classItem.creator}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                  },
                }
              );

              if (!creatorResponse.ok) {
                throw new Error("Failed to fetch creator details.");
              }

              const creatorData = await creatorResponse.json();
              return { ...classItem, creatorName: creatorData.name };
            } catch (err) {
              // Fallback if creator details fail
              console.error(
                `Error fetching creator for class ${classItem.title}: ${err.message}`
              );
              return { ...classItem, creatorName: "Unknown" };
            }
          })
        );

        setClasses(classesWithCreators);
      } catch (err) {
        handleError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [token]);

  const handleCardClick = (classId) => {
    navigate(`/class/${classId}`);
  };

  const handleLeaveClass = async (classId, event) => {
    event.stopPropagation(); // Prevents triggering parent `onClick` events

    if (!token) {
      toast.error("Please log in to leave a class.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/classes/${classId}/leave`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to leave the class.");
      }

      setClasses((prevClasses) => {
        const updatedClasses = prevClasses.filter((classItem) => classItem._id !== classId);
        return updatedClasses;
      });

      toast.success(result.message || "You have left the class.");
    } catch (err) {
      toast.error(err.message || "An error occurred.");
    }
  };

  const handleDeleteClass = async (classId, event) => {
    event.stopPropagation();

    if (!token) {
      toast.error("Please log in to delete a class.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/classes/${classId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You are not authorized to delete this class.");
        }
        if (response.status === 404) {
          throw new Error("Class not found.");
        }
        throw new Error(result.message || "Failed to delete the class.");
      }

      setClasses((prevClasses) => {
        const updatedClasses = prevClasses.filter((classItem) => classItem._id !== classId);
        return updatedClasses;
      });

      toast.success(result.message || "Class deleted successfully.");
    } catch (err) {
      toast.error(err.message || "An error occurred.");
    }
  };

  return (
    <div>
      <Header />
      <div className="spacer"></div>
      <div className="home-container">
        <h1>Your Classes</h1>
        {loading ? (
          <p>Loading classes...</p>
        ) : classes.length === 0 ? (
          <p>You are not part of any classes yet.</p>
        ) : (
          <div className="classes-grid">
            {classes.map((classItem) => (
              <div
                key={classItem._id}
                className="class-card"
                onClick={() => handleCardClick(classItem._id)}
                role="button"
              >
                <h2>{classItem.title}</h2>
                <p>Created by: {classItem.creatorName}</p>
                <div className="class-card-buttons">
                <button
                  className="leave-button"
                  onClick={(event) => handleLeaveClass(classItem._id, event)}
                >
                  Leave Class
                </button>
                <button
                  className="delete-button"
                  onClick={(event) => handleDeleteClass(classItem._id, event)}
                >
                  Delete Class
                </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <ToastContainer />
      </div>
    </div>
  );
}

export default Home;
