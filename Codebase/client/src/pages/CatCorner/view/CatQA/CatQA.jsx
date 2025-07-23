import React, { useState } from 'react';
import './CatQA.css';

export default function CatQA() {
  const [showAsk, setShowAsk] = useState(false);
  const [q, setQ] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answerInputs, setAnswerInputs] = useState({});

  const handleAsk = () => {
    setShowAsk(true);
  };

  const handleSubmitQuestion = () => {
    if (q.trim()) {
      setQuestions([
        ...questions,
        { q, time: new Date().toLocaleTimeString(), answers: [] },
      ]);
      setQ('');
      setShowAsk(false);
    }
  };

  const handleAnswerChange = (idx, value) => {
    setAnswerInputs({ ...answerInputs, [idx]: value });
  };

  const handleAddAnswer = idx => {
    const answer = answerInputs[idx]?.trim();
    if (answer) {
      const updatedQuestions = [...questions];
      updatedQuestions[idx].answers.push({
        text: answer,
        time: new Date().toLocaleTimeString(),
      });
      setQuestions(updatedQuestions);
      setAnswerInputs({ ...answerInputs, [idx]: '' });
    }
  };

  return (
    <div className="catqa-container">
      <h2 className="catqa-title">Cat Care Q&amp;A</h2>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <button onClick={handleAsk} className="catqa-ask-btn">
          Ask Question
        </button>
      </div>
      {showAsk && (
        <div className="catqa-card">
          <h3>Ask a Cat-Care Question</h3>
          <textarea
            rows="3"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="e.g. How often should I feed stray cats?"
            className="catqa-textarea"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubmitQuestion} className="catqa-submit-btn">Submit</button>
            <button onClick={() => { setShowAsk(false); setQ(''); }} className="catqa-cancel-btn">Cancel</button>
          </div>
        </div>
      )}
      <div>
        {questions.length === 0 && (
          <div className="catqa-empty">No questions yet. Be the first to ask!</div>
        )}
        {questions.map((item, i) => (
          <div key={i} className="catqa-question-card">
            <div style={{ marginBottom: 8 }}>
              <span className="catqa-question-time">{item.time}</span>
              <span className="catqa-question-text">{item.q}</span>
            </div>
            <div>
              <div className="catqa-answers-label">Advice/Answers:</div>
              {item.answers.length === 0 && <div className="catqa-no-answers">No answers yet.</div>}
              <ul className="catqa-answer-list">
                {item.answers.map((ans, j) => (
                  <li key={j} className="catqa-answer-item">
                    <span className="catqa-answer-time">{ans.time}</span> – {ans.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="catqa-answer-input-row">
              <input
                type="text"
                value={answerInputs[i] || ''}
                onChange={e => handleAnswerChange(i, e.target.value)}
                placeholder="Write an answer/advice..."
                className="catqa-answer-input"
                onKeyDown={e => { if (e.key === 'Enter') handleAddAnswer(i); }}
              />
              <button onClick={() => handleAddAnswer(i)} className="catqa-add-btn">Add</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
