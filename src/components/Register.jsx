// src/components/Register.js
import React, { useState, useCallback, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet';
import Swal from 'sweetalert2';
import './Register.css';
import somaselogo from '../images/somase-logo.jpeg';
// Import the getCookie function
import { getCookie } from '../utils/csrf';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../config';

// Lazy load components for better performance
const PasswordStrengthMeter = lazy(() => import('./PasswordStrengthMeter'));
const ImageUploadPreview = lazy(() => import('./ImageUploadPreview'));

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        profilePhoto: null
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fileName, setFileName] = useState('No file chosen');
    const [isRegistered, setIsRegistered] = useState(false);

    // Memoize handlers to prevent unnecessary re-renders
    const handleChange = useCallback((e) => {
        const { name, value, files } = e.target;
        if (name === 'profilePhoto') {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
            setFileName(files[0] ? files[0].name : 'No file chosen');
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
            
            // Clear error when user types
            if (errors[name]) {
                setErrors(prev => ({ ...prev, [name]: '' }));
            }
            
            // Clear general errors when user types in any field
            if (errors.general) {
                setErrors(prev => ({ ...prev, general: '' }));
            }
            
            // Password matching validation
            if (name === 'confirmPassword' || name === 'password') {
                const passwordValue = name === 'password' ? value : formData.password;
                const confirmValue = name === 'confirmPassword' ? value : formData.confirmPassword;
                
                if (passwordValue !== confirmValue && confirmValue) {
                    setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
                } else if (errors.confirmPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: '' }));
                }
            }
        }
    }, [errors, formData.password, formData.confirmPassword]);

    const validateForm = useCallback(() => {
        const newErrors = {};
        
        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } 
        
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email address is invalid';
        }
        
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        } 
        
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);


const ensureCSRFToken = useCallback(async () => {
    try {
        // First, try to get the current CSRF token from cookie
        let csrftoken = getCookie('csrftoken');
        
        if (!csrftoken) {
            // If no token exists, make a GET request to get one
            const response = await fetch(`${BASE_URL}/get-csrf/`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                csrftoken = data.csrfToken;
                console.log('New CSRF token obtained:', csrftoken ? 'Success' : 'Failed');
                
                // Also try to get from cookie again
                const cookieToken = getCookie('csrftoken');
                if (cookieToken) {
                    csrftoken = cookieToken;
                }
            } else {
                console.error('Failed to get CSRF token, status:', response.status);
            }
        }
        
        return csrftoken;
    } catch (error) {
        console.error('Error ensuring CSRF token:', error);
        return null;
    }
}, []);

const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({}); // Clear previous errors
    
    try {
        const csrftoken = await ensureCSRFToken();
        
        if (!csrftoken) {
            throw new Error('Unable to get security token. Please refresh the page and try again.');
        }
        
        const data = new FormData();
        data.append('username', formData.username);
        data.append('email', formData.email);
        data.append('password', formData.password);
        data.append('password2', formData.confirmPassword);
        if (formData.profilePhoto) {
            data.append('profile_photo', formData.profilePhoto);
        }
        
        const response = await fetch(`${BASE_URL}/register/`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-CSRFToken': csrftoken,
            },
            body: data,
        });
        
        let responseData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            // If response is not JSON, get text for error message
            const text = await response.text();
            throw new Error(`Server returned unexpected format: ${text.substring(0, 100)}`);
        }
        
        if (response.ok) {
            // Success handling - keep your existing success code
            setIsRegistered(true);
            await Swal.fire({
                title: 'Success!',
                html: 'Registration successful! Please check your MUBAS email to verify your account. You will be automatically logged in after verification.',
                icon: 'success',
                confirmButtonColor: '#0d3e6e',
                confirmButtonText: 'OK',
                timer: 7000,
                timerProgressBar: true
            });
        } else {
            // Error handling - simplified
            let errorMessage = 'Registration failed. Please try again.';
            
            if (responseData.error) {
                errorMessage = responseData.error;
            } else if (responseData.details && Array.isArray(responseData.details)) {
                errorMessage = responseData.details.join(', ');
            } else if (typeof responseData === 'object') {
                // Extract first error message from object
                const firstError = Object.values(responseData)[0];
                if (Array.isArray(firstError)) {
                    errorMessage = firstError[0];
                } else if (typeof firstError === 'string') {
                    errorMessage = firstError;
                }
            }
            
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = error.message || 'An error occurred during registration. Please try again.';
        
        // Specific error messages for common issues
        if (error.message.includes('CSRF') || error.message.includes('token')) {
            errorMessage = 'Security token issue. Please refresh the page and try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        setErrors({ general: errorMessage });
        
        await Swal.fire({
            title: 'Registration Error',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#0d3e6e',
            confirmButtonText: 'OK'
        });
    } finally {
        setIsSubmitting(false);
    }
}, [formData, validateForm]);


    const togglePasswordVisibility = useCallback(() => {
        setShowPassword(prev => !prev);
    }, []);

    const toggleConfirmPasswordVisibility = useCallback(() => {
        setShowConfirmPassword(prev => !prev);
    }, []);

    const getErrorSuggestions = (fieldName) => {
        const suggestions = {
            username: 'Try a different username with at least 3 characters using only letters, numbers, and underscores.',
            email:'',
            password: 'Use at least 6 characters.',
            confirmPassword: 'Make sure both password fields match exactly.',
            profilePhoto: 'Upload a JPEG, PNG, GIF, or WebP image under 5MB in size.',
            general: 'Please check your information and try again. If the problem persists, contact support.'
        };
        
        return errors[fieldName] ? suggestions[fieldName] : suggestions.general;
    };

    // Render success page after registration
    if (isRegistered) {
        return (
            <div className="signup-container">
                <div className="signup-header">
                    <div className="logo">
                        <div className="logo-image">
                            <img 
                                src={somaselogo}
                                alt="SOMASE Logo" 
                                width="100"
                                height="100"
                                style={{border: '3px solid white', boxSizing: 'border-box'}}
                            />
                        </div>
                        <div className="logo-text">
                            <h1 className="logo-tagline">Registration Successful!</h1>
                        </div>
                    </div>
                </div>
                
                <div className="signup-form" style={{textAlign: 'center', padding: '20px'}}>
                    <div style={{marginBottom: '20px'}}>
                        <i className="fas fa-check-circle" style={{fontSize: '48px', color: '#2ecc71'}}></i>
                    </div>
                    
                    <h2 style={{color: 'var(--text-light)', marginBottom: '15px'}}>Check Your Email</h2>
                    
                    <p style={{color: 'var(--text-muted)', marginBottom: '25px', lineHeight: '1.5'}}>
                        We've sent a verification link to your MUBAS email address. 
                        Please check your inbox and click the link to verify your account.
                    </p>
                    
                    <p style={{color: 'var(--text-muted)', marginBottom: '30px', lineHeight: '1.5'}}>
                        <strong>Note:</strong> You must verify your email so that you can log in.
                    </p>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                        <a 
                            href="/login" 
                            className="signup-btn"
                            style={{textDecoration: 'none', textAlign: 'center'}}
                        >
                            Go to back
                        </a>
                        
                        <button 
                            onClick={() => setIsRegistered(false)}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--accent-color)',
                                color: 'var(--accent-color)',
                                padding: '10px',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Register Another Account
                        </button>
                    </div>
                    
                    <div style={{marginTop: '25px', padding: '15px', background: 'rgba(52, 152, 219, 0.1)', borderRadius: '8px'}}>
                        <p style={{color: 'var(--text-muted)', fontSize: '14px', margin: 0}}>
                            <i className="fas fa-info-circle" style={{marginRight: '8px'}}></i>
                            Didn't receive the email? Check your spam folder or contact support.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Render registration form
    return (
        <>
            <Helmet>
                <title>Register - MUBAS SOMASE Voting System</title>
                <meta name="description" content="Create an account to participate in the MUBAS SOMASE voting system. Register to cast your vote securely." />
                <meta name="keywords" content="MUBAS, SOMASE, voting, election, register, account" />
                <meta property="og:title" content="Register - MUBAS SOMASE Voting System" />
                <meta property="og:description" content="Create an account to participate in the MUBAS SOMASE voting system." />
                <meta property="og:type" content="website" />
                <link rel="canonical" href="https://voting.somase.mubas.ac.mw/register" />
            </Helmet>
            
            <div className="signup-container">
                <div className="signup-header">
                    <div className="logo">
                        <div className="logo-image">
                            <img 
                                src={somaselogo}
                                alt="SOMASE Logo - Malawi University of Business and Applied Sciences" 
                                width="100"
                                height="100"
                                loading="eager"
                                style={{border: '3px solid white', boxSizing: 'border-box'}}
                            />
                        </div>
                        <div className="logo-text">
                            <h1 className="logo-tagline">Create Account</h1>
                        </div>
                    </div>
                </div>
                
                <div className="signup-form">
                    {errors.general && (
                        <div className="error-message general-error">
                            <div className="error-header">
                                <i className="fas fa-exclamation-circle"></i>
                                <strong>Registration Error</strong>
                            </div>
                            <p>{errors.general}</p>
                            <div className="error-suggestion">
                                <i className="fas fa-lightbulb"></i>
                                <span>{getErrorSuggestions('general')}</span>
                            </div>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <div className="input-with-icon">
                                <i className="fas fa-user" aria-hidden="true"></i>
                                <input 
                                    type="text" 
                                    id="username" 
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Enter your username eg Mark847" 
                                    className={errors.username ? 'error' : ''}
                                    aria-describedby={errors.username ? 'username-error' : undefined}
                                />
                            </div>
                            {errors.username && (
                                <div id="username-error" className="error-text">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <span>{errors.username}</span>
                                    <div className="error-suggestion">{getErrorSuggestions('username')}</div>
                                </div>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="email">School Email Address</label>
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
                            {errors.email && (
                                <div id="email-error" className="error-text">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <span>{errors.email}</span>
                                    <div className="error-suggestion">{getErrorSuggestions('email')}</div>
                                </div>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-with-icon">
                                <i className="fas fa-lock" aria-hidden="true"></i>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    id="password" 
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a password" 
                                    className={errors.password ? 'error' : ''}
                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                />
                                <span 
                                    className="password-toggle" 
                                    onClick={togglePasswordVisibility}
                                    role="button"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    tabIndex="0"
                                    onKeyPress={(e) => e.key === 'Enter' && togglePasswordVisibility()}
                                >
                                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`} aria-hidden="true"></i>
                                </span>
                            </div>
                            {errors.password && (
                                <div id="password-error" className="error-text">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <span>{errors.password}</span>
                                    <div className="error-suggestion">{getErrorSuggestions('password')}</div>
                                </div>
                            )}
                            
                           
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="input-with-icon">
                                <i className="fas fa-lock" aria-hidden="true"></i>
                                <input 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    id="confirmPassword" 
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm your password" 
                                    className={errors.confirmPassword ? 'error' : ''}
                                    aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                                />
                                <span 
                                    className="password-toggle" 
                                    onClick={toggleConfirmPasswordVisibility}
                                    role="button"
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    tabIndex="0"
                                    onKeyPress={(e) => e.key === 'Enter' && toggleConfirmPasswordVisibility()}
                                >
                                    <i className={`fas fa-${showConfirmPassword ? 'eye-slash' : 'eye'}`} aria-hidden="true"></i>
                                </span>
                            </div>
                            {errors.confirmPassword && (
                                <div id="confirm-password-error" className="error-text">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <span>{errors.confirmPassword}</span>
                                    <div className="error-suggestion">{getErrorSuggestions('confirmPassword')}</div>
                                </div>
                            )}
                        </div>
 
                        
                        <button 
                            type="submit" 
                            className="signup-btn"
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>
                    
                    <div className="login-link">
                        Already have an account? <a href="/login">Login</a>
                    </div>
                    
                    <div className="candidate-registration-link" style={{
                        textAlign: 'center',
                        marginTop: '15px',
                        padding: '10px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <p style={{color: '#aaaaaa', marginBottom: '10px'}}>Want to register as a candidate?</p>
                        <Link to="/CandidateRegistration" style={{
                            display: 'inline-block',
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#3498db',
                            border: '1px solid #3498db',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: '500',
                            transition: 'all 0.3s ease'
                        }} onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#3498db';
                            e.target.style.color = 'white';
                        }} onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#3498db';
                        }}>
                            Candidate Registration
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default React.memo(Register);