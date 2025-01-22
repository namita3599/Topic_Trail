import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import {
  FaChevronDown,
  FaChevronUp,
  FaBookOpen,
  FaQuestionCircle,
  FaStickyNote,
  FaPlusCircle,
  FaClipboardList,
} from "react-icons/fa";
import Header from "../components/HeaderVideo";
import CustomVideoPlayer from "../components/CustomVideoPlayer";
import EditableSummary from "../components/EditableSummary";
import "./CustomVideoDetails.css";

const QuizForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    numberOfQuestions: "",
    difficulty: "medium",
    additionalInstructions: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Number of Questions
        </label>
        <input
          type="number"
          min="1"
          max="20"
          required
          value={formData.numberOfQuestions}
          onChange={(e) =>
            setFormData({ ...formData, numberOfQuestions: e.target.value })
          }
          className="w-full p-2 border rounded dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Difficulty
        </label>
        <select
          value={formData.difficulty}
          onChange={(e) =>
            setFormData({ ...formData, difficulty: e.target.value })
          }
          className="w-full p-2 border rounded dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Additional Instructions
        </label>
        <textarea
          value={formData.additionalInstructions}
          onChange={(e) =>
            setFormData({ ...formData, additionalInstructions: e.target.value })
          }
          className="w-full p-2 border rounded h-24 dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
          placeholder="Optional instructions for quiz generation..."
        />
      </div>
      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white py-2 px-4 rounded-lg transition-colors"
      >
        Generate Quiz
      </button>
    </form>
  );
};

const VideoDetails = () => {
  const { videoId } = useParams();
  const location = useLocation();
  const [isCreator, setIsCreator] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState({ heading: "", content: "" });
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const token = localStorage.getItem("token");
  const [submissions, setSubmissions] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const baseUrl = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const creatorStatus = searchParams.get("isCreator") === "true";
    setIsCreator(creatorStatus);
    fetchVideoDetails();
    fetchNotes();
  }, [videoId, location]);

  const fetchVideoDetails = async () => {
    if (!token) {
      toast.error("You need to log in to view video details.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${baseUrl}videos/${videoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch video details.");
      const result = await response.json();
      setSelectedVideo(result);
      if (!result.mcqs || result.mcqs.length === 0) {
        setShowQuizForm(true);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async (formData) => {
    setGeneratingQuiz(true);
    // Reset quiz-related states when generating new quiz
    setUserAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);

    try {
      const response = await fetch(
        `${baseUrl}videos/${videoId}/generate-quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) throw new Error("Failed to generate quiz");

      const result = await response.json();

      // Update the selected video with new MCQs
      setSelectedVideo((prev) => ({
        ...prev,
        mcqs: result.mcqs.map((mcq) => ({
          ...mcq,
          _id: mcq._id || `mcq-${Math.random().toString(36).substr(2, 9)}`, // Ensure each MCQ has a unique ID
        })),
      }));

      setShowQuizForm(false);
      toast.success("Quiz generated successfully!");
    } catch (error) {
      toast.error(error.message);
      // Reset quiz-related states on error
      setUserAnswers({});
      setQuizSubmitted(false);
      setQuizScore(0);
    } finally {
      setGeneratingQuiz(false);
    }
  };
  const fetchNotes = async () => {
    try {
      const response = await fetch(`${baseUrl}videos/${videoId}/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setNotes(result);
      }
    } catch (err) {
      toast.error("Failed to fetch notes");
    }
  };

  const handleAddNote = async () => {
    try {
      const response = await fetch(`${baseUrl}videos/${videoId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newNote),
      });

      if (response.ok) {
        const result = await response.json();
        setNotes([...notes, result]);
        setNewNote({ heading: "", content: "" });
        toast.success("Note added successfully");
      }
    } catch (err) {
      toast.error("Failed to add note");
    }
  };

  const handleRetryQuiz = () => {
    setUserAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    window.scrollTo(0, 0); // Scroll to the top
  };

  const handleSubmitQuiz = () => {
    let score = 0;
    selectedVideo.mcqs.forEach((question) => {
      if (userAnswers[question._id] === question.correctAnswerIndex) {
        score++;
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);

    // Scroll to the top of the quiz section
    window.scrollTo({
      top: document.querySelector(".quiz-section").offsetTop,
      behavior: "smooth",
    });
  };

  const handleAnswerChange = (questionId, index) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: index,
    }));
  };

  // Replace the existing getQuizOptionClass function
  const getQuizOptionClass = (questionId, optionIndex) => {
    const baseClasses = "mb-2 p-3 rounded-lg cursor-pointer transition-colors";
    const currentQuestion = selectedVideo.mcqs.find(
      (q) => q._id === questionId
    );
    const isSelected = userAnswers[questionId] === optionIndex;

    if (quizSubmitted) {
      const isCorrect = optionIndex === currentQuestion.correctAnswerIndex;

      if (isSelected && isCorrect) {
        return `${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100`;
      }
      if (isSelected && !isCorrect) {
        return `${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100`;
      }
      if (!isSelected && isCorrect) {
        return `${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100`;
      }
      return `${baseClasses} bg-gray-50 dark:bg-zinc-800`;
    }

    return `${baseClasses} ${
      isSelected
        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100"
        : "bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700"
    }`;
  };

  if (loading) return <p>Loading video details...</p>;
  if (!selectedVideo) return <p>Video not found.</p>;

  return (
    <div className="flex flex-col min-h-screen dark:bg-black">
      <Header />
      <div className="flex flex-wrap gap-6 p-6 mt-20">
        {/* Left column with video player */}
        <div className="flex-1 min-w-[55%] space-y-6">
          <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
            <CustomVideoPlayer
              url={selectedVideo.cloudinaryUrl}
              thumbnail={selectedVideo.thumbnailUrl}
            />
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedVideo.title}
            </h1>
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                Description
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {selectedVideo.description}
              </p>
            </div>
          </div>
        </div>

        {/* Right column with interactive sections */}
        <div className="flex-1 min-w-[40%] bg-gray-50 dark:bg-zinc-900 p-6 rounded-lg shadow-lg">
          {/* Section toggle buttons */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {["Summary", "Quiz", "Notes"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setShowSummary(item === "Summary" ? !showSummary : false);
                  setShowQuiz(item === "Quiz" ? !showQuiz : false);
                  setShowNotes(item === "Notes" ? !showNotes : false);
                }}
                className="w-full flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white py-2 px-2 rounded-lg transition-colors text-sm sm:text-base"
              >
                {item === "Summary" && <FaBookOpen className="flex-shrink-0" />}
                {item === "Quiz" && (
                  <FaQuestionCircle className="flex-shrink-0" />
                )}
                {item === "Notes" && <FaStickyNote className="flex-shrink-0" />}
                <span className="hidden md:inline">{item}</span>
                {(item === "Summary" && showSummary) ||
                (item === "Quiz" && showQuiz) ||
                (item === "Notes" && showNotes) ||
                <FaChevronDown className="flex-shrink-0" />
                }
              </button>
            ))}
          </div>

          {/* Content sections */}
          <div className="relative">
            {/* Summary Section */}
            {showSummary && (
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-lg mb-6 h-96 overflow-y-auto">
                {!selectedVideo.summary ||
                selectedVideo.summary.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <img
                      src="/public/loading_gif1.gif"
                      alt="Loading..."
                      className="w-16 h-16"
                    />
                  </div>
                ) : isCreator ? (
                  <EditableSummary
                    summary={selectedVideo.summary}
                    videoId={videoId}
                    onSummaryUpdate={(updatedSummary) => {
                      setSelectedVideo({
                        ...selectedVideo,
                        summary: updatedSummary,
                      });
                    }}
                  />
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                      Summary
                    </h3>
                    <div className="space-y-4">
                      {selectedVideo.summary.map((item, index) => (
                        <div
                          key={index}
                          className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg"
                        >
                          <h4 className="font-medium mb-2 text-gray-900 dark:text-white">
                            {item.title}
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300">
                            {item.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quiz Section */}
            {showQuiz && (
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-lg h-96 overflow-y-auto quiz-section">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
                    Quiz
                  </h3>
                  {!showQuizForm && (
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => setShowQuizForm(true)}
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white py-1.5 px-3 rounded-lg transition-colors text-sm"
                      >
                        New Quiz <FaPlusCircle size={12} />
                      </button>
                    </div>
                  )}
                </div>
                {generatingQuiz ? (
                  <div className="flex items-center justify-center h-64">
                    <img
                      src="/public/loading_gif1.gif"
                      alt="Generating quiz..."
                      className="w-16 h-16"
                    />
                  </div>
                ) : showQuizForm ? (
                  <QuizForm onSubmit={handleGenerateQuiz} />
                ) : (
                  <div className="space-y-6">
                    {quizSubmitted && (
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Your Score: {quizScore} /{" "}
                            {selectedVideo.mcqs.length}
                          </h4>
                        </div>
                        <button
                          onClick={handleRetryQuiz}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          Retry Quiz
                        </button>
                      </div>
                    )}

                    {selectedVideo.mcqs.map((question) => (
                      <div key={question._id} className="space-y-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {question.question}
                        </p>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={`${question._id}-${optionIndex}`}
                              onClick={() =>
                                !quizSubmitted &&
                                handleAnswerChange(question._id, optionIndex)
                              }
                              className={getQuizOptionClass(
                                question._id,
                                optionIndex
                              )}
                            >
                              <span className="text-gray-700 dark:text-gray-300">
                                {option}
                              </span>
                            </div>
                          ))}
                        </div>
                        {quizSubmitted && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-3 bg-gray-50 dark:bg-zinc-800 rounded">
                            {question.explanation}
                          </p>
                        )}
                      </div>
                    ))}

                    {!quizSubmitted && selectedVideo.mcqs.length > 0 && (
                      <button
                        onClick={handleSubmitQuiz}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white py-2 px-4 rounded-lg transition-colors"
                      >
                        Submit Quiz
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {showNotes && (
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-lg mb-6 h-96 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Notes
                </h3>
                <div className="space-y-4 mb-6">
                  <input
                    type="text"
                    placeholder="Note heading"
                    value={newNote.heading}
                    onChange={(e) =>
                      setNewNote({ ...newNote, heading: e.target.value })
                    }
                    className="w-full p-2 border rounded dark:bg-zinc-800 dark:text-white dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-zinc-600"
                  />
                  <textarea
                    placeholder="Note content"
                    value={newNote.content}
                    onChange={(e) =>
                      setNewNote({ ...newNote, content: e.target.value })
                    }
                    className="w-full p-2 border rounded h-24 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-zinc-600"
                  />
                  <button
                    onClick={handleAddNote}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Add Note
                  </button>
                </div>
                <div className="space-y-4">
                  {notes.map((note, index) => (
                    <div
                      key={index}
                      className="border-b dark:border-zinc-800 pb-4"
                    >
                      <h4 className="font-medium mb-2 text-gray-900 dark:text-white">
                        {note.heading}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

// Add the missing helper functions
const fetchNotes = async () => {
  try {
    const response = await fetch(`${baseUrl}videos/${videoId}/notes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.ok) {
      const result = await response.json();
      setNotes(result);
    }
  } catch (err) {
    toast.error("Failed to fetch notes");
  }
};

const handleAddNote = async () => {
  try {
    const response = await fetch(`${baseUrl}videos/${videoId}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newNote),
    });

    if (response.ok) {
      const result = await response.json();
      setNotes([...notes, result]);
      setNewNote({ heading: "", content: "" });
      toast.success("Note added successfully");
    }
  } catch (err) {
    toast.error("Failed to add note");
  }
};

const handleAnswerChange = (questionId, index) => {
  setUserAnswers({ ...userAnswers, [questionId]: index });
};

const handleSubmitQuiz = () => {
  let score = 0;
  selectedVideo.mcqs.forEach((question) => {
    if (userAnswers[question._id] === question.correctAnswerIndex) {
      score++;
    }
  });
  setQuizScore(score);
  setQuizSubmitted(true);

  window.scrollTo({
    top: document.querySelector(".quiz-section").offsetTop,
    behavior: "smooth",
  });
};

const getQuizOptionClass = (questionId, index, isSelected) => {
  const baseClasses = "mb-2 p-3 rounded-lg cursor-pointer transition-colors";

  if (quizSubmitted) {
    const isCorrect =
      index ===
      selectedVideo.mcqs.find((q) => q._id === questionId).correctAnswerIndex;
    if (isSelected && isCorrect) {
      return `${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100`;
    }
    if (isSelected && !isCorrect) {
      return `${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100`;
    }
    if (!isSelected && isCorrect) {
      return `${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100`;
    }
    return `${baseClasses} bg-gray-50 dark:bg-zinc-800`;
  }

  return `${baseClasses} ${
    isSelected
      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100"
      : "bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700"
  }`;
};

export default VideoDetails;
