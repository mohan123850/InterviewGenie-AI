import { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Briefcase, 
  Send, 
  Loader2, 
  ClipboardCheck, 
  Clipboard, 
  Sparkles,
  ChevronRight,
  BookOpen,
  Trophy,
  Target,
  Download,
  Moon,
  Sun,
  RefreshCw,
  Search,
  Timer,
  FileText,
  Trash2,
  Building2,
  BarChart3,
  Bookmark,
  History,
  Mic,
  MicOff,
  CheckCircle2,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

// Helper to get GoogleGenAI instance
const getGenAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is missing. If you have deployed this app, please add VITE_GEMINI_API_KEY to your environment variables in your deployment platform (e.g., Vercel, Netlify).");
  }
  return new GoogleGenAI({ apiKey });
};

type Category = 'Mixed' | 'Technical' | 'HR' | 'Behavioral';
type Experience = 'Fresher' | '1-3 Years' | '3+ Years';
type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Company = 'General' | 'Google' | 'Amazon' | 'TCS' | 'Infosys' | 'Microsoft' | 'Meta';

export default function App() {
  const [jobRole, setJobRole] = useState('');
  const [category, setCategory] = useState<Category>('Mixed');
  const [experience, setExperience] = useState<Experience>('Fresher');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [company, setCompany] = useState<Company>('General');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<{ text: string; category: string; answer?: string; loadingAnswer?: boolean }[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [timer, setTimer] = useState(1800); // 30 minutes in seconds
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [savedInterviews, setSavedInterviews] = useState<{ id: string; role: string; date: string; questions: any[] }[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const progress = questions.length > 0 ? (answeredQuestions.size / questions.length) * 100 : 0;

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const popularRoles = ['Frontend Developer', 'Java Developer', 'Python Developer', 'Data Analyst'];

  const clearAll = () => {
    setJobRole('');
    setQuestions([]);
    setError(null);
    setSearchQuery('');
    setTimer(1800);
    setIsTimerActive(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startMockInterview = () => {
    setTimer(1800);
    setIsTimerActive(true);
  };

  const saveToLibrary = () => {
    if (questions.length === 0) return;
    const newInterview = {
      id: Date.now().toString(),
      role: jobRole,
      date: new Date().toLocaleDateString(),
      questions: questions
    };
    setSavedInterviews([newInterview, ...savedInterviews]);
    alert("Interview saved to your library!");
  };

  const deleteFromLibrary = (id: string) => {
    setSavedInterviews(savedInterviews.filter(i => i.id !== id));
  };

  const loadFromLibrary = (interview: any) => {
    setJobRole(interview.role);
    setQuestions(interview.questions);
    setShowLibrary(false);
    setScore(0);
    setAnsweredQuestions(new Set());
  };

  const toggleAnswered = (index: number) => {
    const newAnswered = new Set(answeredQuestions);
    if (newAnswered.has(index)) {
      newAnswered.delete(index);
      setScore(prev => prev - 1);
    } else {
      newAnswered.add(index);
      setScore(prev => prev + 1);
    }
    setAnsweredQuestions(newAnswered);
  };

  const markAllDone = () => {
    if (questions.length === 0) return;
    const allIndices = questions.map((_, i) => i);
    setAnsweredQuestions(new Set(allIndices));
    setScore(questions.length);
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('🎤 Listening... Speak now');
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(`You said: "${result}"`);
      alert("You said: " + result);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      setTranscript('Error occurred. Try again.');
      alert("Voice error occurred");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const setCompanyMode = (comp: Company) => {
    setCompany(comp);
    if (jobRole) {
      generateQuestions();
    }
  };

  const generateQuestions = async () => {
    if (!jobRole.trim()) return;
    
    setLoading(true);
    setError(null);
    setQuestions([]);
    setScore(0);
    setAnsweredQuestions(new Set());
    setTranscript('');
    
    try {
      const ai = getGenAI();
      const model = "gemini-3-flash-preview";
      const prompt = `You are a professional job interview questions generator.
      Generate 30 real-time job interview questions for the role: "${jobRole}".
      
      Context:
      - Target Experience Level: ${experience}
      - Primary Focus Category: ${category}
      - Difficulty Level: ${difficulty}
      - Target Company Style: ${company}
      
      Requirements:
      - Generate exactly 30 questions.
      - If category is "Mixed", cover: HR, Technical, Scenario, Behavioral, and Problem-solving.
      - If category is specific (e.g., "Technical"), focus 80% on that category and 20% on others.
      - Questions should be realistic and asked in real interviews for a ${experience} level candidate at ${company === 'General' ? 'a professional company' : company}.
      - The difficulty should be ${difficulty}.
      - Format the output as a simple numbered list from 1 to 30.
      - Do not include any introductory or concluding text.
      - Do not include category headers, just the numbered list.
      
      Output Format:
      1. [Question 1]
      2. [Question 2]
      ...
      30. [Question 30]`;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });

      const text = response.text || "";
      const questionLines = text
        .split(/\n/)
        .map(line => line.replace(/^\d+\.\s+/, '').trim())
        .filter(q => q.length > 0)
        .slice(0, 30);
      
      if (questionLines.length === 0) {
        throw new Error("Failed to parse questions. Please try again.");
      }

      const categorizedQuestions = questionLines.map((q, index) => {
        let cat = category === 'Mixed' ? "General" : category;
        if (category === 'Mixed') {
          const num = index + 1;
          if (num <= 6) cat = "HR Questions";
          else if (num <= 14) cat = "Technical Questions";
          else if (num <= 20) cat = "Project Questions";
          else if (num <= 25) cat = "Behavioral Questions";
          else cat = "Problem Solving Questions";
        }
        
        return { text: q, category: cat };
      });

      setQuestions(categorizedQuestions);
    } catch (err: any) {
      console.error("Error generating questions:", err);
      setError(err.message || "Something went wrong while generating questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateAnswer = async (index: number) => {
    const question = questions[index];
    if (question.answer || question.loadingAnswer) return;

    const newQuestions = [...questions];
    newQuestions[index].loadingAnswer = true;
    setQuestions(newQuestions);

    try {
      const ai = getGenAI();
      const model = "gemini-3-flash-preview";
      const prompt = `As an expert interviewer, provide a concise sample answer or key points to cover for this interview question: "${question.text}" for the role of "${jobRole}" at ${experience} level.
      
      Format the response with:
      - A brief "Key Points" section (bullet points).
      - A "Sample Answer" section.
      
      Keep it professional and practical.`;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });

      const updatedQuestions = [...questions];
      updatedQuestions[index].answer = response.text || "Could not generate answer.";
      updatedQuestions[index].loadingAnswer = false;
      setQuestions(updatedQuestions);
    } catch (err) {
      console.error("Error generating answer:", err);
      const updatedQuestions = [...questions];
      updatedQuestions[index].loadingAnswer = false;
      setQuestions(updatedQuestions);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = `Job Role: ${jobRole} (${experience})\nCategory: ${category}\n\nInterview Questions:\n` + 
      questions.map((q, i) => `[${q.category}]\n${i + 1}. ${q.text}${q.answer ? `\n   Answer Guide:\n   ${q.answer.replace(/\n/g, '\n   ')}` : ''}`).join('\n\n');
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    doc.setFontSize(20);
    doc.text("Interview Questions", margin, y);
    y += 10;
    
    doc.setFontSize(12);
    doc.text(`Role: ${jobRole}`, margin, y);
    y += 7;
    doc.text(`Experience: ${experience}`, margin, y);
    y += 7;
    doc.text(`Category: ${category}`, margin, y);
    y += 15;

    questions.forEach((q, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont("helvetica", "bold");
      const qText = `${i + 1}. ${q.text}`;
      const qLines = doc.splitTextToSize(qText, pageWidth - margin * 2);
      doc.text(qLines, margin, y);
      y += qLines.length * 7;

      if (q.answer) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const aText = `Answer Guide:\n${q.answer}`;
        const aLines = doc.splitTextToSize(aText, pageWidth - margin * 2.5);
        doc.text(aLines, margin + 5, y);
        y += aLines.length * 5 + 5;
        doc.setFontSize(12);
      } else {
        y += 5;
      }
    });

    doc.save(`Interview_Questions_${jobRole.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadTXT = () => {
    const textToDownload = `InterviewAI - Professional Interview Questions\n` +
      `==========================================\n` +
      `Role: ${jobRole}\n` +
      `Experience: ${experience}\n` +
      `Category: ${category}\n` +
      `Difficulty: ${difficulty}\n` +
      `Company: ${company}\n` +
      `==========================================\n\n` +
      questions.map((q, i) => `${i + 1}. [${q.category}]\n   Question: ${q.text}${q.answer ? `\n   Answer Guide:\n   ${q.answer.replace(/\n/g, '\n   ')}` : ''}`).join('\n\n');
    
    const blob = new Blob([textToDownload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Interview_Questions_${jobRole.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredQuestions = questions.filter(q => 
    q.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-xl tracking-tight text-indigo-600 dark:text-indigo-400">✨ InterviewGenie AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={generateQuestions}
              disabled={loading || !jobRole.trim()}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate
            </button>
            <button 
              onClick={() => setShowLibrary(!showLibrary)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              title="Saved Interviews"
            >
              <History className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              {savedInterviews.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
            <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span>Professional</span>
              <span>•</span>
              <span>AI-Powered</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <h2 className="text-5xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-2 tracking-tight">
              ✨ InterviewGenie AI
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">
              Master Interviews with AI
            </p>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto"
          >
            Generate tailored interview questions based on role, category, and experience level.
          </motion.p>
        </div>

        {/* Input Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 mb-8"
        >
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-[2]">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Enter Job Role (e.g. Java Developer)"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateQuestions()}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-lg dark:text-white"
                />
              </div>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="flex-1 px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
              >
                <option value="Mixed">Mixed</option>
                <option value="Technical">Technical</option>
                <option value="HR">HR</option>
                <option value="Behavioral">Behavioral</option>
              </select>
              <select 
                value={experience}
                onChange={(e) => setExperience(e.target.value as Experience)}
                className="flex-1 px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
              >
                <option value="Fresher">Fresher</option>
                <option value="1-3 Years">1-3 Years</option>
                <option value="3+ Years">3+ Years</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Difficulty
                </label>
                <select 
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Target Company
                </label>
                <select 
                  value={company}
                  onChange={(e) => setCompany(e.target.value as Company)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                >
                  <option value="General">General</option>
                  <option value="Google">Google</option>
                  <option value="Amazon">Amazon</option>
                  <option value="TCS">TCS</option>
                  <option value="Infosys">Infosys</option>
                  <option value="Microsoft">Microsoft</option>
                  <option value="Meta">Meta</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Popular Roles:</span>
              {popularRoles.map(role => (
                <button
                  key={role}
                  onClick={() => setJobRole(role)}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-all border border-transparent hover:border-indigo-200"
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm pt-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Quick Modes:</span>
              <button
                onClick={() => setCompanyMode('Google')}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500 transition-all flex items-center gap-2"
              >
                <Building2 className="w-4 h-4 text-blue-500" />
                Google Mode
              </button>
              <button
                onClick={() => setCompanyMode('Amazon')}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500 transition-all flex items-center gap-2"
              >
                <Building2 className="w-4 h-4 text-orange-500" />
                Amazon Mode
              </button>
              <button
                onClick={() => setCompanyMode('TCS')}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500 transition-all flex items-center gap-2"
              >
                <Building2 className="w-4 h-4 text-blue-800" />
                TCS Mode
              </button>
            </div>

            <button
              onClick={generateQuestions}
              disabled={loading || !jobRole.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Generate Questions
                </>
              )}
            </button>
          </div>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-3"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {error}
            </motion.div>
          )}
        </motion.div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-6"
            >
              <div className="relative">
                <div className="w-24 h-24 border-4 border-indigo-100 dark:border-slate-800 rounded-full animate-spin border-t-indigo-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">🤖 Generating Questions...</h3>
                <p className="text-slate-500 dark:text-slate-400">Our AI is crafting the perfect interview for you</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {questions.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-600" />
                      Questions for {jobRole}
                    </h3>
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {filteredQuestions.length} of {questions.length} questions visible
                      </p>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <Award className="w-3 h-3" />
                        Score: {score}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={isTimerActive ? () => setIsTimerActive(false) : startMockInterview}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all border ${
                        isTimerActive 
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50' 
                        : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      <Target className={`w-4 h-4 ${isTimerActive ? 'animate-pulse' : ''}`} />
                      {isTimerActive ? `Mock Active: ${formatTime(timer)}` : '🎯 Start Mock Interview'}
                    </button>
                    <button
                      onClick={startVoice}
                      disabled={isListening}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border transition-all shadow-sm ${
                        isListening 
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100 dark:border-red-900/50 animate-pulse' 
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-indigo-600'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      {isListening ? 'Listening...' : 'Voice Mode'}
                    </button>
                    <button
                      onClick={downloadPDF}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                    <button
                      onClick={downloadTXT}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                      title="Download TXT"
                    >
                      <FileText className="w-4 h-4" />
                      TXT
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                    >
                      {copied ? (
                        <>
                          <ClipboardCheck className="w-4 h-4 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Clipboard className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={saveToLibrary}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                      title="Save to Library"
                    >
                      <Bookmark className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={generateQuestions}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                    <button
                      onClick={clearAll}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear
                    </button>
                    <button
                      onClick={markAllDone}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark All Done
                    </button>
                  </div>
                </div>

                {transcript && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    {transcript}
                  </motion.div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text"
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm dark:text-white"
                    />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    <span>Preparation Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-[#6c5ce7] shadow-[0_0_10px_rgba(108,92,231,0.5)] rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {filteredQuestions.map((question, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-md transition-all flex flex-col gap-4"
                  >
                    <div className="flex gap-4 items-start w-full">
                      <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                        {questions.indexOf(question) + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                          {question.text}
                        </p>
                        <div className="mt-3 flex items-center gap-4">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {question.category}
                          </span>
                          {answeredQuestions.has(questions.indexOf(question)) && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Answered
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => generateAnswer(questions.indexOf(question))}
                          disabled={question.loadingAnswer}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                            question.answer 
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50' 
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400'
                          }`}
                        >
                          {question.loadingAnswer ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : question.answer ? (
                            <Sparkles className="w-3 h-3" />
                          ) : (
                            <BookOpen className="w-3 h-3" />
                          )}
                          {question.answer ? 'AI Answer' : 'Get Answer'}
                        </button>
                        <button
                          onClick={() => toggleAnswered(questions.indexOf(question))}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                            answeredQuestions.has(questions.indexOf(question))
                              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 border-green-100 dark:border-green-900/50'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-green-300 hover:text-green-600'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {answeredQuestions.has(questions.indexOf(question)) ? 'Answered' : 'Mark Done'}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {question.answer && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="overflow-hidden"
                        >
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-2 text-xs uppercase tracking-wider">
                              <Sparkles className="w-3 h-3" />
                              Answer Guide
                            </div>
                            {question.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : !loading && (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800"
            >
              <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-slate-400 dark:text-slate-500 font-medium">Your generated questions will appear here</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Library Modal */}
        <AnimatePresence>
          {showLibrary && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    Saved Interviews
                  </h3>
                  <button 
                    onClick={() => setShowLibrary(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5 rotate-45" />
                  </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                  {savedInterviews.length === 0 ? (
                    <div className="text-center py-12">
                      <Bookmark className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                      <p className="text-slate-500 dark:text-slate-400">No saved interviews yet.</p>
                    </div>
                  ) : (
                    savedInterviews.map((interview) => (
                      <div 
                        key={interview.id}
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all"
                      >
                        <div className="flex-1 cursor-pointer" onClick={() => loadFromLibrary(interview)}>
                          <h4 className="font-bold text-slate-800 dark:text-white">{interview.role}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{interview.date} • {interview.questions.length} Questions</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => loadFromLibrary(interview)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                            title="Load"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => deleteFromLibrary(interview.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Powered by Gemini AI • Professional Interview Preparation Tool
          </p>
        </div>
      </footer>
    </div>
  );
}
