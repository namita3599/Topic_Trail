import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./VideoDetails.css";
import Header from "../components/HeaderVideo";
import CustomVideoPlayer from "../components/CustomVideoPlayer";
import { FaChevronDown, FaChevronUp } from "react-icons/fa"; // Import icons

const VideoDetails = () => {
  const { videoId } = useParams();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false); // New state to manage summary visibility
  const [showQuiz, setShowQuiz] = useState(false); // State to manage quiz visibility
  const [userAnswers, setUserAnswers] = useState({}); // To track user's answers
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchVideoDetails = async () => {
      if (!token) {
        toast.error("You need to log in to view video details.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:8080/videos/${videoId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch video details.");
        }

        const result = await response.json();
        setSelectedVideo(result);
      } catch (err) {
        toast.error(
          err.message || "An error occurred while fetching video details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchVideoDetails();
  }, [videoId, token]);

  const handleAnswerChange = (questionId, answerIndex) => {
    setUserAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: answerIndex,
    }));
  };

  const handleSubmitQuiz = () => {
    let score = 0;
    selectedVideo.mcqs.forEach((question) => {
      if (userAnswers[question._id] === question.correctAnswerIndex) {
        score++;
      }
    });
    toast.success(`Your score: ${score} / ${selectedVideo.mcqs.length}`);
  };

  if (loading) return <p>Loading video details...</p>;
  if (!selectedVideo) return <p>Video not found.</p>;

 return (
   <div className="video-details">
     <Header />
     <div className="video-left">
       <div className="video-container">
         <CustomVideoPlayer
           url={selectedVideo.cloudinaryUrl}
           thumbnail={selectedVideo.thumbnailUrl}
         />
       </div>
       <h1>{selectedVideo.title}</h1>
       <div className="video-description">
         <h3>Description</h3>
         <p>{selectedVideo.description}</p>
       </div>
     </div>

     <div className="video-right">
       <div
         className="summary-toggle"
         onClick={() => setShowSummary(!showSummary)}
       >
         <button className="summary-button">
           {showSummary ? <FaChevronUp /> : <FaChevronDown />}{" "}
           <span>{showSummary ? "Hide Summary" : "Show Summary"}</span>
         </button>
       </div>

       {showSummary && (
         <div className="video-summary">
           <h3>Summary</h3>
           {selectedVideo.summary.length > 0 ? (
             selectedVideo.summary.map((item, index) => (
               <div key={index}>
                 <h4>{item.title}</h4>
                 <p>{item.content}</p>
               </div>
             ))
           ) : (
             <p>No summary available for this video.</p>
           )}
         </div>
       )}

       <div className="quiz-toggle" onClick={() => setShowQuiz(!showQuiz)}>
         <button className="quiz-button">
           {showQuiz ? <FaChevronUp /> : <FaChevronDown />}{" "}
           <span>{showQuiz ? "Hide Quiz" : "Give Quiz"}</span>
         </button>
       </div>

       {showQuiz && (
         <div className="video-quiz">
           <h3>Quiz</h3>
           {selectedVideo.mcqs.map((question) => (
             <div key={question._id} className="quiz-question">
               <p>{question.question}</p>
               {question.options.map((option, index) => (
                 <div key={index}>
                   <input
                     type="radio"
                     name={question._id}
                     value={index}
                     onChange={() => handleAnswerChange(question._id, index)}
                     checked={userAnswers[question._id] === index}
                   />
                   <label>{option}</label>
                 </div>
               ))}
               <p>
                 <small>{question.explanation}</small>
               </p>
             </div>
           ))}
           <button onClick={handleSubmitQuiz}>Submit Quiz</button>
         </div>
       )}
     </div>

     <ToastContainer />
   </div>
 );

};

export default VideoDetails;
