import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import CursorEffect from "./CursorEffect";
import TypewriterText from "./TypewriterText";
import FeatureCard from "./FeatureCard";
import WelcomeText from "./WelcomeTest";
// import { useNavigate } from "react-router-dom";
const LandingPage = () => {
  // const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (token) {
      window.location = "/home";
    }
  }, []);

  const features = [
    {
      title: "Streamlined Class Management",
      description:
        "Effortlessly create and delete classes, join or leave using secure class codes, and seamlessly add or remove members while maintaining full control over class membership and engagement.",
      imgSrc: "/one.png",
    },
    {
      title: "Dynamic Video Tools",
      description:
        "Effortlessly upload, download, and delete videos, while leveraging AI to automatically generate topics, summaries, and quizzes. Seamlessly search through topics, and enhance your videos by adding time-stamped notes for a more interactive and insightful viewing experience.",
      imgSrc: "/two.png",
    },
  ];

  return (
    <div className="min-h-screen bg-[#121212] relative text-white">
      <div className="absolute inset-0 z-1">
        <CursorEffect />
      </div>

      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-transparent md:px-6 md:py-4">
        <div className="flex items-center">
          <img
            src="/logo_dark.png"
            alt="Topic Trail Logo"
            className="h-12 md:h-16"
          />
        </div>
        <div className="space-x-2 md:space-x-4 flex">
          <Link
            to="/login"
            className="text-sm px-3 py-1 md:px-4 md:py-2 text-[#7331AC] rounded hover:bg-[#7331AC] hover:bg-opacity-10"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="text-sm px-3 py-1 md:px-4 md:py-2 text-white bg-[#7331AC] rounded hover:bg-opacity-90"
          >
            Sign Up
          </Link>
        </div>
      </header>

      <main className="pt-24 z-10 relative">
        <div className="text-center">
          <WelcomeText />
          <TypewriterText />
        </div>

        <div className="flex justify-center overflow-x-auto py-8 px-4">
          <div className="flex space-x-4">
            {features.map((feature, index) => {
              // Z-axis offsets based on index
              const zAxisOffset = [0, 0][index];

              const yAxisOffset = [0, 0];

              return (
                <FeatureCard
                  key={index}
                  title={feature.title}
                  description={feature.description}
                  imgSrc={feature.imgSrc}
                  initialRotationY={yAxisOffset[index]} // (-20, -10, 0, 10, 20)
                  zAxisOffset={zAxisOffset}
                />
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
