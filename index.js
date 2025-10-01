// (1) CONFIGURACIÓN INICIAL
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// (2) MIDDLEWARES
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// (3) DEFINIR ESQUEMAS Y MODELOS
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

// (4) RUTAS DE LA API

// (5) RUTA PRINCIPAL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// (5.1) CREAR UN NUEVO USUARIO
app.post('/api/users', async (req, res) => {
  const newUser = new User({ username: req.body.username });
  try {
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Error saving user' });
  }
});

// (5.2) OBTENER UNA LISTA DE TODOS LOS USUARIOS
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// (5.3) AÑADIR UN EJERCICIO A UN USUARIO
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

// (5.4) OBTENER EL REGISTRO DE EJERCICIOS DE UN USUARIO
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


// (6) INICIAR SERVIDOR Y BASE DE DATOS
const startServer = async () => {
  try {
    // (6.1) ESPERAR A QUE LA CONEXIÓN A MONGOOSE SEA EXITOSA
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Conectado exitosamente a MongoDB.");

    // (6.2) INICIAR EL SERVIDOR DE EXPRESS
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Tu aplicación está escuchando en el puerto ${PORT}`);
    });

  } catch (err) {
    console.error("Error al conectar a MongoDB:", err);
  }
};

// (7) INICIAR TODO
startServer();