import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import './votingDB.css';
import somaselogo from '../images/somase-logo.jpeg';
import { API_BASE_URL } from '../config';
import { ensureCSRFToken } from '../utils/csrf';
import { auth } from '../firebase'; 

const MUBASVotingDashboard = () => {
  // State management
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [activePosition, setActivePosition] = useState('all');
  const [votedCandidates, setVotedCandidates] = useState({});
  
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [votedPositions, setVotedPositions] = useState({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [missingPositions, setMissingPositions] = useState([]);
  const [electionSettings, setElectionSettings] = useState(null);
  const [isElectionActive, setIsElectionActive] = useState(false);
  const [isUserEligible, setIsUserEligible] = useState(false);
  const [hasUserVoted, setHasUserVoted] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [myApplication, setMyApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasShownEligibilityAlert, setHasShownEligibilityAlert] = useState(false);
  
  const [electionCountdown, setElectionCountdown] = useState(null);
  const [countdownType, setCountdownType] = useState(null); 
  const [electionStatus, setElectionStatus] = useState('checking'); 

  // 🚨 BULLETPROOF AUTH HEADERS: Waits for Firebase to initialize
  const getAuthHeaders = async () => {
    try {
      if (auth.authStateReady) {
        await auth.authStateReady();
      } else {
        await new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged(() => {
            unsubscribe();
            resolve();
          });
        });
      }

      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true); // Force refresh
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
      }
    } catch (err) {
      console.error("Error getting auth token:", err);
    }
    return { 'Content-Type': 'application/json' };
  };

  const positions = [
    { id: 'all', name: 'All Positions' },
    { id: 'president', name: 'President' },
    { id: 'vice-president', name: 'Vice President' },
    { id: 'general-secretary', name: 'General Secretary' },
    { id: 'organising-secretary', name: 'Organising Secretary' },
    { id: 'publicity-secretary', name: 'Publicity Secretary' },
    { id: 'treasurer', name: 'Treasurer' },
    { id: 'entertainment-director', name: 'Entertainment Director' },
    { id: 'sports-director', name: 'Sports Director' },
    { id: 'society-member', name: 'Society Member' },
  ];

  const requiredPositions = [
    'president', 'vice-president', 'treasurer', 'general-secretary',
    'organising-secretary', 'publicity-secretary', 'entertainment-director',
    'sports-director', 'society-member'
  ];

  // 🚨 FIX: Only run once. Wait for Firebase before doing anything.
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        fetchUserData();
      } else {
        localStorage.removeItem('user');
        setUser(null);
        setIsCheckingEligibility(false);
      }
    });

    const savedVotes = localStorage.getItem('somasVotes');
    if (savedVotes) {
      const votes = JSON.parse(savedVotes);
      setVotedCandidates(votes);
      const positionsObj = {};
      Object.keys(votes).forEach(position => {
        positionsObj[position] = true;
      });
      setVotedPositions(positionsObj);
    }

    return () => unsubscribe();
  }, []);

  // 🚨 FIX: Fetch everything sequentially to avoid 403s
  const fetchUserData = async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/auth/check/`, {
        headers: authHeaders,
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData)); 
        
        if (userData.has_voted) {
          setHasUserVoted(true);
          setIsCheckingEligibility(false);
          return;
        }
        
        // Fetch settings and application only after user is confirmed
        await Promise.all([
          fetchElectionSettings(),
          fetchMyApplication()
        ]);
        
        setIsCheckingEligibility(false);
      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('user');
        setUser(null);
        setIsCheckingEligibility(false);
      } else {
        setIsCheckingEligibility(false);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setIsCheckingEligibility(false);
    }
  };

  const fetchMyApplication = async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/my-candidate-application/`, {
        headers: authHeaders,
        credentials: 'include'
      });
      
      if (response.ok) {
        const application = await response.json();
        setMyApplication(application);
      } else if (response.status === 404) {
        setMyApplication(null);
      }
    } catch (err) {
      console.error('Error fetching application:', err);
    }
  };

  const fetchElectionSettings = async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/election-settings/`, {
        headers: authHeaders,
        credentials: 'include'
      });
      if (response.ok) {
        const settings = await response.json();
        setElectionSettings(settings);
      }
    } catch (err) {
      console.error('Error fetching election settings:', err);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/candidates/`, {
        headers: authHeaders,
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch candidates: ${response.status}`);
      }
      const data = await response.json();
      setCandidates(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const result = await Swal.fire({
        title: 'Delete Your Account?',
        text: "This action cannot be undone. All your data will be permanently removed.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete my account',
        cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
        try {
            setIsDeletingAccount(true);
            const csrfToken = await ensureCSRFToken(API_BASE_URL);
            const authHeaders = await getAuthHeaders();
            
            const response = await fetch(`${API_BASE_URL}/api/delete-account/`, {
                method: 'DELETE',
                headers: {
                    ...authHeaders,
                    'X-CSRFToken': csrfToken,
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                Swal.fire({
                    title: 'Account Deleted',
                    text: 'Your account has been permanently deleted.',
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then(() => {
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                });
            } else {
                throw new Error('Failed to delete account');
            }
        } catch (err) {
            console.error('Error deleting account:', err);
            Swal.fire({
                title: 'Error',
                text: 'Failed to delete account. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        } finally {
            setIsDeletingAccount(false);
        }
    }
  };

  const handleDeleteApplication = async () => {
    if (!myApplication) return;
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      try {
        setIsDeleting(true);
        const csrfToken = await ensureCSRFToken(API_BASE_URL);
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/candidate-application/${myApplication.id}/`, {
          method: 'DELETE',
          headers: {
            ...authHeaders,
            'X-CSRFToken': csrfToken,
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Your candidate application has been deleted successfully.',
            icon: 'success',
            confirmButtonText: 'OK'
          });
          setMyApplication(null);
          setShowApplicationModal(false);
        } else {
          throw new Error('Failed to delete application');
        }
      } catch (err) {
        console.error('Error deleting application:', err);
        Swal.fire({
          title: 'Error',
          text: 'Failed to delete application. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleEditApplication = () => {
    window.location.href = `/candidate-application/edit/${myApplication.id}`;
  };

  useEffect(() => {
    const updateElectionStatus = () => {
      if (!electionSettings) return;
      const now = new Date();
      const startDate = new Date(electionSettings.start_date);
      const endDate = new Date(electionSettings.end_date);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        setElectionStatus('not_set');
        setElectionCountdown(null);
        return;
      }
      
      if (now < startDate) {
        setElectionStatus('scheduled');
        setCountdownType('start');
        const diff = startDate - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElectionCountdown({ days, hours, minutes, seconds });
      } else if (now >= startDate && now <= endDate) {
        setElectionStatus('active');
        setCountdownType('end');
        setIsElectionActive(true);
        const diff = endDate - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElectionCountdown({ days, hours, minutes, seconds });
      } else if (now > endDate) {
        setElectionStatus('ended');
        setElectionCountdown(null);
        setIsElectionActive(false);
      }
    };
    updateElectionStatus();
    const intervalId = setInterval(updateElectionStatus, 1000);
    return () => clearInterval(intervalId);
  }, [electionSettings]);

  const checkUserEligibility = (userEmail, startYear, endYear, additionalEmails) => {
    if (additionalEmails && additionalEmails.includes(userEmail)) return true;
    const emailPattern = /^mse(\d{2})-[a-zA-Z0-9._-]+@mubas\.ac\.mw$/;
    const match = userEmail.match(emailPattern);
    if (!match) return false;
    const emailYear = parseInt(match[1], 10);
    const fullEmailYear = 2000 + emailYear;
    return fullEmailYear >= startYear && fullEmailYear <= endYear;
  };

  useEffect(() => {
    if (user && electionSettings && !hasUserVoted) {
      const eligible = checkUserEligibility(
        user.email, 
        electionSettings.start_year, 
        electionSettings.end_year,
        electionSettings.additional_emails
      );
      setIsUserEligible(eligible);
      setIsCheckingEligibility(false);
      if (!eligible && !hasShownEligibilityAlert) {
        Swal.fire({
          title: 'Not Eligible',
          html: `Your email (<strong>${user.email}</strong>) is not eligible to vote in this election.<br><br>
                 Only students from ${electionSettings.start_year} to ${electionSettings.end_year} are eligible.`,
          icon: 'warning',
          confirmButtonText: 'OK'
        });
        setHasShownEligibilityAlert(true);
      }
      if (isElectionActive && eligible) {
        fetchCandidates();
      }
    }
  }, [user, electionSettings, isElectionActive, hasUserVoted]);

  const allPositionsVoted = () => {
    return requiredPositions.every(position => votedPositions[position]);
  };

  const getMissingPositions = () => {
    return requiredPositions.filter(position => !votedPositions[position]);
  };

  const handleSubmitAllVotes = async () => {
    const missing = getMissingPositions();
    if (missing.length > 0) {
      setMissingPositions(missing);
      setShowSubmitModal(true);
      return;
    }
    
    try {
      setIsSubmittingAll(true);
      const votesData = Object.entries(votedCandidates).map(([position, candidateId]) => ({
        position,
        candidate_id: candidateId
      }));
      const csrfToken = await ensureCSRFToken(API_BASE_URL);
      const authHeaders = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/bulk-vote/`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ votes: votesData })
      });
      
      if (response.ok) {
        setHasUserVoted(true);
        localStorage.removeItem('somasVotes');
        Swal.fire({
          title: 'Votes Submitted Successfully!',
          text: 'Thank you for participating in the election. Your votes have been recorded.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to submit votes');
      }
    } catch (err) {
      console.error('Error submitting votes:', err);
      Swal.fire({
        title: 'Error',
        text: 'An error occurred while submitting your votes. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const filteredCandidates = activePosition === 'all' 
    ? candidates 
    : candidates.filter(candidate => candidate.position === activePosition);

  const handleVoteClick = (candidate) => {
    if (!user) {
      Swal.fire({ title: 'Login Required', text: 'Please log in to vote', icon: 'warning', confirmButtonText: 'OK' });
      return;
    }
    if (!isElectionActive) {
      Swal.fire({ title: 'Election Not Active', text: 'Voting is currently not available. Please check the election schedule.', icon: 'info', confirmButtonText: 'OK' });
      return;
    }
    if (!isUserEligible) {
      Swal.fire({
        title: 'Not Eligible',
        html: `Your email (<strong>${user.email}</strong>) is not eligible to vote in this election.<br><br>
               Only students from ${electionSettings.start_year} to ${electionSettings.end_year} are eligible.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    if (votedCandidates[candidate.position] === candidate.id) {
      const newVotedCandidates = { ...votedCandidates };
      delete newVotedCandidates[candidate.position];
      const newVotedPositions = { ...votedPositions };
      delete newVotedPositions[candidate.position];
      setVotedCandidates(newVotedCandidates);
      setVotedPositions(newVotedPositions);
      localStorage.setItem('somasVotes', JSON.stringify(newVotedCandidates));
    } else if (votedCandidates[candidate.position]) {
      Swal.fire({ title: 'Already Voted', text: 'You have already voted for this position!', icon: 'warning', confirmButtonText: 'OK' });
    } else {
      const newVotedCandidates = { ...votedCandidates, [candidate.position]: candidate.id };
      const newVotedPositions = { ...votedPositions, [candidate.position]: true };
      setVotedCandidates(newVotedCandidates);
      setVotedPositions(newVotedPositions);
      localStorage.setItem('somasVotes', JSON.stringify(newVotedCandidates));
    }
  };

  const renderUserAvatar = (user) => {
    if (user.profile_photo) {
      return <img src={user.profile_photo} alt={user.username} className="avatar-image" />;
    } else {
      return user.username ? user.username.charAt(0).toUpperCase() : '?';
    }
  };

  const handleLoginRedirect = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handlePositionChange = (e) => {
    setActivePosition(e.target.value);
  };

  const votedCount = Object.keys(votedPositions).length;
  const totalPositions = requiredPositions.length;

  const renderCountdownTimer = () => {
    if (electionStatus === 'checking') {
      return <div className="election-status-banner checking"><i className="fas fa-spinner fa-spin"></i><span>Checking election status...</span></div>;
    }
    if (electionStatus === 'not_set') {
      return <div className="election-status-banner not-set"><i className="fas fa-calendar-times"></i><span>Election not scheduled yet</span></div>;
    }
    if (electionStatus === 'ended') {
      return <div className="election-status-banner ended"><i className="fas fa-flag-checkered"></i><span>Elections not active. you will be notified when it`s time to vote!</span></div>;
    }
    if (!electionCountdown) return null;
    
    const { days, hours, minutes, seconds } = electionCountdown;
    const isCountdownToStart = countdownType === 'start';
    
    return (
      <div className={`election-countdown ${countdownType}`}>
        <div className="countdown-header">
          <i className={`fas ${isCountdownToStart ? 'fa-hourglass-start' : 'fa-hourglass-end'}`}></i>
          <span>{isCountdownToStart ? 'Election starts in:' : 'Election ends in:'}</span>
        </div>
        <div className="countdown-timer">
          {days > 0 && (
            <>
              <div className="countdown-unit"><span className="unit-value">{days}</span><span className="unit-label">days</span></div>
              <span className="countdown-separator">:</span>
            </>
          )}
          <div className="countdown-unit"><span className="unit-value">{hours.toString().padStart(2, '0')}</span><span className="unit-label">hours</span></div>
          <span className="countdown-separator">:</span>
          <div className="countdown-unit"><span className="unit-value">{minutes.toString().padStart(2, '0')}</span><span className="unit-label">minutes</span></div>
          <span className="countdown-separator">:</span>
          <div className="countdown-unit"><span className="unit-value">{seconds.toString().padStart(2, '0')}</span><span className="unit-label">seconds</span></div>
        </div>
      </div>
    );
  };

  if (!user && !isCheckingEligibility) {
    return (
      <div className="voting-container">
        <header><div className="logo"><div className="logo-img"><img src={somaselogo} alt="somase logo"/></div><div className="logo-text">SOMASE Voting</div></div></header>
        <div className="status-message">
          <div className="status-icon"><i className="fas fa-exclamation-circle"></i></div>
          <h2>Authentication Required</h2>
          <p>You need to login to access the voting dashboard.</p>
          <div className="button-group"><button onClick={handleLoginRedirect} className="modal-btn confirm">Go to Login</button></div>
        </div>
      </div>
    );
  }

  if (hasUserVoted) {
    return (
      <div className="voting-container">
        <header>
          <div className="logo"><div className="logo-img"><img src={somaselogo} alt="somase logo"/></div><div className="logo-text">SOMASE Voting</div></div>
          <div className="user-info"><span>Welcome, {user.username}</span><div className="user-avatar">{renderUserAvatar(user)}</div></div>
        </header>
        <div className="status-message">
          <div className="status-icon"><i className="fas fa-check-circle" style={{color: '#2ecc71'}}></i></div>
          <h2>{user.username} Thank You for Voting!</h2>
          <p>Your votes have been successfully submitted. You cannot vote again.</p>
          <div className="button-group"><button onClick={handleLoginRedirect} className="modal-btn cancel">Logout</button></div>
        </div>
      </div>
    );
  }

  if (user && !isUserEligible && !isCheckingEligibility) {
    return (
      <div className="voting-container">
        <header>
          <div className="logo"><div className="logo-img"><img src={somaselogo} alt="somase logo"/></div><div className="logo-text">SOMASE Voting</div></div>
          <div className="user-info"><span>Welcome, {user.username}</span><div className="user-avatar">{renderUserAvatar(user)}</div></div>
        </header>
        <div className="status-message">
          <div className="status-icon"><i className="fas fa-user-times" style={{color: '#e74c3c'}}></i></div>
          <h2>Not Eligible to Vote</h2>
          <p>Your email (<strong>{user.email}</strong>) is not eligible to vote in this election.<br />Only students from {electionSettings ? electionSettings.start_year : ''} to {electionSettings ? electionSettings.end_year : ''} are eligible.</p>
          <div className="button-group"><button onClick={handleLoginRedirect} className="modal-btn cancel">Go Back</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-container">
      <header>
        <div className="logo"><div className="logo-img"><img src={somaselogo} alt="somase logo"/></div><div className="logo-text">SOMASE Voting</div></div>
        <div className="user-info">
          {user ? (<><span>Welcome, {user.username}</span><div className="user-avatar">{renderUserAvatar(user)}</div></>) : (<><span>Please log in to vote</span><div className="user-avatar">?</div></>)}
        </div>
      </header>
      
      {showMobileMenu && (
        <div className="mobile-menu">
          <div className="mobile-menu-header"><h3>Menu</h3><div className="close-menu" onClick={() => setShowMobileMenu(false)}><i className="fas fa-times"></i></div></div>
          <div className="mobile-menu-content">
            {myApplication && (<div className="mobile-menu-item" onClick={() => { setShowApplicationModal(true); setShowMobileMenu(false); }}><i className="fas fa-bullhorn"></i><span>My Application</span></div>)}
            <div className="mobile-menu-item" onClick={handleLoginRedirect}><i className="fas fa-sign-out-alt"></i><span>Logout</span></div>
          </div>
        </div>
      )}
      
      {myApplication && (
        <div className="application-banner">
          <div className="application-info"><i className="fas fa-bullhorn"></i><span>You have a candidate application for {myApplication.position_display}</span><span className={`status-badge ${myApplication.status}`}>{myApplication.status.charAt(0).toUpperCase() + myApplication.status.slice(1)}</span></div>
          <button className="view-application-btn" onClick={() => setShowApplicationModal(true)}>View Application</button>
        </div>
      )}
      
      <div className="dashboard-header">
        <h1 className="dashboard-title">2025 SOMASE Elections</h1>
        <p className="dashboard-subtitle">Cast your vote for the candidates who will lead our organization forward. Your vote matters!</p>
      </div>
      
      {renderCountdownTimer()}
      
      {isElectionActive && isUserEligible && (
        <div className="position-selector-container">
          <select className="position-selector" value={activePosition} onChange={handlePositionChange}>
            {positions.map(position => (<option key={position.id} value={position.id}>{position.name} {votedPositions[position.id] && position.id !== 'all' ? '✓' : ''}</option>))}
          </select>
        </div>
      )}
      
      {isElectionActive && isUserEligible && (
        <div className="positions-tabs">
          {positions.map(position => (
            <div key={position.id} className={`position-tab ${activePosition === position.id ? 'active' : ''}`} onClick={() => setActivePosition(position.id)}>
              {position.name}{votedPositions[position.id] && position.id !== 'all' && (<span className="vote-indicator">✓</span>)}
            </div>
          ))}
        </div>
      )}
      
      {loading && isElectionActive && isUserEligible && (<div className="loading-state"><div className="spinner"></div><p>Loading candidates...</p></div>)}
      
      {error && isElectionActive && isUserEligible && (
        <div className="error-state"><i className="fas fa-exclamation-triangle"></i><p>Error loading candidates: {error}</p><button onClick={fetchCandidates}>Try Again</button></div>
      )}
      
      {!loading && !error && isElectionActive && isUserEligible && (
        <div className="candidates-container">
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map(candidate => (
              <div key={candidate.id} className="candidate-card">
                <div className="candidate-image">
                  <img src={candidate.profile_photo || 'https://via.placeholder.com/200x200?text=Candidate'} alt={candidate.full_name} onError={(e) => { e.target.src = 'https://via.placeholder.com/200x200?text=Candidate'; }} />
                  {votedCandidates[candidate.position] === candidate.id && (<div className="selected-overlay">Selected</div>)}
                </div>
                <div className="candidate-details">
                  <div className="candidate-position">{candidate.position_display || positions.find(p => p.id === candidate.position)?.name}</div>
                  <h3 className="candidate-name">{candidate.full_name}</h3>
                  <p className="candidate-slogan">"{candidate.slogan || 'No slogan provided'}"</p>
                  {user ? (
                    <button className={`vote-btn ${votedCandidates[candidate.position] === candidate.id ? 'unvote' : ''}`} onClick={() => handleVoteClick(candidate)}>
                      {votedCandidates[candidate.position] === candidate.id ? 'Unvote' : votedCandidates[candidate.position] ? 'Change Vote' : 'Vote'}
                    </button>
                  ) : (<button className="vote-btn disabled" disabled>Login to Vote</button>)}
                </div>
              </div>
            ))
          ) : (<div className="no-candidates">No candidates found for this position.</div>)}
        </div>
      )}
      
      {user && isElectionActive && isUserEligible && (
        <div className="mobile-bottom-nav">
          <div className="progress-info">{votedCount}/{totalPositions} voted</div>
          <button className={`mobile-nav-btn ${allPositionsVoted() ? 'complete' : ''}`} onClick={handleSubmitAllVotes} disabled={!allPositionsVoted() || isSubmittingAll}>
            {isSubmittingAll ? 'Submitting...' : allPositionsVoted() ? 'Submit All' : `Submit (${votedCount}/${totalPositions})`}
          </button>
        </div>
      )}
      
      <div className="button-group"><button onClick={handleLoginRedirect} className="modal-btn cancel">Go Back</button></div>

      {showSubmitModal && (
        <div className="modal" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Complete Your Vote</h2>
            <p className="modal-text">Please vote for the following positions before submitting:</p>
            <ul className="missing-positions-list">
              {missingPositions.map(position => (<li key={position}>{positions.find(p => p.id === position)?.name || position}</li>))}
            </ul>
            <div className="modal-buttons"><button className="modal-btn cancel" onClick={() => setShowSubmitModal(false)}>OK</button></div>
          </div>
        </div>
      )}

      {showApplicationModal && myApplication && (
        <div className="modal" onClick={() => setShowApplicationModal(false)}>
          <div className="modal-content application-modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Your Candidate Application</h2>
            <div className="application-details">
              <div className="detail-row"><label>Position:</label><span>{myApplication.position_display}</span></div>
              <div className="detail-row"><label>Status:</label><span className={`status-text ${myApplication.status}`}>{myApplication.status.charAt(0).toUpperCase() + myApplication.status.slice(1)}</span></div>
              <div className="detail-row"><label>Full Name:</label><span>{myApplication.full_name}</span></div>
              <div className="detail-row"><label>Phone:</label><span>{myApplication.phone}</span></div>
              <div className="detail-row"><label>Slogan:</label><span>"{myApplication.slogan}"</span></div>
              <div className="detail-row"><label>Manifesto:</label><div className="manifesto-content">{myApplication.manifesto}</div></div>
              {myApplication.profile_photo && (<div className="detail-row"><label>Profile Photo:</label><img src={myApplication.profile_photo} alt="Profile" className="application-photo" /></div>)}
            </div>
            <div className="modal-buttons">
              {(myApplication.status === 'pending' || myApplication.status === 'rejected') && (
                <>
                  <button className="modal-btn danger" onClick={handleDeleteApplication} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete Application'}</button>
                  <button className="modal-btn primary" onClick={handleEditApplication}>Edit Application</button>
                </>
              )}
              <button className="modal-btn cancel" onClick={() => setShowApplicationModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MUBASVotingDashboard;