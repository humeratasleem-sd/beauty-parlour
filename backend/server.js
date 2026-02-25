import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(express.json());
app.use(
  cors({
    origin: "http://127.0.0.1:5500", // if your live server runs on 127.0.0.1:5500
    credentials: true,
  })
);

// --- MongoDB Connection ---
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.error(" MongoDB Connection Error:", err));

// --- Schemas ---
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
});

const appointmentSchema = new mongoose.Schema({
  name: String,
  email: String,
  services: [String],
  parlour: String,
  date: String, // YYYY-MM-DD
  time: String, // 24-hour format
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Appointment = mongoose.model("Appointment", appointmentSchema);

// --- Routes ---
app.get("/", (req, res) => res.send(" Blush Beauty API Running!"));

// --- Register ---
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required." });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Email already exists." });

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ name, email, passwordHash });

    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// --- Login ---
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password." });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(401).json({ message: "Invalid email or password." });

    res.json({
      message: "Login successful!",
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});

// --- Book Appointment ---
app.post("/api/appointment", async (req, res) => {
  try {
    const { name, email, services, parlour, date, time } = req.body;

    if (!name || !email || !services || !parlour || !date || !time)
      return res.status(400).json({ message: "All fields are required." });

    // Prevent past date booking
    const selected = new Date(`${date}T${time}`);
    const now = new Date();
    if (selected < now)
      return res.status(400).json({ message: "Cannot book for a past time." });

    // Prevent duplicate slot
    const existing = await Appointment.findOne({ parlour, date, time });
    if (existing)
      return res
        .status(400)
        .json({ message: "This slot is already booked at this parlour." });

    await Appointment.create({ name, email, services, parlour, date, time });
    res.status(201).json({ message: "Appointment booked successfully!" });
  } catch (err) {
    console.error("Appointment Error:", err);
    res.status(500).json({ message: "Error booking appointment." });
  }
});

// --- Fetch All Appointments ---
app.get("/api/appointments", async (req, res) => {
  try {
    const all = await Appointment.find().sort({ date: 1, time: 1 });
    res.json(all);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ message: "Error fetching appointments." });
  }
});

// --- Start Server ---
app.listen(PORT, () =>
  console.log(` Server running on http://localhost:${PORT}`)
);
