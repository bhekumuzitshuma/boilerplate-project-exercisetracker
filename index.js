const express = require('express')
const app = express()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Beginning of this shit!




// connect to MongoDB
mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true });

// create user schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

// create exercise schema
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

// create user and exercise models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// use body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));

// create a new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    const user = await User.create({ username });
    res.json({ username: user.username, _id: user._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// add an exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(_id);
    if (!user) throw new Error('User not found');
    const exercise = await Exercise.create({
      userId: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });
    res.json({
      username: user.username,
      _id: user._id,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// get a user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  try {
    const user = await User.findById(_id);
    if (!user) throw new Error('User not found');
    let query = { userId: user._id };
    if (from && to) {
      query.date = { $gte: new Date(from), $lte: new Date(to) };
    } else if (from) {
      query.date = { $gte: new Date(from) };
    } else if (to) {
      query.date = { $lte: new Date(to) };
    }
    const exercises = await Exercise.find(query)
      .sort('-date')
      .limit(limit ? parseInt(limit) : undefined)
      .select('-userId')
      .lean()
      .exec();
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      })),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// End of this shit!






const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
