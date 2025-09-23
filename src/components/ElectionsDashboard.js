import React, { useState, useEffect } from 'react';
import './ElectionDashboard.css';
import Swal from 'sweetalert2';
import somaselogo from '../images/somase-logo.jpeg';
import { BASE_URL } from '../config';
import { ensureCSRFToken, getCookie } from '../utils/csrf';

const ElectionDashboard = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarActive, setSidebarActive] = useState(false);
 const [electionCountdown, setElectionCountdown] = useState(null);
const [countdownType, setCountdownType] = useState(null); // 'start' or 'end'
    const [electionStarted, setElectionStarted] = useState(false);
  const [userDropdownActive, setUserDropdownActive] = useState(false);
  const [userDropdownMobileActive, setUserDropdownMobileActive] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchActiveMobile, setSearchActiveMobile] = useState(false);
  const [moderatorFormActive, setModeratorFormActive] = useState(false);
  const [vicePresidentFormActive, setVicePresidentFormActive] = useState(false);
  const [transferPresidencyFormActive, setTransferPresidencyFormActive] = useState(false);
  const [applicationModalActive, setApplicationModalActive] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [scrollTopVisible, setScrollTopVisible] = useState(false);
  const [moderatorFormData, setModeratorFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'moderator'
  });
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [editingModerator, setEditingModerator] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realTimeData, setRealTimeData] = useState({
    totalVotes: 0,
    candidates: []
  });
  const [electionSettings, setElectionSettings] = useState({
    start_year: 2022,
    end_year: 2025,
    election_title: "SOMASE Executive Election",
    start_date: "",
    end_date: "",
    additional_emails: [],
    is_active: false
  });
  const [newEmail, setNewEmail] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const [vicePresidentEmail, setVicePresidentEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [moderators, setModerators] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
const [auditLogsLoading, setAuditLogsLoading] = useState(false);
const [auditLogsError, setAuditLogsError] = useState(null);
const [unreadAuditCount, setUnreadAuditCount] = useState(0);
const [applicationsToShow, setApplicationsToShow] = useState(5);
const [auditLogsToShow, setAuditLogsToShow] = useState(5);
const [moderatorsToShow, setModeratorsToShow] = useState(5);
const [timeUntilStart, setTimeUntilStart] = useState(null);
const [electionStatus, setElectionStatus] = useState('checking'); 
// Function to calculate time until election starts or ends
const calculateTimeRemaining = () => {
  if (!electionSettings.start_date || !electionSettings.end_date) {
    return { status: 'not_set', countdown: null, type: null };
  }
  
  const now = new Date();
  const startDate = new Date(electionSettings.start_date);
  const endDate = new Date(electionSettings.end_date);
  
  // Check if dates are valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { status: 'not_set', countdown: null, type: null };
  }
  
  if (now < startDate) {
    // Election is scheduled but not started
    const diff = startDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { 
      status: 'scheduled', 
      countdown: { days, hours, minutes, seconds }, 
      type: 'start' 
    };
  } else if (now >= startDate && now <= endDate) {
    // Election is active
    const diff = endDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { 
      status: 'active', 
      countdown: { days, hours, minutes, seconds }, 
      type: 'end' 
    };
  } else {
    // Election has ended
    return { status: 'ended', countdown: null, type: null };
  }
};
// Update the useEffect that handles the election countdown
useEffect(() => {
  if (electionSettings.start_date && electionSettings.end_date) {
    const updateElectionStatus = () => {
      const { status, countdown, type } = calculateTimeRemaining();
      setElectionStatus(status);
      setCountdownType(type);
      setElectionCountdown(countdown);
      
      // Automatically start election when countdown reaches zero
      if (status === 'active' && countdownType === 'start') {
        setElectionStarted(true);
        startElection(true); // Pass true to indicate automatic start

      }
    };
    
    // Initial update
    updateElectionStatus();
    
    // Set up interval to update countdown every second
    const interval = setInterval(updateElectionStatus, 1000);
    
    return () => clearInterval(interval);
  }
}, [electionSettings,electionStarted]);

useEffect(() => {
  setElectionStarted(false);
}, [electionSettings]);

const deleteAllCandidates = async () => {
  try {
    const result = await Swal.fire({
      title: 'Are you absolutely sure?',
      text: "This will permanently delete ALL candidate applications. This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger-color)',
      cancelButtonColor: 'var(--secondary-color)',
      confirmButtonText: 'Yes, delete all applications!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      allowOutsideClick: false
    });

    if (result.isConfirmed) {
     // const csrfToken = getCSRFToken();
     const csrfToken = await ensureCSRFToken(BASE_URL);
      const response = await fetch(`${BASE_URL}/api/candidates/delete-all/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include'
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Applications Deleted',
          text: 'All candidate applications have been deleted successfully!',
          timer: 3000,
          showConfirmButton: false
        });
        
        // Refresh candidates list
        fetchCandidates();
        
        // Create audit log entry
        const newAuditLog = {
          id: auditLogs.length + 1,
          date: new Date().toLocaleString(),
          user: 'Admin User',
          action: 'Delete all candidates',
          details: 'Deleted all candidate applications'
        };
        
        setAuditLogs(prev => [newAuditLog, ...prev]);
      } else {
        const errorData = await response.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorData.error || 'Error deleting applications'
        });
      }
    }
  } catch (err) {
    console.error('Error deleting applications:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'An error occurred while deleting applications'
    });
  }
};

const showMoreItems = (type) => {
  if (type === 'applications') {
    setApplicationsToShow(applicationsToShow + 5);
  } else if (type === 'audit') {
    setAuditLogsToShow(auditLogsToShow + 5);
  } else if (type === 'moderators') {
    setModeratorsToShow(moderatorsToShow + 5);
  }
};
const startCountdownToElection = (timeUntilStart) => {
  setCountdownType('start');
  setElectionCountdown(timeUntilStart);
  
  // Start countdown interval
  const countdownInterval = setInterval(() => {
    setElectionCountdown(prev => {
      if (!prev) return null;
      
      let { days, hours, minutes, seconds } = prev;
      
      // Decrement seconds
      seconds -= 1;
      
      // Handle minute rollover
      if (seconds < 0) {
        seconds = 59;
        minutes -= 1;
      }
      
      // Handle hour rollover
      if (minutes < 0) {
        minutes = 59;
        hours -= 1;
      }
      
      // Handle day rollover
      if (hours < 0) {
        hours = 23;
        days -= 1;
      }
      
      // Check if countdown has ended
      if (days <= 0 && hours <= 0 && minutes <= 0 && seconds <= 0) {
        clearInterval(countdownInterval);
        // DON'T automatically start the election - just update status
        fetchElectionSettings(); // Refresh to get updated status
        return null;
      }
      
      return { days, hours, minutes, seconds };
    });
  }, 1000);
};
const startCountdownToElectionEnd = (timeRemaining) => {
  setCountdownType('end');
  setElectionCountdown(timeRemaining);
  
  // Start countdown interval
  const countdownInterval = setInterval(() => {
    setElectionCountdown(prev => {
      if (!prev) return null;
      
      let { days, hours, minutes, seconds } = prev;
      
      // Decrement seconds
      seconds -= 1;
      
      // Handle minute rollover
      if (seconds < 0) {
        seconds = 59;
        minutes -= 1;
      }
      
      // Handle hour rollover
      if (minutes < 0) {
        minutes = 59;
        hours -= 1;
      }
      
      // Handle day rollover
      if (hours < 0) {
        hours = 23;
        days -= 1;
      }
      
      // Check if countdown has ended
      if (days <= 0 && hours <= 0 && minutes <= 0 && seconds <= 0) {
        clearInterval(countdownInterval);
        fetchElectionSettings(); // Refresh to check if election has ended
        return null;
      }
      
      return { days, hours, minutes, seconds };
    });
  }, 1000);
};

// Add this function to handle showing less items
const showLessItems = (type) => {
  if (type === 'applications') {
    setApplicationsToShow(5);
  } else if (type === 'audit') {
    setAuditLogsToShow(5);
  } else if (type === 'moderators') {
    setModeratorsToShow(5);
  }
};

// Fetch unread audit logs count
const fetchUnreadAuditLogsCount = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/audit-logs/unread-count/`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      setUnreadAuditCount(data.unread_count);
    }
  } catch (err) {
    console.error('Error fetching unread audit logs count:', err);
  }
};

// Mark all audit logs as read
const markAuditLogsAsRead = async () => {
  try {
    //const csrfToken = getCSRFToken();
    const csrfToken = await ensureCSRFToken(BASE_URL);
    const response = await fetch(`${BASE_URL}/api/audit-logs/mark-read/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      setUnreadAuditCount(0);
      // Refresh audit logs to update read status
      fetchAuditLogs();
    }
  } catch (err) {
    console.error('Error marking audit logs as read:', err);
  }
};
// Update the clearAuditLogs function to be user-specific
const clearAuditLogs = async () => {
  try {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will clear your view of audit logs. This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger-color)',
      cancelButtonColor: 'var(--secondary-color)',
      confirmButtonText: 'Yes, clear my logs!'
    });

    if (result.isConfirmed) {
      //const csrfToken = getCSRFToken();
      const csrfToken = await ensureCSRFToken(BASE_URL);
      const response = await fetch(`${BASE_URL}/api/audit-logs/clear/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include'
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Audit Logs Cleared',
          text: 'Your view of audit logs has been cleared successfully!',
          timer: 2000,
          showConfirmButton: false
        });
        // Refetch audit logs
        fetchAuditLogs();
        // Reset unread count
        setUnreadAuditCount(0);
      } else {
        const errorData = await response.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorData.error || 'Error clearing audit logs'
        });
      }
    }
  } catch (err) {
    console.error('Error clearing audit logs:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'An error occurred while clearing audit logs'
    });
  }
};

// Update the useEffect for audit logs to also fetch unread count
useEffect(() => {
  if (activePage === 'audit') {
    fetchAuditLogs();
    markAuditLogsAsRead(); // Mark as read when opened
  }
}, [activePage]);

// Fetch unread count on component mount and periodically
useEffect(() => {
  fetchUnreadAuditLogsCount();
  const intervalId = setInterval(fetchUnreadAuditLogsCount, 30000); // Update every 30 seconds
  return () => clearInterval(intervalId);
}, []);


const handleLogout = async () => {
  try {
    //const csrfToken = getCSRFToken();
    const csrfToken = await ensureCSRFToken(BASE_URL);
    const response = await fetch(`${BASE_URL}/api/auth/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      // Redirect to login page
      window.location.href = '/login';
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Logout Failed',
        text: 'Failed to logout. Please try again.'
      });
    }
  } catch (err) {
    console.error('Error during logout:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'An error occurred during logout'
    });
  }
};
// Fetch audit logs from backend
const fetchAuditLogs = async () => {
  try {
    setAuditLogsLoading(true);
    const response = await fetch(`${BASE_URL}/api/audit-logs/`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    setAuditLogs(data.logs);
    setAuditLogsError(null);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    setAuditLogsError(err.message);
  } finally {
    setAuditLogsLoading(false);
  }
};

// Fetch audit logs when audit page is active
useEffect(() => {
  if (activePage === 'audit') {
    fetchAuditLogs();
  }
}, [activePage]);

// Format date function
const formatAuditLogDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Fetch candidates from backend
  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/candidates/applications/`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch candidates: ${response.status} ${response.statusText}`);
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

  // Fetch real-time data
  const fetchRealTimeData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/results/`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRealTimeData(data);
      }
    } catch (err) {
      console.error('Error fetching real-time data:', err);
    }
  };
  
const resetAllVotes = async () => {
  try {
    const result = await Swal.fire({
      title: 'Are you absolutely sure?',
      text: "This will permanently delete ALL votes and reset ALL candidate vote counts to zero. This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger-color)',
      cancelButtonColor: 'var(--secondary-color)',
      confirmButtonText: 'Yes, reset all votes!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      allowOutsideClick: false
    });

    if (result.isConfirmed) {
      //const csrfToken = getCSRFToken();
      const csrfToken = await ensureCSRFToken(BASE_URL);
      const response = await fetch(`${BASE_URL}/api/reset-votes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include'
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Votes Reset Successfully',
          text: 'All votes have been reset and candidate vote counts set to zero.',
          timer: 3000,
          showConfirmButton: false
        });
        
        // Refresh data
        fetchRealTimeData();
        fetchCandidates();
        
        // Create audit log entry
        const newAuditLog = {
          id: auditLogs.length + 1,
          date: new Date().toLocaleString(),
          user: 'Admin User',
          action: 'Reset all votes',
          details: 'Reset all votes and candidate vote counts to zero'
        };
        
        setAuditLogs(prev => [newAuditLog, ...prev]);
      } else {
        const errorData = await response.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorData.error || 'Error resetting votes'
        });
      }
    }
  } catch (err) {
    console.error('Error resetting votes:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'An error occurred while resetting votes'
    });
  }
};

// Confirmation dialog for resetting votes
const confirmResetVotes = () => {
  Swal.fire({
    title: 'Reset All Votes?',
    text: "This will delete all voting data and reset candidate vote counts to zero. Are you sure you want to proceed?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: 'var(--danger-color)',
    cancelButtonColor: 'var(--secondary-color)',
    confirmButtonText: 'Yes, reset votes!',
    cancelButtonText: 'Cancel',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      resetAllVotes();
    }
  });
};
// Update the fetchElectionSettings function
const fetchElectionSettings = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/election-settings/`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Ensure additional_emails is always an array
      let additionalEmailsArray = [];
      if (Array.isArray(data.additional_emails)) {
        additionalEmailsArray = data.additional_emails;
      } else if (typeof data.additional_emails === 'string') {
        // Handle case where it might be a string representation of an array
        try {
          additionalEmailsArray = JSON.parse(data.additional_emails.replace(/'/g, '"'));
        } catch (e) {
          // If parsing fails, split by newline
          additionalEmailsArray = data.additional_emails.split('\n').filter(email => email.trim() !== '');
        }
      }
      
// Update the formatDateForInput function
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    // Convert to local datetime string in the format YYYY-MM-DDTHH:MM
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
                      .toISOString()
                      .slice(0, 16);
    return localDate;
  } catch (e) {
    console.error('Error formatting date:', e);
    return '';
  }
};
      
      const settings = {
        ...data,
        additional_emails: additionalEmailsArray,
        // Format dates for input fields
        start_date: formatDateForInput(data.start_date),
        end_date: formatDateForInput(data.end_date)
      };
      
      setElectionSettings(settings);
    }
  } catch (err) {
    console.error('Error fetching election settings:', err);
  }
};


  // Update candidate status
  const updateCandidateStatus = async (id, newStatus) => {
    try {
      //const csrfToken = getCSRFToken();
      const csrfToken = await ensureCSRFToken(BASE_URL);
      const response = await fetch(`${BASE_URL}/api/candidates/${id}/status/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        // Update local state
        setCandidates(prev => prev.map(candidate => 
          candidate.id === id ? { ...candidate, status: newStatus } : candidate
        ));
        
        // Show success message
        Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          text: `Candidate status has been updated to ${newStatus}`,
          timer: 2000,
          showConfirmButton: false
        });
        
        // Update audit logs
        const candidate = candidates.find(c => c.id === id);
        const newAuditLog = {
          id: auditLogs.length + 1,
          date: new Date().toLocaleString(),
          user: 'Admin User',
          action: `${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} candidate`,
          details: `${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} ${candidate.full_name} for ${candidate.position_display}`
        };
        
        setAuditLogs(prev => [newAuditLog, ...prev]);
      } else {
        const errorText = await response.text();
        console.error('Status update error response:', errorText);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error updating candidate status. Please try again.'
        });
      }
    } catch (err) {
      console.error('Error updating candidate status:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while updating candidate status. Please try again.'
      });
    }
  };

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Unknown time';
  
  try {
    let date;
    
    // Handle ISO string format (from Django)
    if (typeof dateString === 'string' && dateString.includes('T')) {
      date = new Date(dateString);
    } 
    // Handle timestamp format
    else if (typeof dateString === 'number') {
      date = new Date(dateString);
    }
    // Handle Date object
    else if (dateString instanceof Date) {
      date = dateString;
    }
    // Handle object format (if backend returns an object)
    else if (typeof dateString === 'object' && dateString.timestamp) {
      date = new Date(dateString.timestamp);
    }
    // Fallback for other formats
    else {
      date = new Date(dateString);
    }
    
    if (!date || isNaN(date.getTime())) {
      console.warn('Invalid date format:', dateString);
      return 'Unknown time';
    }
    
    const now = new Date();
    const diffInMs = now - date;
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInDays < 30) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return 'Unknown time';
  }
};
  // Save election settings
const saveElectionSettings = async () => {
  try {
   // const csrfToken = getCSRFToken();
    const csrfToken = await ensureCSRFToken(BASE_URL);
    const formatDateForBackend = (dateString) => {
  if (!dateString) return null;
  
  // Create date object from local datetime string
  const date = new Date(dateString);
  
  // Convert to ISO string and remove timezone information
  // This ensures the backend receives the exact datetime the user selected
  return date.toISOString().replace('Z', '');
};

    
    // Format the data correctly for the backend
    const settingsToSend = {
      ...electionSettings,
      // Convert additional_emails array to newline-separated string
      additional_emails: electionSettings.additional_emails.join('\n'),
      // Format dates for backend
      start_date: formatDateForBackend(electionSettings.start_date),
      end_date: formatDateForBackend(electionSettings.end_date)
    };
    
    // Remove any empty or null values that might cause issues
    Object.keys(settingsToSend).forEach(key => {
      if (settingsToSend[key] === null || settingsToSend[key] === '') {
        delete settingsToSend[key];
      }
    });
    
    const response = await fetch(`${BASE_URL}/api/election-settings/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify(settingsToSend)
    });
    
    if (response.ok) {
      Swal.fire({
        icon: 'success',
        title: 'Settings Saved',
        text: 'Election settings have been saved successfully!',
        timer: 2000,
        showConfirmButton: false
      });
      fetchElectionSettings(); // Refresh settings
      return true;
    } else {
      // Try to get more detailed error information
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      let errorMessage = 'Error saving election settings';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage
      });
      return false;
    }
  } catch (err) {
    console.error('Error saving election settings:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'An error occurred while saving settings'
    });
    return false;
  }
};
const startElection = async (isAutomatic = false) => {
  try {
    if (!isAutomatic) {
      const saveSuccess = await saveElectionSettings();
      if (!saveSuccess) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Cannot start election without saving settings first'
        });
        return;
      }
    }
    const csrfToken = await ensureCSRFToken(BASE_URL);
    //const csrfToken = getCSRFToken();
    const response = await fetch(`${BASE_URL}/api/start-election/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Send email notifications - ensure this happens after election is started
     if (electionSettings.end_date)
       try {
        const emailResponse = await fetch(`${BASE_URL}/api/send-election-start-emails/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          credentials: 'include'
        });
        
        if (emailResponse.ok) {
          console.log('Election start emails sent successfully');
        } else {
          console.error('Failed to send election start emails');
          // Even if email sending fails, we should still proceed
        }
      } catch (emailError) {
        console.error('Error sending election start emails:', emailError);
        // Even if email sending fails, we should still proceed
      }
      
      if (!isAutomatic) {
        if (data.election_status === 'scheduled') {
          Swal.fire({
            icon: 'success',
            title: 'Election Scheduled',
            text: data.message,
            timer: 3000,
            showConfirmButton: false
          });
        } else if (data.election_status === 'active') {
          Swal.fire({
            icon: 'success',
            title: 'Election Active',
            text: data.message,
            timer: 3000,
            showConfirmButton: false
          });
        }
      } else {
        console.log('Election started automatically:', data.message);
      }
      
      fetchElectionSettings();
    } else {
      const errorData = await response.json().catch(() => ({}));
      if (!isAutomatic) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorData.error || 'Error starting election'
        });
      } else {
        console.error('Error starting election automatically:', errorData.error);
      }
    }
  } catch (err) {
    console.error('Error starting election:', err);
    if (!isAutomatic) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while starting the election'
      });
    } else {
      console.error('Error starting election automatically:', err);
    }
  }
};

const cancelElection = async () => {
  try {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will cancel the current election. This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, cancel election!',
      cancelButtonText: 'No, keep it running'
    });
    
    if (result.isConfirmed) {
      //const csrfToken = getCSRFToken();
      const csrfToken = await ensureCSRFToken(BASE_URL);
      const response = await fetch(`${BASE_URL}/api/cancel-election/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        Swal.fire({
          icon: 'success',
          title: 'Election Cancelled',
          text: data.message || 'Election has been cancelled successfully!',
          timer: 3000,
          showConfirmButton: false
        });
        
        // Reset all election-related states
        setElectionSettings(prev => ({
          ...prev,
          is_active: false,
          start_date: "",
          end_date: ""
        }));
        setElectionCountdown(null);
        setElectionStatus('not_set');
        
        // Refresh settings
        fetchElectionSettings();
      } else {
        const errorData = await response.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorData.error || 'Error cancelling election'
        });
      }
    }
  } catch (err) {
    console.error('Error cancelling election:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'An error occurred while cancelling the election'
    });
  }
};
// Add this function to periodically check if election should end
useEffect(() => {
  const checkElectionEnd = async () => {
    if (electionSettings && electionSettings.is_active) {
      try {
        const response = await fetch(`${BASE_URL}/api/check-election-end/`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'ended') {
            // Election has ended automatically
            setElectionSettings(prev => ({
              ...prev,
              is_active: false
            }));
            
            Swal.fire({
              icon: 'info',
              title: 'Election Ended',
              text: 'The election has ended automatically as scheduled. All users have been notified.',
              timer: 3000,
              showConfirmButton: false
            });
            
            // Stop the countdown
            setElectionCountdown(null);
          }
        }
      } catch (err) {
        console.error('Error checking election end:', err);
      }
    }
  };
  
  // Check every minute if election should end
  const interval = setInterval(checkElectionEnd, 60000);
  
  return () => clearInterval(interval);
}, [electionSettings]);
  const addEmail = async () => {
    const cleanEmail = newEmail.replace(/\\/g, '').trim();
    if (cleanEmail) {
      if (!isValidEmail(cleanEmail)) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid Email',
          text: 'Please enter a valid email address'
        });
        return;
      }
      
      if (!electionSettings.additional_emails.includes(cleanEmail)) {
        try {
         // const csrfToken = getCSRFToken();
         const csrfToken = await ensureCSRFToken(BASE_URL);
          const response = await fetch(`${BASE_URL}/api/election-settings/`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken,
            },
            credentials: 'include',
            body: JSON.stringify({
              email_operation: 'add',
              email: newEmail
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            setElectionSettings({
              ...electionSettings,
              additional_emails: data.additional_emails
            });
            setNewEmail("");
            console.log('Email added successfully:', data);
            
            Swal.fire({
              icon: 'success',
              title: 'Email Added',
              text: 'Email has been added successfully!',
              timer: 2000,
              showConfirmButton: false
            });
          } else {
            const errorText = await response.text();
            console.error('Error adding email:', errorText);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Error adding email. Please try again.'
            });
          }
        } catch (err) {
          console.error('Error adding email:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while adding email. Please try again.'
          });
        }
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Duplicate Email',
          text: 'This email is already in the list'
        });
      }
    }
  };

  // Remove email from additional emails
  const removeEmail = async (emailToRemove) => {
    try {
      const csrfToken = await ensureCSRFToken(BASE_URL);
     // const csrfToken = getCSRFToken();
      const response = await fetch(`${BASE_URL}/api/election-settings/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          email_operation: 'remove',
          email: emailToRemove
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setElectionSettings({
          ...electionSettings,
          additional_emails: data.additional_emails
        });
        console.log('Email removed successfully:', data);
        
        Swal.fire({
          icon: 'success',
          title: 'Email Removed',
          text: 'Email has been removed successfully!',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        const errorText = await response.text();
        console.error('Error removing email:', errorText);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error removing email. Please try again.'
        });
      }
    } catch (err) {
      console.error('Error removing email:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while removing email. Please try again.'
      });
    }
  };

  // // Helper function to get CSRF token
  // const getCSRFToken = () => {
  //   const cookieValue = document.cookie
  //     .split('; ')
  //     .find(row => row.startsWith('csrftoken='))
  //     ?.split('=')[1];
    
  //   return cookieValue || '';
  // };

  // Handle scroll events for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setScrollTopVisible(window.scrollY > 300);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownActive && !e.target.closest('.user-info')) {
        setUserDropdownActive(false);
      }
      if (userDropdownMobileActive && !e.target.closest('.user-info')) {
        setUserDropdownMobileActive(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userDropdownActive, userDropdownMobileActive]);

  // Check user role to restrict access
  const checkUserRole = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/check/`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
        // Check if user is moderator, president, or vice president
        if (data.role !== 'moderator' && data.role !== 'president' && data.role !== 'vice_president') {
          // Redirect to login or show access denied
          window.location.href = '/login';
        }
      } else {
        // Not authenticated, redirect to login
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Error checking user role:', err);
      window.location.href = '/login';
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    checkUserRole();
    fetchCandidates();
    fetchElectionSettings();
  }, []);

  // Set up real-time data polling
  useEffect(() => {
    let intervalId;
    
    if (activePage === 'dashboard' || activePage === 'results') {
      // Fetch real-time data immediately and set up interval
      fetchRealTimeData();
      intervalId = setInterval(fetchRealTimeData, 5000); // Update every 5 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activePage]);

  // Navigation handler
  const handleNavigation = (pageId) => {
    setActivePage(pageId);
    // On mobile, close sidebar after selection
    if (window.innerWidth < 992) {
      setSidebarActive(false);
    }
  };
  
  // Update pattern preview
  const updatePatternPreview = (start, end) => {
    if (start > end) {
      return [];
    }
    
    const patterns = [];
    for (let year = start; year <= end; year++) {
      const shortYear = year.toString().slice(-2);
      patterns.push(`mse${shortYear}-*`);
    }
    
    return patterns;
  };
  
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Toggle search input
  const toggleSearch = (isMobile = false) => {
    if (isMobile) {
      setSearchActiveMobile(!searchActiveMobile);
    } else {
      setSearchActive(!searchActive);
    }
  };
  
  // Moderator form handlers
  const openModeratorForm = () => {
    setModeratorFormActive(true);
    setEditingModerator(false);
    setModeratorFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'moderator'
    });
  };
  
  const closeModeratorForm = () => {
    setModeratorFormActive(false);
  };

  // Vice President form handlers
  const openVicePresidentForm = () => {
    setVicePresidentFormActive(true);
    setVicePresidentEmail("");
  };
  
  const closeVicePresidentForm = () => {
    setVicePresidentFormActive(false);
  };

  // Transfer Presidency form handlers
  const openTransferPresidencyForm = () => {
    setTransferPresidencyFormActive(true);
    setTransferEmail("");
  };
  
  const closeTransferPresidencyForm = () => {
    setTransferPresidencyFormActive(false);
  };
  
  const editModerator = (moderator) => {
    const nameParts = moderator.name.split(' ');
    setModeratorFormActive(true);
    setEditingModerator(true);
    setModeratorFormData({
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      email: moderator.email,
      role: moderator.role.toLowerCase().replace(' ', '')
    });
  };
  
  const handleModeratorInputChange = (e) => {
    const { id, value } = e.target;
    setModeratorFormData(prev => ({
      ...prev,
      [id.replace('moderator', '').toLowerCase()]: value
    }));
  };
  
  // Fetch moderators from backend
const fetchModerators = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/moderators/`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      setModerators(data);
    } else if (response.status === 403) {
      // User is not authorized to view moderators
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You do not have permission to view moderators'
      });
    }
  } catch (err) {
    console.error('Error fetching moderators:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to fetch moderators'
    });
  }
};
useEffect(() => {
    fetchCandidates();
    fetchElectionSettings();
    if (activePage === 'moderators') {
      fetchModerators();
    }
  }, [activePage]);
  // Add moderator
  const addModerator = async (email) => {
    try {
      //const csrfToken = getCSRFToken();
      const csrfToken = await ensureCSRFToken(BASE_URL);
      const response = await fetch(`${BASE_URL}/api/moderators/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'add_moderator',
          email: email
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        Swal.fire({
          icon: 'success',
          title: 'Moderator Added',
          text: data.message,
          timer: 2000,
          showConfirmButton: false
        });
        fetchModerators(); // Refresh the list
        return true;
      } else {
        const errorData = await response.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorData.error || 'Error adding moderator'
        });
        return false;
      }
    } catch (err) {
      console.error('Error adding moderator:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while adding moderator'
      });
      return false;
    }
  };

  // Remove moderator
  const removeModerator = async (id, email) => {
    try {
     // const csrfToken = getCSRFToken();
     const csrfToken = await ensureCSRFToken(BASE_URL);
      const response = await fetch(`${BASE_URL}/api/moderators/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'remove_moderator',
          email: email
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        Swal.fire({
          icon: 'success',
          title: 'Moderator Removed',
          text: data.message,
          timer: 2000,
          showConfirmButton: false
        });
        fetchModerators(); // Refresh the list
      } else {
        const errorData = await response.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorData.error || 'Error removing moderator'
        });
      }
    } catch (err) {
      console.error('Error removing moderator:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while removing moderator'
      });
    }
  };

  // Set Vice President
  const setVicePresident = async () => {
    if (!vicePresidentEmail) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please provide an email address'
      });
      return;
    }

    try {
     // const csrfToken = getCSRFToken();
     const csrfToken = await ensureCSRFToken(BASE_URL);
      const response = await fetch(`${BASE_URL}/api/moderators/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'set_vice_president',
          email: vicePresidentEmail
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        Swal.fire({
          icon: 'success',
          title: 'Vice President Set',
          text: data.message,
          timer: 2000,
          showConfirmButton: false
        });
        closeVicePresidentForm();
        fetchModerators(); // Refresh the list
      } else {
        const errorData = await response.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorData.error || 'Error setting vice president'
        });
      }
    } catch (err) {
      console.error('Error setting vice president:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while setting vice president'
      });
    }
  };

  // Transfer presidency
  const transferPresidency = async (email) => {
    try {
     // const csrfToken = getCSRFToken();
     const csrfToken = await ensureCSRFToken(BASE_URL);
      const response = await fetch(`${BASE_URL}/api/moderators/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'transfer_presidency',
          email: email
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        Swal.fire({
          icon: 'success',
          title: 'Presidency Transferred',
          text: data.message,
          timer: 2000,
          showConfirmButton: false
        });
        // Redirect to dashboard or logout
        setActivePage('dashboard');
      } else {
        const errorData = await response.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorData.error || 'Error transferring presidency'
        });
      }
    } catch (err) {
      console.error('Error transferring presidency:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while transferring presidency'
      });
    }
  };

  // Update the saveModerator function to use the API
  const saveModerator = async () => {
    if (!moderatorFormData.email) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please provide an email address'
      });
      return;
    }
    
    const success = await addModerator(moderatorFormData.email);
    if (success) {
      closeModeratorForm();
    }
  };

  // Update the removeModerator function to use the API
  const handleRemoveModerator = (id, email) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "This user will no longer be a moderator!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger-color)',
      cancelButtonColor: 'var(--secondary-color)',
      confirmButtonText: 'Yes, remove it!'
    }).then((result) => {
      if (result.isConfirmed) {
        removeModerator(id, email);
      }
    });
  };

  // Add fetchModerators to useEffect
  useEffect(() => {
    fetchCandidates();
    fetchElectionSettings();
    if (activePage === 'moderators') {
      fetchModerators();
    }
  }, [activePage]);
  
  const filteredCandidates = (activeStatusFilter === 'all' 
  ? candidates 
  : candidates.filter(candidate => candidate.status === activeStatusFilter))
  .filter(candidate => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      candidate.full_name?.toLowerCase().includes(query) ||
      candidate.position_display?.toLowerCase().includes(query) ||
      candidate.position?.toLowerCase().includes(query) ||
      candidate.email?.toLowerCase().includes(query)
    );
  });
  
  // Render functions for different page sections
  const renderStatsCards = () => (
    <div className="stats-cards">
      <div className="stat-card">
        <div className="stat-icon applications">
          <i className="fas fa-users"></i>
        </div>
        <div className="stat-value">{candidates.length}</div>
        <div className="stat-label">Total Applications</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon approved">
          <i className="fas fa-check-circle"></i>
        </div>
        <div className="stat-value">{candidates.filter(c => c.status === 'approved').length}</div>
        <div className="stat-label">Approved Candidates</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon pending">
          <i className="fas fa-clock"></i>
        </div>
        <div className="stat-value">{candidates.filter(c => c.status === 'pending').length}</div>
        <div className="stat-label">Pending Review</div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon votes">
          <i className="fas fa-vote-yea"></i>
        </div>
        <div className="stat-value">{realTimeData.totalVotes.toLocaleString()}</div>
        <div className="stat-label">Total Votes Cast</div>
        <div className="real-time-indicator">
          <span className="real-time-pulse"></span>
          Live
        </div>
      </div>
      <div className="stat-card reset-votes" onClick={confirmResetVotes}>
      <div className="stat-icon reset">
        <i className="fas fa-trash-alt"></i>
      </div>
      <div className="stat-value">Reset</div>
      <div className="stat-label">All Votes & Results</div>
      <div className="reset-warning">
        <i className="fas fa-exclamation-triangle"></i>
        Irreversible Action
      </div>
    </div>
    </div>
  );
  
  const renderApplicationTable = (candidatesToShow) => {
    const displayCandidates = window.innerWidth <= 768 
    ? candidatesToShow.slice(0, applicationsToShow)
    : candidatesToShow;
    return(
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Candidate Name</th>
            <th>Position</th>
            <th>Applied</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayCandidates.map(candidate => (
            <tr key={candidate.id}>
              <td data-label="Candidate Name">{candidate.full_name}</td>
              <td data-label="Position">{candidate.position_display || candidate.position}</td>
              <td data-label="Applied" >{formatRelativeTime(candidate.created_at)}</td>
              <td data-label="Status">
                <span className={`status-badge status-${candidate.status}`}>
                  {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                </span>
              </td>
              <td  data-label="Actions">
                <div className="action-buttons">
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setApplicationModalActive(true);
                    }}
                  >
                    <i className="fas fa-eye"></i> View
                  </button>
                  {candidate.status !== 'approved' && (
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={() => updateCandidateStatus(candidate.id, 'approved')}
                    >
                      <i className="fas fa-check"></i> Approve
                    </button>
                  )}
                  {candidate.status !== 'rejected' && (
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => updateCandidateStatus(candidate.id, 'rejected')}
                    >
                      <i className="fas fa-times"></i> Reject
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
       {window.innerWidth <= 768 && candidatesToShow.length > 5 && (
        <div className="table-controls">
          {applicationsToShow < candidatesToShow.length ? (
            <button 
              className="btn btn-primary load-more-btn"
              onClick={() => showMoreItems('applications')}
            >
              <i className="fas fa-chevron-down"></i> Load More
            </button>
          ) : (
            <button 
              className="btn btn-secondary show-less-btn"
              onClick={() => showLessItems('applications')}
            >
              <i className="fas fa-chevron-up"></i> Show Less
            </button>
          )}
        </div>
      )}
    </div>
    );
};
const renderElectionSettings = (isSettingsPage = false) => {
  const patterns = updatePatternPreview(electionSettings.start_year, electionSettings.end_year);
  
  return (
    <div className="content-section">
      <div className="section-header">
        <h2 className="section-title"><i className="fas fa-cog"></i> Election Settings</h2>
      </div>
      
      <div className="form-grid">
        <div className="form-group">
          <label>Election Title</label>
          <input 
            type="text" 
            className="form-control" 
            value={electionSettings.election_title}
            onChange={(e) => setElectionSettings({...electionSettings, election_title: e.target.value})}
          />
        </div>
        
        {/* Only show date/time controls to president */}
        {userRole === 'president' && (
          <>
            <div className="form-group">
              <label>Start Date & Time</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                value={electionSettings.start_date}
                onChange={(e) => setElectionSettings({...electionSettings, start_date: e.target.value})}
              />
              <small className="text-muted">Format: YYYY-MM-DD HH:MM</small>
            </div>
            
            <div className="form-group">
              <label>End Date & Time</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                value={electionSettings.end_date}
                onChange={(e) => setElectionSettings({...electionSettings, end_date: e.target.value})}
              />
              <small className="text-muted">Format: YYYY-MM-DD HH:MM</small>
            </div>
          </>
        )}
      </div>
      
      {/* Voter Eligibility Settings */}
      <div className="eligibility-settings">
        <h3 style={{marginBottom: '20px', color: 'var(--accent-color)'}}>
          <i className="fas fa-user-check"></i> Voter Eligibility Settings
        </h3>
        
        <div className="year-range">
          <div className="form-group year-input">
            <label>Start Year</label>
            <input 
              type="number" 
              className="form-control" 
              min="2000" 
              max="2030" 
              value={electionSettings.start_year}
              onChange={(e) => setElectionSettings({...electionSettings, start_year: parseInt(e.target.value)})}
            />
          </div>
          
          <div className="form-group year-input">
            <label>End Year</label>
            <input 
              type="number" 
              className="form-control" 
              min="2000" 
              max="2030" 
              value={electionSettings.end_year}
              onChange={(e) => setElectionSettings({...electionSettings, end_year: parseInt(e.target.value)})}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Additional Eligible Emails</label>
          <div className="email-input-container">
            <input 
              type="email" 
              className="form-control" 
              placeholder="Enter email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addEmail()}
            />
            <button className="btn btn-primary" onClick={addEmail}>
              <i className="fas fa-plus"></i> Add
            </button>
          </div>
          
          {electionSettings.additional_emails && electionSettings.additional_emails.length > 0 && (
            <div className="email-list">
              <h4 style={{margin: '15px 0 10px 0', color: 'var(--accent-color)'}}>Added Emails:</h4>
              {Array.isArray(electionSettings.additional_emails) && 
               electionSettings.additional_emails.map((email, index) => (
                <div key={index} className="email-item">
                  <span>{email}</span>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => removeEmail(email)}
                    style={{marginLeft: '10px'}}
                  >
                    <i className="fas fa-times"></i> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="eligibility-preview">
          <div className="preview-title">Eligibility Pattern Preview:</div>
          <div>
            {patterns.map(pattern => (
              <span key={pattern} className="email-pattern">{pattern}</span>
            ))}
            {patterns.length === 0 && (
              <span style={{color: 'var(--danger-color)'}}>
                Start year must be less than or equal to end year
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Display countdown only if election is scheduled or active */}
      {(electionStatus === 'scheduled' || electionStatus === 'active') && electionCountdown && renderCountdown()}
      
      <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px'}}>
        <button className="btn btn-primary" onClick={saveElectionSettings}>
          <i className="fas fa-save"></i> Save Settings
        </button>
        
        {/* Only show start/end election buttons to president */}
        {userRole === 'president' && (
          <div style={{display: 'flex', gap: '10px'}}>
            {/* <button 
              className="btn btn-success" 
              style={{flex: '1'}}
              onClick={startElection}
            >
              <i className="fas fa-play"></i> Set Elections{isSettingsPage ? ' Now' : ''}
            </button> */}
            <button 
              className="btn btn-danger" 
              style={{flex: '1'}}
              onClick={cancelElection}
              disabled={electionStatus !== 'scheduled' && electionStatus !== 'active'}
            >
              <i className="fas fa-stop"></i> {isSettingsPage ? 'Stop Election' : 'End Election'}
            </button>
          </div>
        )}
        
        {/* Show info message to non-presidents */}
        {userRole !== 'president' && (
          <div className="alert alert-info">
            {electionSettings.is_active ? (
              <span> The election is currently active.</span>
            ) : (
              <span> The election is not currently active.</span>
            )}
          </div>
        )}
        
        {electionSettings.is_active && (
          <div className="election-status-active">
            <i className="fas fa-check-circle"></i> Election is currently active
          </div>
        )}
      </div>
    </div>
  );
};
// Add this function to render the countdown display
const renderCountdown = () => {
  if (!electionCountdown) return null;
  
  const { days, hours, minutes, seconds } = electionCountdown;
  
  return (
    <div className="election-countdown">
      <h3>{countdownType === 'start' ? 'Election Starts In:' : 'Election Ends In:'}</h3>
      <div className="countdown-timer">
        {days > 0 && (
          <>
            <span className="countdown-unit">
              {days.toString().padStart(2, '0')}
              <small>days</small>
            </span>
            <span className="countdown-separator">:</span>
          </>
        )}
        <span className="countdown-unit">
          {hours.toString().padStart(2, '0')}
          <small>hours</small>
        </span>
        <span className="countdown-separator">:</span>
        <span className="countdown-unit">
          {minutes.toString().padStart(2, '0')}
          <small>minutes</small>
        </span>
        <span className="countdown-separator">:</span>
        <span className="countdown-unit">
          {seconds.toString().padStart(2, '0')}
          <small>seconds</small>
        </span>
      </div>
    </div>
  );
};

  const renderResults = (isResultsPage = false) => {
    // Group candidates by position
    const candidatesByPosition = realTimeData.candidates.reduce((acc, candidate) => {
      if (!acc[candidate.position]) {
        acc[candidate.position] = [];
      }
      acc[candidate.position].push(candidate);
      return acc;
    }, {});

    return (
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title"><i className="fas fa-chart-bar"></i> Election Results</h2>
          <div className="real-time-indicator">
            <span className="real-time-pulse"></span>
            Live Updates
          </div>
          {isResultsPage && (
            <button className="btn btn-primary"><i className="fas fa-download"></i> Export Results</button>
          )}
        </div>
        
        <div className="results-grid">
          {Object.entries(candidatesByPosition).map(([position, positionCandidates]) => {
            // Calculate total votes for this position
            const totalVotes = positionCandidates.reduce((sum, candidate) => sum + candidate.votes, 0);
            
            return (
              <div key={position} className="position-results">
                <h3 className="position-title">{positionCandidates[0].position_display}</h3>
                <div className="results-container">
                  {positionCandidates
                    .sort((a, b) => b.votes - a.votes)
                    .map((candidate, index) => {
                      const percentage = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
                      const isLeading = index === 0;
                      
                      return (
                        <div key={candidate.id} className={`candidate-result ${isLeading ? 'leading' : ''}`}>
                          <div className="candidate-info">
                            <div className="candidate-name">{candidate.full_name}</div>
                            <div className="vote-count">{candidate.votes} votes ({percentage.toFixed(1)}%)</div>
                          </div>
                          <div className="vote-bar-container">
                            <div 
                              className="vote-bar" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
const renderModerators = () => {
  // Check if current user has permission to view moderators
  const canViewModerators = ['president', 'vice_president', 'operator', 'moderator'].includes(userRole);
  
  // Check if current user has permission to manage moderators
  const canManageModerators = ['president', 'vice_president'].includes(userRole);
  
  if (!canViewModerators) {
    return (
      <div className="content-section">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle"></i> Access Denied: You do not have permission to view moderators.
        </div>
      </div>
    );
  }
  
  return (
    <div className="content-section">
      <div className="section-header">
        <h2 className="section-title"><i className="fas fa-user-shield"></i> Moderator Management</h2>
        
        {/* Action buttons for president and vice president only */}
        {canManageModerators && (
          <div className="moderator-actions">
            <button className="btn btn-primary" onClick={openModeratorForm}>
              <i className="fas fa-plus"></i> Add Moderator
            </button>
            <button className="btn btn-info" onClick={openVicePresidentForm}>
              <i className="fas fa-user-tie"></i> Set Vice President
            </button>
            {userRole === 'president' && (
              <button className="btn btn-warning" onClick={openTransferPresidencyForm}>
                <i className="fas fa-crown"></i> Transfer Presidency
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Moderator Form - Only show for president/vice president */}
      {moderatorFormActive && canManageModerators && (
        <div className="moderator-form active">
          <h3 style={{marginBottom: '20px'}}>Add New Moderator</h3>
          
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              id="moderatorEmail"
              value={moderatorFormData.email}
              onChange={handleModeratorInputChange}
              placeholder="Enter user's email address"
            />
            <small className="text-muted">User must already exist in the system</small>
          </div>
          
          <div className="form-actions">
            <button className="btn btn-danger" onClick={closeModeratorForm}>Cancel</button>
            <button className="btn btn-success" onClick={saveModerator}>
              Add Moderator
            </button>
          </div>
        </div>
      )}
      
      {/* Vice President Form - Only show for president/vice president */}
      {vicePresidentFormActive && canManageModerators && (
        <div className="moderator-form active">
          <h3 style={{marginBottom: '20px'}}>Set Vice President</h3>
          
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              value={vicePresidentEmail}
              onChange={(e) => setVicePresidentEmail(e.target.value)}
              placeholder="Enter user's email address"
            />
            <small className="text-muted">User must already exist in the system</small>
          </div>
          
          <div className="form-actions">
            <button className="btn btn-danger" onClick={closeVicePresidentForm}>Cancel</button>
            <button className="btn btn-success" onClick={setVicePresident}>
              Set Vice President
            </button>
          </div>
        </div>
      )}
      
      {/* Transfer Presidency Form - Only show for president */}
      {transferPresidencyFormActive && userRole === 'president' && (
        <div className="moderator-form active">
          <h3 style={{marginBottom: '20px'}}>Transfer Presidency</h3>
          
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              placeholder="Enter email address of the new president"
            />
            <small className="text-muted">This action cannot be undone</small>
          </div>
          
          <div className="form-actions">
            <button className="btn btn-danger" onClick={closeTransferPresidencyForm}>Cancel</button>
            <button className="btn btn-warning" onClick={() => transferPresidency(transferEmail)}>
              Transfer Presidency
            </button>
          </div>
        </div>
      )}
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Last Active</th>
              {canManageModerators && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {moderators.map(moderator => (
              <tr key={moderator.id}>
                <td data-label="Name">{moderator.name}</td>
                <td data-label="Email">{moderator.email}</td>
                <td data-label="Role">
                  <span className={`status-badge ${
                    moderator.role === 'president' ? 'status-approved' : 
                    moderator.role === 'vice_president' ? 'status-pending' : 'status-neutral'
                  }`}>
                    {moderator.role.charAt(0).toUpperCase() + moderator.role.slice(1).replace('_', ' ')}
                  </span>
                </td>
                <td data-label="Last Active">{moderator.last_active}</td>
                <td data-label="Action Buttons">
                  {canManageModerators && moderator.role === 'moderator' && (
                    <div className="action-buttons">
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemoveModerator(moderator.id, moderator.email)}
                      >
                        <i className="fas fa-trash"></i> Remove
                      </button>
                    </div>
                  )}
                 
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {window.innerWidth <= 768 && moderators.length > 5 && (
  <div className="table-controls">
    {moderatorsToShow < moderators.length ? (
      <button 
        className="btn btn-primary load-more-btn"
        onClick={() => showMoreItems('moderators')}
      >
        <i className="fas fa-chevron-down"></i> Load More
      </button>
    ) : (
      <button 
        className="btn btn-secondary show-less-btn"
        onClick={() => showLessItems('moderators')}
      >
        <i className="fas fa-chevron-up"></i> Show Less
      </button>
    )}
  </div>
)}
      </div>
      
      {/* Info message for users who can view but not manage */}
      {canViewModerators && !canManageModerators && (
        <div className="alert alert-info">
          <i className="fas fa-info-circle"></i> You can view moderators but only the president or vice president can manage them.
        </div>
      )}
    </div>
  );
};
  

// Update the renderAuditLog function to show email instead of name
const renderAuditLog = () => (
  <div className="content-section">
    <div className="section-header">
      <h2 className="section-title"><i className="fas fa-history"></i> Audit Log</h2>
      <div>
        <button className="btn btn-primary" onClick={fetchAuditLogs}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
        <button className="btn btn-info" onClick={markAuditLogsAsRead} style={{marginLeft: '10px'}}>
          <i className="fas fa-check-double"></i> Mark All as Read
        </button>
        <button className="btn btn-danger" onClick={clearAuditLogs} style={{marginLeft: '10px'}}>
          <i className="fas fa-trash"></i> Delete All
        </button>
      </div>
    </div>
    
    {/* Loading State */}
    {auditLogsLoading && (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading audit logs...</p>
      </div>
    )}
    
    {/* Error State */}
    {auditLogsError && (
      <div className="error-state">
        <i className="fas fa-exclamation-triangle"></i>
        <p>Error loading audit logs: {auditLogsError}</p>
        <button onClick={fetchAuditLogs}>Try Again</button>
      </div>
    )}
    
    {/* Audit Log Table */}
    {!auditLogsLoading && !auditLogsError && (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>User Email</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.slice(0,window.innerWidth <=768 ? auditLogsToShow : auditLogs.length).map(log => (
              <tr key={log.id}>
                <td data-label="Date">{formatAuditLogDate(log.timestamp)}</td>
                <td data-label="Email">{log.user_email || 'System'}</td>
                <td data-label="Action Done">
                  <span className={`status-badge ${
                    log.action.includes('approv') ? 'status-approved' : 
                    log.action.includes('reject') ? 'status-rejected' : 'status-neutral'
                  }`}>
                    {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </td>
                <td data-label="Details">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
         {window.innerWidth <= 768 && auditLogs.length > 5 && (
          <div className="table-controls">
            {auditLogsToShow < auditLogs.length ? (
              <button 
                className="btn btn-primary load-more-btn"
                onClick={() => showMoreItems('audit')}
              >
                <i className="fas fa-chevron-down"></i> Load More
              </button>
            ) : (
              <button 
                className="btn btn-secondary show-less-btn"
                onClick={() => showLessItems('audit')}
              >
                <i className="fas fa-chevron-up"></i> Show Less
              </button>
            )}
          </div>
        )}
      </div>
    )}
  </div>
);
 const renderLogout = () => (
  <div className="content-section" style={{textAlign: 'center', padding: '40px'}}>
    <i className="fas fa-sign-out-alt" style={{fontSize: '48px', marginBottom: '20px', color: 'var(--accent-color)'}}></i>
    <h2 style={{marginBottom: '15px'}}>Logout</h2>
    <p style={{marginBottom: '25px', color: 'var(--text-muted)'}}>Are you sure you want to logout from the admin panel?</p>
    <button 
      className="btn btn-primary" 
      style={{width: '200px', marginRight: '10px'}}
      onClick={() => setActivePage('dashboard')}
    >
      Cancel
    </button>
    <button 
      className="btn btn-danger" 
      style={{width: '200px'}}
      onClick={handleLogout}
    >
      Logout
    </button>
  </div>
);

  // Helper functions
  const getIconName = (page) => {
    const icons = {
      dashboard: 'home',
      applications: 'users',
      settings: 'cog',
      results: 'chart-bar',
      moderators: 'user-shield',
      audit: 'history',
      vote:'vote-yea',
      logout: 'sign-out-alt',
          };
    return icons[page] || 'circle';
  };

  const getPageName = (page) => {
    const names = {
      dashboard: 'Dashboard',
      applications: 'Candidate Applications',
      settings: 'Election Settings',
      results: 'Results',
      moderators: 'Moderators',
      audit: 'Audit Log',
      vote: 'Voting Dashboard',
      logout: 'Logout'
    };
    return names[page] || page;
  };
  
  // Main render
  return (
    <div className="election-dashboard">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="mobile-logo">
          <button className="menu-toggle" onClick={() => setSidebarActive(!sidebarActive)}>
            <i className="fas fa-bars"></i>
          </button>
          <div className="mobile-logo-text">SOMASE</div>
        </div>
        <div className="mobile-header-actions">
         
<div className="audit-alert" onClick={() => handleNavigation('audit')}>
  <i className="fas fa-bell audit-icon"></i>
  {unreadAuditCount > 0 && <span className="audit-badge">{unreadAuditCount}</span>}
</div>
          <div className="user-info">
            <div className="user-avatar" onClick={() => setUserDropdownMobileActive(!userDropdownMobileActive)}>AU</div>
            <div className={`user-dropdown ${userDropdownMobileActive ? 'active' : ''}`}>
              <div className="user-dropdown-item">
                <i className="fas fa-user"></i>
                <span>Profile</span>
              </div>
              <div className="user-dropdown-item">
                <i className="fas fa-cog"></i>
                <span>Settings</span>
              </div>
              <div className="user-dropdown-item">
                <i className="fas fa-sign-out-alt"></i>
                <span>Logout</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarActive ? 'active' : ''}`} 
        onClick={() => setSidebarActive(false)}
      ></div>
      
      {/* Sidebar */}
      <div className={`sidebar ${sidebarActive ? 'active' : ''}`}>
        <div className="logo-area">
          <img 
                                      src={somaselogo}
                                      alt="SOMASE" 
                                      width="120"
                                      height="120"
                                      loading="eager"
                                  />
          <div className="logo-text">SOMASE Elections</div>
        </div>
        
    
{['dashboard', 'applications', 'settings', 'results', 'moderators', 'audit', 'vote', 'logout'].map(page => (
  <div 
    key={page}
    className={`nav-item ${activePage === page ? 'active' : ''}`}
    onClick={() => {
      if (page === 'vote') {
        
        window.open('/VotingDashboard', '_blank');
      } else {
        handleNavigation(page);
      }
    }}
  >
    <i className={`fas fa-${getIconName(page)}`}></i>
    <span className="nav-text">{getPageName(page)}</span>
  </div>
))}
      </div>
      
      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h1 className="page-title">
            {activePage === 'dashboard' && 'Election Management Dashboard'}
            {activePage === 'applications' && 'Candidate Applications'}
            {activePage === 'settings' && 'Election Settings'}
            {activePage === 'results' && 'Election Results'}
            {activePage === 'moderators' && 'Moderator Management'}
            {activePage === 'audit' && 'Audit Log'}
            {activePage === 'logout' && 'Logout'}
          </h1>
          <div className="header-actions">
            
            <div className="audit-alert" onClick={() => handleNavigation('audit')}>
  <i className="fas fa-bell audit-icon"></i>
  {unreadAuditCount > 0 && <span className="audit-badge">{unreadAuditCount}</span>}
</div>
            <div className="user-info">
              <span>Admin User</span>
              <div className="user-avatar" onClick={() => setUserDropdownActive(!userDropdownActive)}>AU</div>
              <div className={`user-dropdown ${userDropdownActive ? 'active' : ''}`}>
                <div className="user-dropdown-item">
                  <i className="fas fa-user"></i>
                  <span>Profile</span>
                </div>
                <div className="user-dropdown-item">
                  <i className="fas fa-cog"></i>
                  <span>Settings</span>
                </div>
                <div className="user-dropdown-item">
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Logout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading candidate applications...</p>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="error-state">
            <i className="fas fa-exclamation-triangle"></i>
            <p>Error loading candidates: {error}</p>
            <button onClick={fetchCandidates}>Try Again</button>
          </div>
        )}
        
        {/* Dashboard Page */}
        {!loading && !error && activePage === 'dashboard' && (
          <>
            {renderStatsCards()}
            
            {/* Candidate Applications Section */}
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title"><i className="fas fa-users"></i> Candidate Applications</h2>
                <div className="application-status-filters">
                  {['all', 'approved', 'pending', 'rejected'].map(status => (
                    <div 
                      key={status}
                      className={`status-filter ${activeStatusFilter === status ? 'active' : ''}`}
                      onClick={() => setActiveStatusFilter(status)}
                    >
                      {status === 'all' ? 'All Applications' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </div>
                  ))}
                </div>
              </div>
              {renderApplicationTable(filteredCandidates)}
            </div>
            
            {/* Election Settings Section */}
            {renderElectionSettings(false)}
            
            {/* Results Preview Section */}
            {renderResults(false)}
          </>
        )}
        
        {/* Applications Page */}
        {!loading && !error && activePage === 'applications' && (
          <div className="content-section">
            <div className="section-header">
              <h2 className="section-title"><i className="fas fa-users"></i> Candidate Applications</h2>
            </div>
            {(userRole === 'president' || userRole === 'vice_president') && (
      <button 
        className="btn btn-danger"
        onClick={deleteAllCandidates}
        style={{marginLeft: '10px'}}
      >
        <i className="fas fa-trash"></i>Clear all Applications
      </button>
    )}
            <div className="application-status-filters">
              {['all', 'approved', 'pending', 'rejected'].map(status => (
                <div 
                  key={status}
                  className={`status-filter ${activeStatusFilter === status ? 'active' : ''}`}
                  onClick={() => setActiveStatusFilter(status)}
                >
                  {status === 'all' ? 'All Applications' : status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
              ))}
            </div>
            
            {renderApplicationTable(filteredCandidates)}
          </div>
        )}
        
        {/* Settings Page */}
        {activePage === 'settings' && renderElectionSettings(true)}
        
        {/* Results Page */}
        {activePage === 'results' && renderResults(true)}
        
        {/* Moderators Page */}
        {activePage === 'moderators' && renderModerators()}
        
        {/* Audit Log Page */}
        {activePage === 'audit' && renderAuditLog()}
        
        {/* Logout Page */}
        {activePage === 'logout' && renderLogout()}
      </div>
      
      {/* Scroll to top button */}
      <div className={`scroll-to-top ${scrollTopVisible ? 'visible' : ''}`} onClick={scrollToTop}>
        <i className="fas fa-arrow-up"></i>
      </div>
      
      {/* Application Detail Modal */}
      {applicationModalActive && selectedCandidate && (
        <div className="modal-backdrop" onClick={() => setApplicationModalActive(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Candidate Application Details</h3>
              <button className="modal-close" onClick={() => setApplicationModalActive(false)}>&times;</button>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '20px'}}>
              <div style={{width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden'}}>
                <img 
                  src={selectedCandidate.profile_photo || 'https://via.placeholder.com/120x120?text=Candidate'} 
                  alt="Candidate" 
                  style={{width: '100%', height: '100%', objectFit: 'cover'}} 
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/120x120?text=Candidate';
                  }}
                />
              </div>
              
              <div style={{textAlign: 'center'}}>
                <h2>{selectedCandidate.full_name}</h2>
                <p>Applied for: {selectedCandidate.position_display || selectedCandidate.position}</p>
                <p>Applied {formatRelativeTime(selectedCandidate.created_at)}</p>
                <p><span className={`status-badge status-${selectedCandidate.status}`}>
                  {selectedCandidate.status.charAt(0).toUpperCase() + selectedCandidate.status.slice(1)}
                </span></p>
              </div>
            </div>
            
            <div className="form-group">
              <label>Email Address</label>
              <div className="form-control">{selectedCandidate.email || 'Not provided'}</div>
            </div>
            
            <div className="form-group">
              <label>Phone Number</label>
              <div className="form-control">{selectedCandidate.phone || 'Not provided'}</div>
            </div>
            
            <div className="form-group">
              <label>Campaign Slogan</label>
              <div className="form-control">"{selectedCandidate.slogan || 'No slogan provided'}"</div>
            </div>
            
            <div className="form-group">
              <label>Manifesto</label>
              <div className="form-control" style={{height: '100px', overflowY: 'auto'}}>
                {selectedCandidate.manifesto || 'No manifesto provided'}
              </div>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <button 
                className="btn btn-success"
                onClick={() => {
                  updateCandidateStatus(selectedCandidate.id, 'approved');
                  setApplicationModalActive(false);
                }}
              >
                <i className="fas fa-check"></i> Approve Application
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => {
                  updateCandidateStatus(selectedCandidate.id, 'rejected');
                  setApplicationModalActive(false);
                }}
              >
                <i className="fas fa-times"></i> Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectionDashboard;