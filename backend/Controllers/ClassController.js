const crypto = require("crypto");
const Class = require("../Models/Class");
const User = require("../Models/User");

// Function to generate a random class code
const generateClassCode = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

// Create a new class
const createClass = async (req, res) => {
  try {
    let classCode;
    let classExists = true;

    // Generate a unique class code
    while (classExists) {
      classCode = generateClassCode();

      // Check if the class code already exists in the database
      const existingClass = await Class.findOne({ code: classCode });
      classExists = !!existingClass; // If the class exists, try again
    }

    // Create a new class object
    const newClass = new Class({
      title: req.body.title,
      code: classCode,
      creator: req.user._id, // The creator is the authenticated user
      members: [req.user._id], // The creator is automatically added as a member
    });

    // Save the new class to the database
    await newClass.save();

    res.status(201).json({
      message: "Class created successfully!",
      class: newClass,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating class" });
  }
};

// Join a class by entering the class code
const joinClass = async (req, res) => {
  const { classCode } = req.body;
//   console.log(Received classCode: ${classCode}); // Log the received class code

  try {
    // Find the class by the provided code
    const classObj = await Class.findOne({ code: classCode });
    // console.log(Class found: ${classObj}); // Log the class object if found

    if (!classObj) {
      console.log("Class not found"); // Log if the class is not found
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if the user is already a member of the class
    if (classObj.members.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You are already a member of this class" });
    }

    // Add the user to the class members
    classObj.members.push(req.user._id);
    await classObj.save();

    res.status(200).json({
      message: "Successfully joined the class",
      class: classObj,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error joining class" });
  }
};


const leaveClass = async (req, res) => {
  const { classId } = req.params;
//   console.log(Received classId: ${classId}); // Log the received classId

  try {
    // Find the class by its ID
    const classObj = await Class.findById(classId);

    if (!classObj) {
      console.log("Class not found"); // Log if the class is not found
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if the user is a member of the class
    if (!classObj.members.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You are not a member of this class" });
    }

    // Remove the user from the class members
    classObj.members = classObj.members.filter(
      (userId) => userId.toString() !== req.user._id.toString()
    );
    await classObj.save();

    res.status(200).json({
      message: "You have left the class",
      class: classObj,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error leaving class" });
  }
};


// Get all classes of the logged-in user
const getUserClasses = async (req, res) => {
  try {
    // Find all classes where the user is a member
    const classes = await Class.find({ members: req.user._id });

    if (!classes || classes.length === 0) {
      return res.status(404).json({ message: "No classes found for the user" });
    }

    res.status(200).json({
      message: "User classes retrieved successfully",
      classes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error retrieving user classes" });
  }
};
// Delete a class (only by the creator)
const deleteClass = async (req, res) => {
  const { classId } = req.params;

  try {
    // Find the class by its ID
    const classObj = await Class.findById(classId);
    console.log(classId);
    // Check if the class exists
    if (!classObj) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if the logged-in user is the creator of the class
    if (classObj.creator.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this class" });
    }

    // Delete the class
    await Class.findByIdAndDelete(classId);

    res.status(200).json({ message: "Class deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting class" });
  }
};

module.exports = {
  createClass,
  joinClass,
  leaveClass,
  getUserClasses,
  deleteClass, // Add this export
};