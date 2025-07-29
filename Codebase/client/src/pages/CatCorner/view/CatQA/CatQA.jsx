import React, { useState, useEffect } from 'react';
import { getAllQuestions, createQuestion, addAnswer } from '../../../../services/catQAApi';
import './CatQA.css';

export default function CatQA() {
  const [showAsk, setShowAsk] = useState(false);
  const [q, setQ] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answerInputs, setAnswerInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load questions on component mount
  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAllQuestions();
      
      if (result.success) {
        // Transform backend data to match frontend format
        const transformedQuestions = result.questions.map(q => ({
          id: q.id,
          q: q.question,
          time: new Date(q.createdAt).toLocaleString(),
          user: q.user?.name || 'Anonymous',
          answers: q.answers.map(a => ({
            id: a.id,
            text: a.answer,
            time: new Date(a.createdAt).toLocaleString(),
            user: a.user?.name || 'Anonymous'
          }))
        }));
        setQuestions(transformedQuestions);
      } else {
        setError(result.error || 'Failed to load questions');
      }
    } catch (err) {
      setError('Failed to load questions');
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = () => {
    setShowAsk(true);
  };

  const handleSubmitQuestion = async () => {
    if (!q.trim() || submitting) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const result = await createQuestion(q.trim());
      
      if (result.success) {
        // Reload questions to get the latest data
        await loadQuestions();
        setQ('');
        setShowAsk(false);
      } else {
        setError(result.error || 'Failed to create question');
      }
    } catch (err) {
      setError('Failed to create question');
      console.error('Error creating question:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerChange = (idx, value) => {
    setAnswerInputs({ ...answerInputs, [idx]: value });
  };

  const handleAddAnswer = async (idx) => {
    const answer = answerInputs[idx]?.trim();
    if (!answer || submitting) return;
    
    const question = questions[idx];
    if (!question || !question.id) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const result = await addAnswer(question.id, answer);
      
      if (result.success) {
        // Reload questions to get the latest data
        await loadQuestions();
        setAnswerInputs({ ...answerInputs, [idx]: '' });
      } else {
        setError(result.error || 'Failed to add answer');
      }
    } catch (err) {
      setError('Failed to add answer');
      console.error('Error adding answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="catqa-container">
      <h2 className="catqa-title">Cat Care Q&amp;A</h2>
      
      {error && (
        <div style={{ 
          backgroundColor: '#fee', 
          color: '#c33', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {error}
          <button 
            onClick={() => setError(null)} 
            style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#c33', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}
      
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <button 
          onClick={handleAsk} 
          className="catqa-ask-btn"
          disabled={submitting || showAsk}
        >
          {submitting ? 'Loading...' : 'Ask Question'}
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
            <button 
              onClick={handleSubmitQuestion} 
              className="catqa-submit-btn"
              disabled={submitting || !q.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
            <button onClick={() => { setShowAsk(false); setQ(''); }} className="catqa-cancel-btn">Cancel</button>
          </div>
        </div>
      )}
      <div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading questions...
          </div>
        ) : questions.length === 0 ? (
          <div className="catqa-empty">No questions yet. Be the first to ask!</div>
        ) : null}
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
              <button 
                onClick={() => handleAddAnswer(i)} 
                className="catqa-add-btn"
                disabled={submitting || !answerInputs[i]?.trim()}
              >
                {submitting ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
