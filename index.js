// (1) CONFIGURACIÓN INICIAL
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// (2) CONECTAR A LA BASE DE DATOS (MONGODB ATLAS)
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// (3) DEFINIR ESQUEMAS Y MODELOS CON MONGOOSE
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

// (4) MIDDLEWARES
app.use(cors());
app.use(express.urlencoded({ extended: true })); // Body-parser para datos de formularios
app.use(express.static(path.join(__dirname, 'public')));

// (5) RUTAS DE LA API

// (5.1) RUTA PRINCIPAL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// (5.2) CREAR UN NUEVO USUARIO
app.post('/api/users', async (req, res) => {
  const newUser = new User({ username: req.body.username });
  try {
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Error saving user' });
  }
});

// (5.3) OBTENER UNA LISTA DE TODOS LOS USUARIOS
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});

// (5.4) AÑADIR UN EJERCICIO A UN USUARIO
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date() 
    });

    const savedExercise = await newExercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString() 
    });
  } catch (err) {
    res.status(500).json({ error: "Error saving exercise" });
  }
});

// (5.5) OBTENER EL REGISTRO DE EJERCICIOS DE UN USUARIO
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    let dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    let filter = { userId };
    if (from || to) filter.date = dateFilter;

    const exercises = await Exercise.find(filter).limit(parseInt(limit) || 500);

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log
    });

  } catch (err) {
    res.status(500).json({ error: "Error retrieving logs" });
  }
});

// (6) INICIAR EL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Tu aplicación está escuchando en el puerto ${PORT}`);
});