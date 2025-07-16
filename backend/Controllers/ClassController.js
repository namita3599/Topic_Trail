const crypto = require("crypto");
const Class = require("../Models/Class");
const User = require("../Models/User");
const Video = require("../Models/Video");
const CloudinaryService = require("../services/CloudinaryService");

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

  try {
    // Find the class by the provided code
    const classObj = await Class.findOne({ code: classCode });

    if (!classObj) {
      console.log("Class not found");
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if the user is already a member of the class
    if (classObj.members.includes(req.user._id)) {
      return res.status(400).json({
        message: "You are already a member of this class",
      });
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

// Leave a class
const leaveClass = async (req, res) => {
  const { classId } = req.params;

  try {
    // Find the class by its ID
    const classObj = await Class.findById(classId);

    if (!classObj) {
      console.log("Class not found");
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if the user is a member of the class
    if (!classObj.members.includes(req.user._id)) {
      return res.status(400).json({
        message: "You are not a member of this class",
      });
    }

    // Check if the user is the creator - creators cannot leave their own class
    if (classObj.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message:
          "Class creators cannot leave their own class. Please delete the class instead.",
      });
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
    const classes = await Class.find({ members: req.user._id })
      .populate("creator", "name email") // Populate creator details
      .lean(); // Convert to plain JavaScript object

    // Add isCreator field to each class
    const classesWithCreatorFlag = classes.map((classObj) => ({
      ...classObj,
      isCreator: classObj.creator._id.toString() === req.user._id.toString(),
    }));

    res.status(200).json({
      message: "Classes retrieved successfully",
      classes: classesWithCreatorFlag,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error retrieving user classes" });
  }
};

// Get a single class by ID
const getClassById = async (req, res) => {
  try {
    const classObj = await Class.findById(req.params.classId)
      .populate("creator", "name email")
      .populate("members", "name email")
      .lean();

    if (!classObj) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if the requesting user is a member of the class
    if (
      !classObj.members.some(
        (member) => member._id.toString() === req.user._id.toString()
      )
    ) {
      return res
        .status(403)
        .json({ message: "You are not a member of this class" });
    }

    // Add isCreator flag
    const classWithCreatorFlag = {
      ...classObj,
      isCreator: classObj.creator._id.toString() === req.user._id.toString(),
    };

    res.status(200).json({
      message: "Class retrieved successfully",
      class: classWithCreatorFlag,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error retrieving class" });
  }
};

// Delete a class (only by the creator)
const deleteClass = async (req, res) => {
  const { classId } = req.params;

  try {
    // Find the class by its ID
    const classObj = await Class.findById(classId);

    // Check if the class exists
    if (!classObj) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if the logged-in user is the creator of the class
    if (classObj.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not authorized to delete this class",
      });
    }

    // Find all videos associated with this class
    const videos = await Video.find({ classId });

    // Delete all videos from Cloudinary and database
    for (const video of videos) {
      try {
        // // Get the public ID from the URL
        // const publicId = CloudinaryService.getPublicIdFromUrl(
        //   video.cloudinaryUrl
        // );

        // // Delete from Cloudinary
        // await CloudinaryService.deleteVideo(publicId);

        await CloudinaryService.deleteVideo(video.public_id);


        // Delete video document
        await video.deleteOne();
      } catch (error) {
        console.error(`Error deleting video ${video._id}:`, error);
        // Continue with other videos even if one fails
      }
    }

    // Delete the class
    await Class.findByIdAndDelete(classId);

    res.status(200).json({
      message: "Class and associated videos deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error deleting class and associated content",
    });
  }
};

// Update class title
const updateClass = async (req, res) => {
  const { classId } = req.params;
  const { title } = req.body;

  try {
    const classObj = await Class.findById(classId);

    if (!classObj) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if the logged-in user is the creator of the class
    if (classObj.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only class creators can update class details",
      });
    }

    classObj.title = title;
    await classObj.save();

    res.status(200).json({
      message: "Class updated successfully",
      class: classObj,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating class" });
  }
};

// Remove a member (only by class creator)
const removeMember = async (req, res) => {
  const { classId, memberId } = req.params;

  try {
    const classObj = await Class.findById(classId);

    if (!classObj) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if the logged-in user is the creator of the class
    if (classObj.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only class creators can remove members",
      });
    }

    // Prevent removing the creator
    if (memberId === classObj.creator.toString()) {
      return res.status(400).json({
        message: "Cannot remove the class creator",
      });
    }

    // Check if the member exists in the class
    if (!classObj.members.includes(memberId)) {
      return res.status(400).json({
        message: "User is not a member of this class",
      });
    }

    // Remove the member
    classObj.members = classObj.members.filter(
      (userId) => userId.toString() !== memberId
    );
    await classObj.save();

    res.status(200).json({
      message: "Member removed successfully",
      class: classObj,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error removing member" });
  }
};

module.exports = {
  createClass,
  joinClass,
  leaveClass,
  getUserClasses,
  getClassById,
  deleteClass,
  updateClass,
  removeMember,
};
