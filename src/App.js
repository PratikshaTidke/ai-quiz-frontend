
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import './App.css';

// --- Helper Components ---

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <span role="img" aria-label="brain-emoji">🧠</span> AI Quiz App
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            <span className="nav-user">Welcome, {user}!</span>
            <Link to="/quiz" className="nav-link">Start Quiz</Link>
            <Link to="/history" className="nav-link">My History</Link>
            <button onClick={onLogout} className="nav-link-button">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-link">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

// --- Page Components ---

function WelcomePage() {
  return (
    <div className="welcome-container">
      <div className="hero-section">
        <h1 className="hero-title">Unleash Your Knowledge</h1>
        <p className="hero-subtitle">Create, share, and conquer quizzes on any topic imaginable with the power of AI.</p>
        <div className="hero-buttons">
          <Link to="/login" className="button-primary">Login to Get Started</Link>
          <Link to="/register" className="button-secondary">Create an Account</Link>
        </div>
      </div>
    </div>
  );
}

function QuizPage() {
  const [form, setForm] = useState({ topic: '', numQuestions: '', difficulty: '', questionType: '' });
  const [quizData, setQuizData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleAnswerChange = (questionId, selectedOption) => setUserAnswers({ ...userAnswers, [questionId]: selectedOption });

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setQuizData(null);
    setUserAnswers({});
    setScore(null);
    setSubmitted(false);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:8080/api/v1/quiz/generate', form, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setQuizData(response.data);
    } catch (err) {
      setError('Failed to generate quiz. Please check if the backend is running and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (form.questionType === 'MCQ') {
      let correctAnswers = 0;
      quizData.questions.forEach((question) => {
        if (userAnswers[question.id] === question.correctAnswer) correctAnswers++;
      });
      setScore(correctAnswers);

      // New: Save the score to the backend
      try {
        const token = localStorage.getItem('token');
        const payload = {
          topic: quizData.topic,
          score: correctAnswers,
          totalQuestions: quizData.questions.length
        };
        await axios.post('http://localhost:8080/api/history/save', payload, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to save score", err);
      }
    }
    setSubmitted(true);
  };

  const getOptionStyle = (question, option) => {
    const isUserChoice = userAnswers[question.id] === option;
    if (submitted) {
      const isCorrectAnswer = option === question.correctAnswer;
      if (isCorrectAnswer) return 'option correct';
      if (isUserChoice && !isCorrectAnswer) return 'option incorrect';
      return 'option';
    }
    if (isUserChoice) return 'option selected';
    return 'option';
  };

  return (
    <div className="container">
      <header className="header">
        <h1>AI Quiz Generator</h1>
        <p>Create custom quizzes on any topic in seconds!</p>
      </header>
      <form onSubmit={handleGenerateQuiz} className="quiz-form">
        <div className="form-group">
          <label htmlFor="topic">Topic</label>
          <input type="text" id="topic" name="topic" value={form.topic} onChange={handleChange} placeholder="e.g., The Roman Empire" required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="numQuestions">Questions</label>
            <input type="number" id="numQuestions" name="numQuestions" value={form.numQuestions} onChange={handleChange} min="1" max="20" placeholder="e.g., 5" required className="no-spinner" />
          </div>
          <div className="form-group">
            <label htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" name="difficulty" value={form.difficulty} onChange={handleChange} required>
              <option value="" disabled>Select Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="questionType">Type</label>
            <select id="questionType" name="questionType" value={form.questionType} onChange={handleChange} required>
              <option value="" disabled>Select Type</option>
              <option value="MCQ">MCQ</option>
              <option value="Short-answer">Short Answer</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={isLoading} className="button-primary">
          {isLoading ? 'Generating...' : '✨ Generate Quiz'}
        </button>
      </form>
      {isLoading && <div className="message-box loading">Loading your quiz...</div>}
      {error && <div className="message-box error">{error}</div>}
      {quizData && (
        <div className="quiz-display">
          <h2>Your Quiz on "{quizData.topic}"</h2>
          {submitted && form.questionType === 'MCQ' && <div className="score-card">You scored {score} out of {quizData.questions.length}!</div>}
          {quizData.questions.map((item, index) => (
            <div key={item.id} className="question-card">
              <p>{index + 1}. {item.questionText}</p>
              {form.questionType === 'MCQ' ? (
                <div className="options-container">
                  {JSON.parse(item.options).map((option, i) =>
                    <button key={i} disabled={submitted} className={getOptionStyle(item, option)} onClick={() => handleAnswerChange(item.id, option)}>
                      {option}
                    </button>
                  )}
                </div>
              ) : (
                <textarea className="short-answer-input" placeholder="Type your answer here..." disabled={submitted} />
              )}
              {submitted && <div className="correct-answer-reveal">Correct Answer: {item.correctAnswer}</div>}
            </div>
          ))}
          {!submitted && <button onClick={handleSubmitQuiz} className="button-primary">{form.questionType === 'MCQ' ? 'Submit Quiz' : 'Show Answers'}</button>}
        </div>
      )}
    </div>
  );
}

// Login Page (No changes needed)
function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post('http://localhost:8080/api/auth/login', formData);
      onLogin(response.data.token, formData.username);
      navigate('/quiz');
    } catch (err) {
      setError('Invalid username or password.');
    }
  };
  return (
    <div className="container auth-container">
      <form onSubmit={handleSubmit} className="quiz-form">
        <h1 className="auth-title">Welcome Back!</h1>
        {error && <div className="message-box error">{error}</div>}
        <div className="form-group"><label htmlFor="username">Username</label><input type="text" id="username" name="username" onChange={handleChange} required /></div>
        <div className="form-group"><label htmlFor="password">Password</label><input type="password" id="password" name="password" onChange={handleChange} required /></div>
        <button type="submit" className="button-primary">Login</button>
      </form>
    </div>
  );
}

// Register Page (No changes needed)
function RegisterPage() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await axios.post('http://localhost:8080/api/auth/register', formData);
      setMessage('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setMessage('Registration failed. Username or email may already be in use.');
    }
  };
  return (
    <div className="container auth-container">
      <form onSubmit={handleSubmit} className="quiz-form">
        <h1 className="auth-title">Create Your Account</h1>
        {message && <div className="message-box">{message}</div>}
        <div className="form-group"><label htmlFor="username">Username</label><input type="text" id="username" name="username" onChange={handleChange} required /></div>
        <div className="form-group"><label htmlFor="email">Email</label><input type="email" id="email" name="email" onChange={handleChange} required /></div>
        <div className="form-group"><label htmlFor="password">Password</label><input type="password" id="password" name="password" onChange={handleChange} required /></div>
        <button type="submit" className="button-primary">Register</button>
      </form>
    </div>
  );
}

// New History Page
function HistoryPage() {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('http://localhost:8080/api/history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setHistory(response.data);
            } catch (error) {
                console.error("Failed to fetch history", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    if (isLoading) {
        return <div className="container"><h2>Loading History...</h2></div>;
    }

    return (
        <div className="container">
            <header className="header">
                <h1>My Quiz History</h1>
                <p>Here are the results of your past quizzes.</p>
            </header>
            <div className="history-list">
                {history.length === 0 ? (
                    <p>You haven't taken any quizzes yet.</p>
                ) : (
                    history.map(attempt => (
                        <div key={attempt.id} className="history-card">
                            <h3 className="history-topic">{attempt.topic}</h3>
                            <p className="history-score">Score: {attempt.score} / {attempt.totalQuestions}</p>
                            <p className="history-date">
                                Taken on: {new Date(attempt.attemptedAt).toLocaleDateString()}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Main App Component
function App() {
  const [user, setUser] = useState(localStorage.getItem('user'));
  const navigate = useNavigate();
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(storedUser);
  }, []);
  const handleLogin = (token, username) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', username);
    setUser(username);
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };
  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/quiz" element={<PrivateRoute><QuizPage /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
      </Routes>
    </>
  );
}

export default App;