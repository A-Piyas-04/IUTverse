import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar.jsx';
import './AboutUs.css';

// Import developer images
import ahnafImage from './Ahnaf Shahriar Pias.jpg';
import nurenImage from './Nuren Fahmid.jpg';
import sadmanImage from './Sadman Mubasshir Khan.jpg';

const AboutUs = () => {
  const navigate = useNavigate();
  const [reportForm, setReportForm] = useState({ name: '', email: '', issueType: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Handle report form submission
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate report submission (replace with actual service)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create mailto link for issue reporting
      const mailtoLink = `mailto:ahnafpias@iut-dhaka.edu?subject=${encodeURIComponent(`Issue Report: ${reportForm.issueType}`)}&body=${encodeURIComponent(`From: ${reportForm.name} (${reportForm.email})\n\nIssue Type: ${reportForm.issueType}\n\nDescription:\n${reportForm.description}`)}`;
      window.open(mailtoLink, '_blank');
      
      alert('Issue report sent! Thank you for your feedback.');
      setReportForm({ name: '', email: '', issueType: '', description: '' });
    } catch (error) {
      alert('Error sending report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const developers = [
    {
      id: 1,
      name: "Ahnaf Shahriar Pias",
      role: "Full Stack Developer",
      avatar: ahnafImage,
      bio: "Passionate about creating innovative web solutions and user experiences with expertise in both frontend and backend development.",
      skills: ["React", "Node.js", "NextJS", "JavaScript", "Express","PostgreSQL", "MongoDB"],
      github: "https://github.com/A-Piyas-04",
      linkedin: "https://www.linkedin.com/in/ah-pias",
      facebook: "https://www.facebook.com/ahnafshahriar.pias",
      email: "ahnafpias@iut-dhaka.edu"
    },
    {
      id: 2,
      name: "Nuren Fahmid", 
      role: "Full Stack Developer",
      avatar: nurenImage,
      bio: "Specialized in building robust and scalable full-stack applications with strong expertise in both frontend and backend technologies.",
      skills: ["React", "Node.js","Tailwind", "Express", "PostgreSQL", "MongoDB", "JavaScript"],
      github: "https://github.com/NFahmid",
      linkedin: null,
      facebook: "https://www.facebook.com/nuren.fahmid",
      email: "nurenfahmid@iut-dhaka.edu"
    },
    {
      id: 3,
      name: "Sadman Mubasshir Khan",
      role: "Backend Developer",
      avatar: sadmanImage, 
      bio: "Focused on backend architecture, database design, and server-side development with strong expertise in building scalable systems.",
      skills: ["Python", "Node.js", "PostgreSQL", "MongoDB", "Express", "API Development"],
      github: "https://github.com/mksadman",
      linkedin: "https://www.linkedin.com/in/sadmanmk/",
      facebook: "https://www.facebook.com/MkSadman2003",
      email: "sadmankhan334@gmail.com"
    }
  ];

  return (
    <div className="about-us-page">
      <Navbar />
      
      <div className="about-us-container">
        {/* Header */}
        <div className="about-us-header">
          <div className="header-content">
            <div className="team-icon">👥</div>
            <div className="header-text">
              <h2 className="about-title">About Our Team</h2>
              <p className="about-subtitle">Meet the developers behind IUTverse</p>
            </div>
          </div>
          <button 
            className="about-back-btn" 
            onClick={() => navigate('/')}
            aria-label="Back to Home"
          >
            <span>←</span>
            Back to Home
          </button>
        </div>

        {/* Content */}
        <div className="about-us-content">
          {/* Project Overview */}
          <div className="project-overview">
            <div className="overview-card">
              <div className="overview-icon">🚀</div>
              <h3 className="overview-title">IUTverse</h3>
              <p className="overview-description">
                A comprehensive social platform designed specifically for the Islamic University of Technology (IUT) community. 
                Our mission is to connect students, faculty, and staff through innovative features and seamless user experiences.
              </p>
              <div className="project-stats">
                <div className="stat-item">
                  <span className="stat-number">3</span>
                  <span className="stat-label">Developers</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">10+</span>
                  <span className="stat-label">Features</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className="team-section">
            <h3 className="team-title">Our Development Team</h3>
            <div className="developers-grid">
              {developers.map((developer, index) => (
                <div 
                  key={developer.id} 
                  className="developer-card"
                  style={{ animationDelay: `${0.2 * (index + 1)}s` }}
                >
                  <div className="developer-avatar">
                    <img src={developer.avatar} alt={developer.name} />
                  </div>
                  
                  <div className="developer-info">
                    <h4 className="developer-name">{developer.name}</h4>
                    <p className="developer-role">{developer.role}</p>
                    
                    <div className="social-links-list">
                      <a href={developer.facebook} className="social-link-item facebook" target="_blank" rel="noopener noreferrer">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </a>
                      {developer.linkedin && (
                        <a href={developer.linkedin} className="social-link-item linkedin" target="_blank" rel="noopener noreferrer">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn
                        </a>
                      )}
                      <a href={developer.github} className="social-link-item github" target="_blank" rel="noopener noreferrer">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                      </a>
                      <a href={`mailto:${developer.email}`} className="social-link-item email">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M0 3v18h24V3H0zm21.518 2L12 12.713 2.482 5h19.036zM2 19V7.183l10 8.104 10-8.104V19H2z"/>
                        </svg>
                        Email
                      </a>
                    </div>
                    
                    <p className="developer-bio">{developer.bio}</p>
                    
                    <div className="developer-skills">
                      <h5 className="skills-title">Skills</h5>
                      <div className="skills-list">
                        {developer.skills.map((skill, skillIndex) => (
                          <span key={skillIndex} className="skill-tag">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Issue Section */}
          <div className="contact-section">
            <div className="contact-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div className="contact-icon">📋</div>
              <h3 className="contact-title">Report an Issue</h3>
              <p className="contact-description">
                Found a bug or have a suggestion? Let us know and we'll get back to you!
              </p>
              
              <form onSubmit={handleReportSubmit} className="report-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="reportName">Your Name</label>
                    <input
                      type="text"
                      id="reportName"
                      value={reportForm.name}
                      onChange={(e) => setReportForm({...reportForm, name: e.target.value})}
                      required
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reportEmail">Your Email</label>
                    <input
                      type="email"
                      id="reportEmail"
                      value={reportForm.email}
                      onChange={(e) => setReportForm({...reportForm, email: e.target.value})}
                      required
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="issueType">Issue Type</label>
                  <select
                    id="issueType"
                    value={reportForm.issueType}
                    onChange={(e) => setReportForm({...reportForm, issueType: e.target.value})}
                    required
                  >
                    <option value="">Select an issue type</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Performance Issue">Performance Issue</option>
                    <option value="UI/UX Issue">UI/UX Issue</option>
                    <option value="Security Concern">Security Concern</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    rows="4"
                    value={reportForm.description}
                    onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                    placeholder="Please describe the issue in detail..."
                    required
                  ></textarea>
                </div>
                
                <div className="form-actions">
                  <button type="submit" disabled={isSubmitting} className="submit-btn">
                    {isSubmitting ? 'Sending...' : 'Send Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default AboutUs;