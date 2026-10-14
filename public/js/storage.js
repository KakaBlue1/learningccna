// ============================================================
// Storage Helper — Quản lý localStorage
// ============================================================

const Storage = {
  KEYS: {
    STATS: 'ccna_stats',
    WRONG_QUESTIONS: 'ccna_wrong',
    EXAM_HISTORY: 'ccna_exam_history',
    COMPLETED_LESSONS: 'ccna_lessons'
  },

  // ----- Stats -----
  getStats() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.STATS)) || {
        total: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0
      };
    } catch {
      return { total: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0 };
    }
  },

  saveStats(stats) {
    localStorage.setItem(this.KEYS.STATS, JSON.stringify(stats));
  },

  // ----- Wrong Questions -----
  getWrongQuestions() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.WRONG_QUESTIONS)) || [];
    } catch {
      return [];
    }
  },

  addWrongQuestion(question, selectedAnswer) {
    const list = this.getWrongQuestions();
    // Tránh trùng lặp — kiểm tra theo id
    const exists = list.findIndex(q => q.id === question.id);
    const entry = {
      ...question,
      selectedAnswer,
      wrongAt: new Date().toISOString(),
      reviewCount: 0
    };
    if (exists >= 0) {
      entry.reviewCount = (list[exists].reviewCount || 0) + 1;
      list[exists] = entry;
    } else {
      list.unshift(entry);
    }
    // Giữ tối đa 200 câu
    if (list.length > 200) list.length = 200;
    localStorage.setItem(this.KEYS.WRONG_QUESTIONS, JSON.stringify(list));
  },

  removeWrongQuestion(id) {
    const list = this.getWrongQuestions().filter(q => q.id !== id);
    localStorage.setItem(this.KEYS.WRONG_QUESTIONS, JSON.stringify(list));
  },

  clearWrongQuestions() {
    localStorage.removeItem(this.KEYS.WRONG_QUESTIONS);
  },

  // ----- Exam History -----
  getExamHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.EXAM_HISTORY)) || [];
    } catch {
      return [];
    }
  },

  saveExamResult(result) {
    const list = this.getExamHistory();
    list.unshift({
      ...result,
      date: new Date().toISOString()
    });
    // Giữ tối đa 50 lần thi
    if (list.length > 50) list.length = 50;
    localStorage.setItem(this.KEYS.EXAM_HISTORY, JSON.stringify(list));
  },

  clearExamHistory() {
    localStorage.removeItem(this.KEYS.EXAM_HISTORY);
  },

  // ----- Clear all -----
  clearAll() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
  }
};

// Export global
window.Storage = Storage;