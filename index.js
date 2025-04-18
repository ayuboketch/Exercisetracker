const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Basic Configuration
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Connect to MongoDB with a specific database name to avoid conflicts
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'exerciseTracker' // Explicitly set the database name
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Schema definitions - make sure they match expected output formats
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
}, {
  versionKey: false // Avoid adding __v field
});

// Explicitly define the collection name to avoid conflicts
const User = mongoose.model('User', userSchema, 'exerciseUsers');

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
}, {
  versionKey: false // Avoid adding __v field
});

// Explicitly define the collection name to avoid conflicts
const Exercise = mongoose.model('Exercise', exerciseSchema, 'exercises');

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    // Create new user with the provided username
    const newUser = new User({ username: req.body.username });
    const savedUser = await newUser.save();
    
    // Return the user object exactly as required by the tests
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).send('Error creating user');
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    // Fetch all users
    const users = await User.find({}).select('username _id');
    res.json(users);
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).send('Error getting users');
  }
});

// Add an exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  let { description, duration, date } = req.body;
  
  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    // Create exercise object
    let exerciseDate;
    if (!date) {
      exerciseDate = new Date(); // Use current date if not provided
    } else {
      exerciseDate = new Date(date);
      if (exerciseDate.toString() === 'Invalid Date') {
        exerciseDate = new Date(); // Fallback to current date if invalid
      }
    }
    
    // Create and save the exercise
    const exercise = new Exercise({
      userId: userId,
      description: description,
      duration: Number(duration),
      date: exerciseDate
    });
    
    await exercise.save();
    
    // Return the formatted response exactly as required
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });
    
  } catch (err) {
    console.error('Error adding exercise:', err);
    res.status(500).send('Error adding exercise');
  }
});

// Get user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  
  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    // Build the query for exercises
    const query = { userId: userId };
    
    if (from || to) {
      query.date = {};
      if (from) {
        query.date.$gte = new Date(from);
      }
      if (to) {
        query.date.$lte = new Date(to);
      }
    }
    
    // Find exercises with optional limit
    let exerciseQuery = Exercise.find(query);
    
    if (limit) {
      exerciseQuery = exerciseQuery.limit(Number(limit));
    }
    
    const exercises = await exerciseQuery.exec();
    
    // Format log entries
    const formattedLog = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));
    
    // Return the complete response
    res.json({
      _id: user._id,
      username: user.username,
      count: formattedLog.length,
      log: formattedLog
    });
    
  } catch (err) {
    console.error('Error getting exercise log:', err);
    res.status(500).send('Error getting exercise log');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;