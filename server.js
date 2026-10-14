import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateQuestion, getGeneratorStats } from './generators/templates.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Route để truy cập exam.html qua /exam
app.get('/exam', (req, res) => {
  res.sendFile('exam.html', { root: 'public' });
});

// Load ngân hàng tĩnh
const STATIC_QUESTIONS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/questions.json'), 'utf8')
).questions;

// Gemini AI
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ==========================================
// HYBRID QUIZ GENERATOR
// ==========================================
function getHybridQuestion({ category, difficulty, source }) {
  // source: 'static' | 'generated' | 'ai' | 'auto'

  if (source === 'auto' || !source) {
    // Tỉ lệ: 60% static, 30% generated, 10% AI
    const r = Math.random();
    if (r < 0.6) source = 'static';
    else if (r < 0.9) source = 'generated';
    else source = 'ai';
  }

  // Nếu AI được chọn nhưng không có key → fallback
  if (source === 'ai' && !genAI) source = 'generated';

  // ----- STATIC -----
  if (source === 'static') {
    let pool = STATIC_QUESTIONS;
    if (category && category !== 'random') {
      pool = pool.filter(q => q.category.toLowerCase() === category.toLowerCase());
    }
    if (difficulty && difficulty !== 'random') {
      pool = pool.filter(q => q.difficulty === difficulty);
    }
    if (pool.length === 0) pool = STATIC_QUESTIONS;

    const q = pool[Math.floor(Math.random() * pool.length)];
    return { ...q, source: 'static' };
  }

  // ----- GENERATED -----
  if (source === 'generated') {
    return { ...generateQuestion(category, difficulty), source: 'generated' };
  }

  // ----- AI -----
  return null; // Xử lý riêng ở async route
}

// ==========================================
// API: Lấy 1 câu hỏi (static hoặc generated)
// ==========================================
app.get('/api/question', (req, res) => {
  const { category = 'random', difficulty = 'random', source = 'auto' } = req.query;

  try {
    const q = getHybridQuestion({ category, difficulty, source });
    
    if (q) {
      return res.json({ success: true, question: q });
    }
    
    // Nếu AI được chọn → fallback generated
    const fallback = generateQuestion(category, difficulty);
    res.json({ success: true, question: { ...fallback, source: 'generated' } });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API: Lấy nhiều câu hỏi cùng lúc
// ==========================================
app.get('/api/questions', (req, res) => {
  const { count = 10, category = 'random', difficulty = 'random' } = req.query;
  const questions = [];
  const seenIds = new Set();

  for (let i = 0; i < Math.min(parseInt(count), 50); i++) {
    let q = getHybridQuestion({ category, difficulty, source: 'auto' });
    let attempts = 0;
    while (q && seenIds.has(q.id) && attempts < 5) {
      q = getHybridQuestion({ category, difficulty, source: 'auto' });
      attempts++;
    }
    if (q) {
      seenIds.add(q.id);
      questions.push(q);
    }
  }

  res.json({ success: true, questions, total: questions.length });
});

// ==========================================
// API: AI sinh câu hỏi (TẦNG 3)
// ==========================================
app.post('/api/ai-question', async (req, res) => {
  const { category = 'CCNA tổng hợp', difficulty = 'medium' } = req.body;

  if (!genAI) {
    // Fallback sang generated
    return res.json({ 
      success: true, 
      question: { ...generateQuestion('random', difficulty), source: 'generated' },
      note: 'Không có API key — dùng template'
    });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.9
      }
    });

    const prompt = `Tạo 1 câu hỏi trắc nghiệm CCNA về chủ đề "${category}", độ khó ${difficulty}.

Trả về JSON theo schema:
{
  "category": "chủ đề",
  "difficulty": "${difficulty}",
  "question": "câu hỏi",
  "options": ["A", "B", "C", "D"],
  "answer": 0,
  "explanation": "giải thích chi tiết tại sao đáp án đúng"
}

Yêu cầu:
- Câu hỏi phải chính xác về mặt kỹ thuật
- 4 đáp án, chỉ 1 đáp án đúng
- Có giải thích rõ ràng
- Đa dạng, không trùng lặp
- answer là index (0-3) của đáp án đúng`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    // Validate
    if (!parsed.question || !parsed.options || parsed.answer === undefined) {
      throw new Error('Invalid AI response');
    }

    const question = {
      id: `ai-${Date.now()}`,
      ...parsed,
      source: 'ai'
    };

    res.json({ success: true, question });

  } catch (err) {
    console.error('AI Error:', err.message);
    // Fallback
    res.json({ 
      success: true, 
      question: { ...generateQuestion(category, difficulty), source: 'generated' },
      note: 'AI lỗi — dùng template'
    });
  }
});

// ==========================================
// API: Thống kê hệ thống
// ==========================================
app.get('/api/stats', (req, res) => {
  const stats = getGeneratorStats();
  res.json({
    staticCount: STATIC_QUESTIONS.length,
    generators: stats,
    aiEnabled: !!genAI,
    categories: [...new Set(STATIC_QUESTIONS.map(q => q.category))]
  });
});

// ==========================================
// API: Chat AI
// ==========================================
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!genAI) {
    return res.status(503).json({ error: 'Chưa cấu hình API key' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `Bạn là Cisco AI Tutor chuyên CCNA. Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu, có ví dụ cụ thể. Khi hướng dẫn cấu hình Cisco, dùng code block.`
    });

    const chat = model.startChat({
      history: history.slice(-10).map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      }))
    });

    const result = await chat.sendMessage(message);
    res.json({ reply: result.response.text() });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/exam', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/exam.html'));
});
// ==========================================
// START SERVER
// ==========================================
app.listen(PORT,'0.0.0.0', () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
  console.log(`📚 Ngân hàng tĩnh: ${STATIC_QUESTIONS.length} câu`);
  console.log(`🎲 Template generators: 5 triệu+ biến thể`);
  console.log(`🤖 AI: ${genAI ? '✅ Gemini Flash' : '⚠️  Chưa có API key'}`);
  console.log(`\n💡 Mở trình duyệt: http://localhost:${PORT}\n`);
});
