import React, { useState } from "react";
import "./ConfessionModal.css";

export default function ConfessionModal({
  onSubmit,
  onClose,
  tags,
  submitting = false,
}) {
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim() || !selectedTag) {
      alert("Please fill in both confession content and select a tag.");
      return;
    }

    if (
      showPoll &&
      (!pollQuestion.trim() || pollOptions.some((opt) => !opt.trim()))
    ) {
      alert("Please fill in the poll question and all options.");
      return;
    }

    const confessionData = {
      content: content.trim(),
      tag: selectedTag,
      poll: showPoll
        ? {
            question: pollQuestion.trim(),
            options: pollOptions
              .filter((opt) => opt.trim())
              .map((opt) => ({
                text: opt.trim(),
              })),
          }
        : null,
    };

    await onSubmit(confessionData);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const remainingChars = 1000 - content.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confession-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🤐 Submit Anonymous Confession</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="confession-form">
          {/* Confession Content */}
          <div className="form-group">
            <label className="form-label">Your Confession *</label>
            <textarea
              className="confession-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts anonymously... (max 1000 characters)"
              maxLength={1000}
              rows={6}
              required
            />
            <div className="char-counter">
              {remainingChars} characters remaining
            </div>
          </div>

          {/* Tag Selection */}
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="tag-select"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              required
            >
              <option value="">Select a category</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {/* Poll Toggle */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showPoll}
                onChange={(e) => setShowPoll(e.target.checked)}
                className="poll-checkbox"
              />
              <span className="checkbox-text">
                Add a poll to your confession
              </span>
            </label>
          </div>

          {/* Poll Section */}
          {showPoll && (
            <div className="poll-section">
              <div className="form-group">
                <label className="form-label">Poll Question *</label>
                <input
                  type="text"
                  className="poll-question-input"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask the community..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Poll Options *</label>
                <div className="poll-options">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="poll-option-row">
                      <input
                        type="text"
                        className="poll-option-input"
                        value={option}
                        onChange={(e) =>
                          updatePollOption(index, e.target.value)
                        }
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          className="remove-option-btn"
                          onClick={() => removePollOption(index)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {pollOptions.length < 4 && (
                  <button
                    type="button"
                    className="add-option-btn"
                    onClick={addPollOption}
                  >
                    + Add Option
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || !content.trim() || !selectedTag}
            >
              {submitting ? "Submitting..." : "🤐 Confess Anonymously"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
