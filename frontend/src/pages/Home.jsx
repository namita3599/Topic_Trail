import React, { useEffect, useState, useContext } from "react";
import Header from "../components/Header";
import styles from "./Home.module.css";
import { ToastContainer, toast } from "react-toastify";
import { handleError } from "../utils";
import { useNavigate } from "react-router-dom";
import { MoreVertical } from "lucide-react";
import { ThemeContext } from "../components/ThemeContext"; // Importing ThemeContext

function Home() {
  const [allClasses, setAllClasses] = useState([]);
  const [yourClasses, setYourClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [filter, setFilter] = useState("all");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const { isDarkMode } = useContext(ThemeContext); // Accessing dark mode state

  useEffect(() => {
    const fetchClasses = async () => {
      if (!token) {
        console.error("No token found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:8080/classes", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch classes. Please try again.");
        }

        const result = await response.json();
        const userId = JSON.parse(atob(token.split(".")[1]))._id;

        const enrichedClasses = await Promise.all(
          result.classes.map(async (classItem) => {
            try {
              const videosResponse = await fetch(
                `http://localhost:8080/videos/class/${classItem._id}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              const videosData = await videosResponse.json();

              return {
                ...classItem,
                thumbnailUrl:
                  videosData.length > 0 ? videosData[0].thumbnailUrl : null,
              };
            } catch (err) {
              console.error(
                `Error fetching videos for class ${classItem.title}: ${err.message}`
              );
              return {
                ...classItem,
                thumbnailUrl: null,
              };
            }
          })
        );

        const yourClasses = enrichedClasses.filter(
          (c) => c.creator._id === userId
        );

        setYourClasses(yourClasses);
        setAllClasses(enrichedClasses);
      } catch (err) {
        console.error("Error in fetchClasses:", err.message);
        handleError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [token]);

  const handleCardClick = (classId, classCode) => {
    localStorage.setItem("classCode", classCode);
    navigate(`/class/${classId}`);
  };

  const handleDeleteClass = async (classId, event) => {
    event.stopPropagation();
    setOpenMenuId(null);

    try {
      const response = await fetch(`http://localhost:8080/classes/${classId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete the class.");
      }

      setYourClasses((prev) => prev.filter((c) => c._id !== classId));
      toast.success("Class deleted successfully.");
    } catch (err) {
      toast.error(err.message || "An error occurred.");
    }
  };

  const handleLeaveClass = async (classId, event) => {
    event.stopPropagation();
    setOpenMenuId(null);

    try {
      const response = await fetch(
        `http://localhost:8080/classes/${classId}/leave`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to leave the class.");
      }

      setAllClasses((prev) => prev.filter((c) => c._id !== classId));
      toast.success("You have left the class.");
    } catch (err) {
      console.error("Error leaving class:", err.message);
      toast.error(err.message || "An error occurred.");
    }
  };

  const ClassCard = ({ classItem, isCreator }) => (
    <div
      className={styles.classCard}
      onClick={() => handleCardClick(classItem._id, classItem.code)}
      role="button"
    >
      <div className={styles.classThumbnail}>
        {classItem.thumbnailUrl ? (
          <img
            src={classItem.thumbnailUrl || "/public/placeholder_class.png"}
            alt={`${classItem.title} thumbnail`}
          />
        ) : (
          <div className={styles.noVideo}>
            <img src="./public/placeholder_class.png" alt="Placeholder" />
          </div>
        )}
      </div>
      <div className={styles.infoOptions}>
        <div className={styles.info}>
          <h2>{classItem.title}</h2>
          <p>Created by: {classItem.creator.name}</p>
        </div>
        <div className={styles.options}>
          <button
            className={styles.menuButton}
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(
                openMenuId === classItem._id ? null : classItem._id
              );
            }}
          >
            <MoreVertical size={20} />
          </button>
          {openMenuId === classItem._id && (
            <div className={styles.menuDropdown}>
              {isCreator ? (
                <button onClick={(e) => handleDeleteClass(classItem._id, e)}>
                  Delete Class
                </button>
              ) : (
                <button onClick={(e) => handleLeaveClass(classItem._id, e)}>
                  Leave Class
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const filteredClasses = filter === "yours" ? yourClasses : allClasses;

  return (
    <div className={`${styles.homeContainer} ${isDarkMode ? styles.dark : ""}`}>
      <Header />
      <div className={styles.spacer}></div>
      <div className={styles.classesFilter}>
        <h1>Classes</h1>
        <select onChange={(e) => setFilter(e.target.value)} value={filter}>
          <option value="all">All Classes</option>
          <option value="yours">Your Classes</option>
        </select>
      </div>
      <div className={styles.classesGrid}>
        {loading ? (
          <p>Loading classes...</p>
        ) : filteredClasses.length === 0 ? (
          <p>No classes available.</p>
        ) : (
          filteredClasses.map((classItem) => (
            <ClassCard
              key={classItem._id}
              classItem={classItem}
              isCreator={filter === "yours"}
            />
          ))
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

export default Home;
