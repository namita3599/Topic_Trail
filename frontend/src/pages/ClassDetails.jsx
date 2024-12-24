import React, { useEffect, useState } from 'react';
import ClassHeader from '../components/ClassHeader';
import { useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ClassDetails = () => {
  const { id: classId } = useParams(); // Extract classId from URL params

  console.log('classId from URL:', classId);

  const [classCode, setClassCode] = useState("");
  const [videos, setVideos] = useState([]); // State to store videos
  const [loading, setLoading] = useState(true); // State for loading spinner
  const token = localStorage.getItem("token"); // Fetch token from localStorage

  useEffect(() => {
    // Fetch the class code from localStorage
    const storedClassCode = localStorage.getItem('classCode');
    if (storedClassCode) {
      setClassCode(storedClassCode);
    }
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!token) {
        toast.error("Please log in to view videos.");
        setLoading(false);
        return;
      }

      if (!classId) {
        toast.error("Class ID is missing in the URL.");
        setLoading(false);
        return;
      }

      try {
        // Fetch videos for the class
        const response = await fetch(
          `http://localhost:8080/videos/class/${classId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch videos. Please try again.");
        }

        const result = await response.json();
        setVideos(result); // Store videos in state
      } catch (err) {
        toast.error(err.message || "An error occurred while fetching videos.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [classId, token]);

  return (
    <div className="class-details">
      <ClassHeader classCode={classCode} />

      <div className="class-details-content">
        <h1>Class Videos</h1>

        {loading ? (
          <p>Loading videos...</p>
        ) : videos.length === 0 ? (
          <p>No videos available for this class.</p>
        ) : (
          <div className="videos-grid">
            {videos.map((video) => (
              <div
                key={video._id}
                className="video-card"
                onClick={() => window.open(video.cloudinaryUrl, "_blank")}
                role="button"
              >
                <h2 className="video-title">{video.title}</h2>
              </div>
            ))}
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};

export default ClassDetails;
