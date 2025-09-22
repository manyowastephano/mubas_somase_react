// src/components/Login.js
import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import './Login.css';
import { getCookie } from '../utils/csrf';
import somaselogo from '../images/somase-logo.jpeg';
import Swal from 'sweetalert2';
import { BASE_URL } from '../config';
const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    }, [errors]);

    const validateForm = useCallback(() => {
        const newErrors = {};
        
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email address is invalid';
        }
        
        if (!formData.password) {
            newErrors.password = 'Password is required';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleSubmit = useCallback(async (e) => {
        console.log('Making request to:', `${API_BASE_URL}/login/`);
console.log('Environment variables:', {
    REACT_APP_BASE_URL: process.env.REACT_APP_BASE_URL,
    REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL
});
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        setErrors({});
        
        try {
            const csrftoken = getCookie('csrftoken');
            
            const response = await fetch(`${BASE_URL}/login/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                }),
            });
            
            let responseData;
            try {
                responseData = await response.json();
            } catch (jsonError) {
                throw new Error('Server returned an invalid response. Please try again later.');
            }
            
            if (response.ok) {
                // Store basic user data in localStorage
                localStorage.setItem('user', JSON.stringify(responseData));
                
                // Fetch user details including role
                const userDetailsResponse = await fetch(`${BASE_URL}/api/auth/check/`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                
                if (userDetailsResponse.ok) {
                    const userDetails = await userDetailsResponse.json();
                    
                    // Update localStorage with complete user data including role
                    localStorage.setItem('user', JSON.stringify({
                        ...responseData,
                        role: userDetails.role
                    }));
                    
                    // Show success alert with SweetAlert2
                    await Swal.fire({
                        icon: 'success',
                        title: 'Login Successful!',
                        text: 'Redirecting to dashboard...',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    
                    // Check user role and redirect accordingly
                    if (userDetails.role === 'voter') {
                        navigate('/VotingDashboard');
                    } else if (['moderator', 'president', 'vice_president'].includes(userDetails.role)) {
                        navigate('/ElectionDashboard');
                    } else {
                        // Default redirect for unknown roles
                        navigate('/VotingDashboard');
                    }
                } else {
                    throw new Error('Failed to fetch user details');
                }
            } else {
                let newErrors = {};
                
                if (response.status >= 500) {
                    newErrors.general = 'Server error. Please try again later.';
                } else if (response.status === 400) {
                    newErrors.general = 'Invalid request. Please check your input.';
                } else if (response.status === 401) {
                    if (responseData.error) {
                        newErrors.general = 'Incorrect email or password.';
                    } else {
                        newErrors.general = 'Invalid email or password.';
                    }
                } else if (response.status === 403) {
                    newErrors.general = 'Security error. Please refresh the page and try again.';
                } else {
                    newErrors.general = 'An unexpected error occurred. Please try again.';
                }
                
                setErrors(newErrors);
                
                // Show error alert with SweetAlert2
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: newErrors.general || 'Please check your credentials and try again.',
                });
            }
        } catch (error) {
            let errorMessage = 'An error occurred during login. Please try again.';
            
            if (error.message === 'Failed to fetch') {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else {
                errorMessage = error.message || errorMessage;
            }
            
            setErrors({ general: errorMessage });
            
            // Show error alert with SweetAlert2
            Swal.fire({
                icon: 'error',
                title: 'Login Error',
                text: errorMessage,
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, validateForm, navigate]);

    return (
        <>
            <Helmet>
                <title>Login - MUBAS SOMASE Voting System</title>
                <meta name="description" content="Login to your MUBAS SOMASE voting system account to participate in elections and manage your profile." />
                <meta name="keywords" content="MUBAS, SOMASE, voting, election, login, account" />
                <meta property="og:title" content="Login - MUBAS SOMASE Voting System" />
                <meta property="og:description" content="Login to your MUBAS SOMASE voting system account." />
                <meta property="og:type" content="website" />
                <link rel="canonical" href="https://voting.somase.mubas.ac.mw/login" />
            </Helmet>
            
            <div className="login-container">
                <div className="login-header">
                    <div className="logo-fish">
                        <img 
                            src={somaselogo}
                            alt="SOMASE" 
                            width="120"
                            height="120"
                            loading="eager"
                        />
                    </div>
                    <div className="logo-tagline">Society Of Mathematical Science Students</div>
                </div>
                
                <div className="login-form">
                    {errors.general && <div className="error-message">{errors.general}</div>}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <div className="input-with-icon">
                                <i className="fas fa-envelope" aria-hidden="true"></i>
                                <input 
                                    type="email" 
                                    id="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email address" 
                                    className={errors.email ? 'error' : ''}
                                    aria-describedby={errors.email ? 'email-error' : undefined}
                                />
                            </div>
                            {errors.email && <div id="email-error" className="error-text">{errors.email}</div>}
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-with-icon">
                                <i className="fas fa-lock" aria-hidden="true"></i>
                                <input 
                                    type="password" 
                                    id="password" 
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password" 
                                    className={errors.password ? 'error' : ''}
                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                />
                            </div>
                            {errors.password && <div id="password-error" className="error-text">{errors.password}</div>}
                        </div>
                        
                        <button 
                            type="submit" 
                            className="login-btn"
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                        >
                            {isSubmitting ? 'Logging in...' : 'Login to Account'}
                        </button>
                        
                        <Link to="/forgot-password" className="forgot-password">
                            Forgot password?
                        </Link>
                    </form>
                    
                    <div className="divider"></div> 
                    
                    <div className="signup-link">
                        Don't have an account? <Link to="/register">Register</Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default React.memo(Login);