import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { getCookie } from '../utils/csrf';
import { Link } from 'react-router-dom';
import somaselogo from '../images/somase-logo.jpeg';
import Swal from 'sweetalert2';
import { BASE_URL } from '../config';

const CandidateRegistration = () => {
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        position: '',
        phone: '',
        slogan: '',
        manifesto: '',
        profilePhoto: null
    });
    const [fileName, setFileName] = useState('No file chosen');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [hasApplied, setHasApplied] = useState(false);
    const [existingApplication, setExistingApplication] = useState(null);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    }, [errors]);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, profilePhoto: file }));
            setFileName(file.name);
            
            // Validate file type and size
            const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validImageTypes.includes(file.type)) {
                setErrors(prev => ({ ...prev, profilePhoto: 'Please upload a valid image (JPG, PNG, or GIF)' }));
                // Show SweetAlert for invalid file type
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid File Type',
                    text: 'Please upload a valid image (JPG, PNG, or GIF)',
                    confirmButtonColor: '#0d3e6e',
                });
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, profilePhoto: 'Image size must be less than 5MB' }));
                // Show SweetAlert for file size too large
                Swal.fire({
                    icon: 'error',
                    title: 'File Too Large',
                    text: 'Image size must be less than 5MB',
                    confirmButtonColor: '#0d3e6e',
                });
                return;
            }
            
            // Clear error if valid
            if (errors.profilePhoto) {
                setErrors(prev => ({ ...prev, profilePhoto: '' }));
            }
        }
    }, [errors.profilePhoto]);

    const validateForm = useCallback(() => {
        const newErrors = {};
        
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        
        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        }
        
        if (!formData.position) {
            newErrors.position = 'Please select a position';
        }
        
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^\+?[\d\s\-()]{10,}$/.test(formData.phone)) {
            newErrors.phone = 'Please enter a valid phone number';
        }
        
        if (!formData.slogan.trim()) {
            newErrors.slogan = 'Campaign slogan is required';
        } else if (formData.slogan.length > 50) {
            newErrors.slogan = 'Slogan must be 50 characters or less';
        }
        
        if (!formData.manifesto.trim()) {
            newErrors.manifesto = 'Manifesto is required';
        } else {
            const wordCount = formData.manifesto.trim().split(/\s+/).length;
            if (wordCount > 200) {
                newErrors.manifesto = 'Manifesto must be 200 words or less';
            }
        }
        
        if (!formData.profilePhoto) {
            newErrors.profilePhoto = 'Profile photo is required';
        }
        
        setErrors(newErrors);
        
        // Show SweetAlert for validation errors
        if (Object.keys(newErrors).length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Form Validation Error',
                text: 'Please fix the errors in the form before submitting.',
                confirmButtonColor: '#0d3e6e',
            });
        }
        
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
                console.log('New CSRF token obtained for candidate registration:', csrftoken ? 'Success' : 'Failed');
                
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
    
    try {
        const csrftoken = await ensureCSRFToken();
        
        if (!csrftoken) {
            throw new Error('Unable to get security token. Please refresh the page and try again.');
        }
        
        const submissionData = new FormData();
        submissionData.append('email', formData.email);
        submissionData.append('full_name', formData.fullName);
        submissionData.append('position', formData.position);
        submissionData.append('phone', formData.phone);
        submissionData.append('slogan', formData.slogan);
        submissionData.append('manifesto', formData.manifesto);
        
        if (formData.profilePhoto) {
            submissionData.append('profile_photo', formData.profilePhoto);
        }
        
        const response = await fetch(`${BASE_URL}/candidate/register/`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-CSRFToken': csrftoken,
            },
            body: submissionData,
        });
        
        let responseData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Server returned unexpected format: ${text.substring(0, 100)}`);
        }
        
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Application Submitted!',
                text: 'Your candidacy will be reviewed by the election committee.',
                confirmButtonColor: '#0d3e6e',
            });
            
            setHasApplied(true);
            
            setFormData({
                email: '',
                fullName: '',
                position: '',
                phone: '',
                slogan: '',
                manifesto: '',
                profilePhoto: null
            });
            setFileName('No file chosen');
        } else {
            let errorMessage = 'Registration failed. Please try again.';
            
            if (responseData.error) {
                errorMessage = responseData.error;
            } else if (responseData.details && Array.isArray(responseData.details)) {
                errorMessage = responseData.details.join(', ');
            } else if (typeof responseData === 'object') {
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
        
        if (error.message.includes('CSRF') || error.message.includes('token')) {
            errorMessage = 'Security token issue. Please refresh the page and try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('already applied')) {
            setHasApplied(true);
            errorMessage = 'You have already applied for a position.';
        } else if (error.message.includes('not registered')) {
            errorMessage = 'This email is not registered in our system. Please register first before applying.';
        }
        
        // Show error with SweetAlert2
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            confirmButtonColor: '#0d3e6e',
        });
        
        // Try to get existing application if it's an "already applied" error
        if (error.message.includes('already applied')) {
            try {
                const csrftoken = await ensureCSRFToken();
                const checkResponse = await fetch(`${BASE_URL}/api/candidates/check-application/?email=${encodeURIComponent(formData.email)}`, {
                    method: 'GET',
                    headers: {
                        'X-CSRFToken': csrftoken,
                    },
                });
                
                if (checkResponse.ok) {
                    const applicationData = await checkResponse.json();
                    setExistingApplication(applicationData);
                }
            } catch (err) {
                console.error('Error fetching application details:', err);
            }
        }
    } finally {
        setIsSubmitting(false);
    }
}, [formData, validateForm]);

    // If user has already applied, show message instead of form
    if (hasApplied) {
        return (
            <div style={styles.registrationWrapper}>
                <div style={styles.registrationContainer}>
                    <div style={styles.registrationHeader}>
                        <div style={styles.logo}>
                            <img 
                                src={somaselogo} 
                                alt="SOMASE Logo - Malawi University of Business and Applied Sciences" 
                                style={styles.logoImage}
                            />
                        </div>
                        <div style={styles.headerText}>
                            <h1 style={styles.headerTitle}>Application Status</h1>
                            <p style={styles.headerSubtitle}>Your candidate application status</p>
                        </div>
                    </div>
                    
                    <div style={styles.messageContainer}>
                        <div style={styles.successIcon}>
                            <i className="fas fa-check-circle"></i>
                        </div>
                        <h2 style={styles.successMessage}>Application Received</h2>
                        <p style={styles.successDetails}>
                            {existingApplication 
                                ? 'You have already submitted a candidate application. Your application is currently under review by the election committee.'
                                : 'You have already applied for a position with this email address.'
                            }
                        </p>
                        
                        {existingApplication && (
                            <div style={styles.applicationDetails}>
                                <h3>Application Details:</h3>
                                <p><strong>Email:</strong> {formData.email}</p>
                                <p><strong>Position:</strong> {existingApplication.position_display}</p>
                                <p><strong>Status:</strong> 
                                    <span style={ 
                                        existingApplication.status === 'approved' ? styles.statusApproved :
                                        existingApplication.status === 'rejected' ? styles.statusRejected :
                                        styles.statusPending
                                    }>
                                        {existingApplication.status.charAt(0).toUpperCase() + existingApplication.status.slice(1)}
                                    </span>
                                </p>
                                <p><strong>Submitted on:</strong> {new Date(existingApplication.applied_on).toLocaleDateString()}</p>
                            </div>
                        )}
                        
                        <div style={styles.buttonGroup}>
                            <Link to="/" style={styles.homeLink}>
                                <i className="fas fa-home"></i> Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Candidate Registration - SOMASE Elections</title>
                <meta name="description" content="Register as a candidate for the SOMASE elections. Submit your application to run for various positions." />
                <meta name="keywords" content="SOMASE, elections, candidate registration, voting, Malawi University" />
                <meta property="og:title" content="Candidate Registration - SOMASE Elections" />
                <meta property="og:description" content="Register as a candidate for the SOMASE elections." />
                <meta property="og:type" content="website" />
                <link rel="canonical" href="https://elections.somase.mubas.ac.mw/candidate-registration" />
            </Helmet>

            <div style={styles.registrationWrapper}>
                <div style={styles.registrationContainer}>
                    <div style={styles.registrationHeader}>
                        <div style={styles.logo}>
                            <img 
                                src={somaselogo} 
                                alt="SOMASE Logo - Malawi University of Business and Applied Sciences" 
                                style={styles.logoImage}
                            />
                        </div>
                        <div style={styles.headerText}>
                            <h1 style={styles.headerTitle}>Candidate Registration</h1>
                            <p style={styles.headerSubtitle}>Apply to run in the SOMASE Elections</p>
                        </div>
                    </div>
                    
                    <div style={styles.registrationForm}>
                        <form onSubmit={handleSubmit} noValidate>
                            <div style={styles.formGroup}>
                                <label htmlFor="email" style={styles.label}>Email Address</label>
                                <div style={styles.inputWithIcon}>
                                    <i className="fas fa-envelope" aria-hidden="true" style={styles.inputIcon}></i>
                                    <input 
                                        type="email" 
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Enter your email address" 
                                        style={{...styles.input, ...(errors.email ? styles.inputError : {})}}
                                        aria-describedby={errors.email ? 'email-error' : undefined}
                                    />
                                </div>
                                {errors.email && (
                                    <div id="email-error" style={styles.errorText}>
                                        <i className="fas fa-exclamation-triangle" style={styles.errorIcon}></i>
                                        <span>{errors.email}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label htmlFor="fullName" style={styles.label}>Full Name</label>
                                <div style={styles.inputWithIcon}>
                                    <i className="fas fa-user" aria-hidden="true" style={styles.inputIcon}></i>
                                    <input 
                                        type="text" 
                                        id="fullName"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name" 
                                        style={{...styles.input, ...(errors.fullName ? styles.inputError : {})}}
                                        aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                                    />
                                </div>
                                {errors.fullName && (
                                    <div id="fullName-error" style={styles.errorText}>
                                        <i className="fas fa-exclamation-triangle" style={styles.errorIcon}></i>
                                        <span>{errors.fullName}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label htmlFor="position" style={styles.label}>Position</label>
                                <div style={styles.inputWithIcon}>
                                    <i className="fas fa-briefcase" aria-hidden="true" style={styles.inputIcon}></i>
                                    <select 
                                        id="position"
                                        name="position"
                                        value={formData.position}
                                        onChange={handleInputChange}
                                        style={{...styles.input, ...(errors.position ? styles.inputError : {})}}
                                        aria-describedby={errors.position ? 'position-error' : undefined}
                                    >
                                        <option value="">Select a position</option>
                                        <option value="president">President</option>
                                        <option value="vice-president">Vice President</option>
                                        <option value="general-secretary">General Secretary</option>
                                        <option value="organising-secretary">Organising Secretary</option>
                                        <option value="publicity-secretary">Public Secretary</option>
                                        <option value="treasurer">Treasurer</option>
                                        <option value="entertainment-director">Entertainment Director</option>
                                        <option value="sports-director">Sports Director</option>
                                        <option value="society-member">Society Member</option>
                                    </select>
                                </div>
                                {errors.position && (
                                    <div id="position-error" style={styles.errorText}>
                                        <i className="fas fa-exclamation-triangle" style={styles.errorIcon}></i>
                                        <span>{errors.position}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label htmlFor="phone" style={styles.label}>Phone Number</label>
                                <div style={styles.inputWithIcon}>
                                    <i className="fas fa-phone" aria-hidden="true" style={styles.inputIcon}></i>
                                    <input 
                                        type="tel" 
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="Enter your phone number" 
                                        style={{...styles.input, ...(errors.phone ? styles.inputError : {})}}
                                        aria-describedby={errors.phone ? 'phone-error' : undefined}
                                    />
                                </div>
                                {errors.phone && (
                                    <div id="phone-error" style={styles.errorText}>
                                        <i className="fas fa-exclamation-triangle" style={styles.errorIcon}></i>
                                        <span>{errors.phone}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label htmlFor="slogan" style={styles.label}>Campaign Slogan</label>
                                <div style={styles.inputWithIcon}>
                                    <i className="fas fa-quote-left" aria-hidden="true" style={styles.inputIcon}></i>
                                    <input 
                                        type="text" 
                                        id="slogan"
                                        name="slogan"
                                        value={formData.slogan}
                                        onChange={handleInputChange}
                                        placeholder="Enter your campaign slogan" 
                                        style={{...styles.input, ...(errors.slogan ? styles.inputError : {})}}
                                        aria-describedby={errors.slogan ? 'slogan-error' : undefined}
                                        maxLength={50}
                                    />
                                </div>
                                <p style={styles.formNote}>
                                    {formData.slogan.length}/50 characters • Keep it short and memorable
                                </p>
                                {errors.slogan && (
                                    <div id="slogan-error" style={styles.errorText}>
                                        <i className="fas fa-exclamation-triangle" style={styles.errorIcon}></i>
                                        <span>{errors.slogan}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label htmlFor="manifesto" style={styles.label}>Manifesto</label>
                                <div style={styles.inputWithIcon}>
                                    <i className="fas fa-file-alt" aria-hidden="true" style={styles.inputIcon}></i>
                                    <textarea 
                                        id="manifesto"
                                        name="manifesto"
                                        value={formData.manifesto}
                                        onChange={handleInputChange}
                                        placeholder="Describe your goals and plans if elected (200 words max)" 
                                        style={{...styles.textarea, ...(errors.manifesto ? styles.inputError : {})}}
                                        aria-describedby={errors.manifesto ? 'manifesto-error' : undefined}
                                        rows={5}
                                    />
                                </div>
                                <p style={styles.formNote}>
                                    {formData.manifesto.trim() ? formData.manifesto.trim().split(/\s+/).length : 0}/200 words
                                </p>
                                {errors.manifesto && (
                                    <div id="manifesto-error" style={styles.errorText}>
                                        <i className="fas fa-exclamation-triangle" style={styles.errorIcon}></i>
                                        <span>{errors.manifesto}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div style={styles.fileUpload}>
                                <label htmlFor="profilePhoto" style={styles.fileUploadLabel}>
                                    <i className="fas fa-cloud-upload-alt" style={styles.uploadIcon}></i>
                                    <span>Upload your Photo</span>
                                </label>
                                <input 
                                    type="file" 
                                    id="profilePhoto"
                                    style={styles.fileUploadInput}
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    aria-describedby={errors.profilePhoto ? 'profilePhoto-error' : undefined}
                                />
                                <span style={styles.fileName}>{fileName}</span>
                                <p style={styles.formNote}>High-quality headshot recommended (JPG or PNG, max 5MB)</p>
                                {errors.profilePhoto && (
                                    <div id="profilePhoto-error" style={styles.errorText}>
                                        <i className="fas fa-exclamation-triangle" style={styles.errorIcon}></i>
                                        <span>{errors.profilePhoto}</span>
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                type="submit" 
                                style={isSubmitting ? {...styles.submitBtn, ...styles.submitBtnDisabled} : styles.submitBtn}
                                disabled={isSubmitting}
                                aria-busy={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin" aria-hidden="true" style={styles.spinnerIcon}></i>
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Application'
                                )}
                            </button>
                        </form>
                        
                        <div style={styles.loginLink}>
                             <Link to="/login" style={styles.loginLinkAnchor}>Go back</Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// All styles as JavaScript objects
const styles = {
    registrationWrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a2530, #0f1720)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        color: '#ffffff',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    },
    registrationContainer: {
        backgroundColor: '#0f1720',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        width: '100%',
        maxWidth: '500px',
        overflow: 'hidden',
        padding: '10px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    registrationHeader: {
        padding: '20px 20px 10px',
        textAlign: 'center'
    },
    logo: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '15px'
    },
    logoImage: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '3px solid white',
        boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)'
    },
    headerText: {
        marginTop: '10px'
    },
    headerTitle: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: '5px'
    },
    headerSubtitle: {
        fontSize: '14px',
        color: '#aaaaaa'
    },
    registrationForm: {
        padding: '20px 30px 30px'
    },
    formGroup: {
        marginBottom: '20px',
        position: 'relative'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '500',
        color: '#ffffff',
        fontSize: '14px'
    },
    inputWithIcon: {
        position: 'relative'
    },
    inputIcon: {
        position: 'absolute',
        left: '15px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#0d3e6e',
        zIndex: '2'
    },
    input: {
        width: '100%',
        padding: '14px 14px 14px 45px',
        backgroundColor: '#1e293b',
        border: '1px solid ',
        borderColor: '#2d3748',
        borderRadius: '8px',
        fontSize: '15px',
        transition: 'all 0.3s ease',
        color: '#ffffff'
    },
    textarea: {
        width: '100%',
        padding: '14px 14px 14px 45px',
        backgroundColor: '#1e293b',
        border: '1px solid #2d3748',
        borderRadius: '8px',
        fontSize: '15px',
        transition: 'all 0.3s ease',
        color: '#ffffff',
        minHeight: '100px',
        resize: 'vertical'
    },
    inputError: {
        borderColor: '#e74c3c'
    },
    formNote: {
        fontSize: '13px',
        color: '#aaaaaa',
        marginTop: '5px',
        fontStyle: 'italic'
    },
    fileUpload: {
        position: 'relative',
        marginBottom: '20px'
    },
    fileUploadLabel: {
        display: 'block',
        padding: '14px 20px',
        background: '#1e293b',
        border: '2px dashed #2d3748',
        borderRadius: '8px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        color: '#aaaaaa'
    },
    uploadIcon: {
        marginRight: '8px',
        color: '#3498db'
    },
    fileUploadInput: {
        position: 'absolute',
        left: '0',
        top: '0',
        opacity: '0',
        width: '100%',
        height: '100%',
        cursor: 'pointer'
    },
    fileName: {
        display: 'block',
        marginTop: '8px',
        fontSize: '13px',
        color: '#aaaaaa',
        textAlign: 'center'
    },
    submitBtn: {
        width: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg, #0d3e6e, #1e4a76)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        marginTop: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    submitBtnDisabled: {
        opacity: '0.7',
        cursor: 'not-allowed'
    },
    spinnerIcon: {
        marginRight: '8px'
    },
    loginLink: {
        textAlign: 'center',
        fontSize: '14px',
        color: '#aaaaaa',
        marginTop: '20px'
    },
    loginLinkAnchor: {
        color: '#3498db',
        textDecoration: 'none',
        fontWeight: '500',
        transition: 'color 0.3s ease'
    },
    errorText: {
        color: '#e74c3c',
        fontSize: '0.85em',
        marginTop: '5px',
        display: 'flex',
        alignItems: 'center'
    },
    errorIcon: {
        marginRight: '5px'
    },
    loadingContainer: {
        padding: '40px',
        textAlign: 'center'
    },
    loadingSpinner: {
        fontSize: '40px',
        color: '#3498db',
        marginBottom: '20px'
    },
    messageContainer: {
        padding: '40px 30px',
        textAlign: 'center'
    },
    successIcon: {
        fontSize: '60px',
        color: '#28a745',
        marginBottom: '20px'
    },
    successMessage: {
        fontSize: '24px',
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: '15px'
    },
    successDetails: {
        fontSize: '16px',
        color: '#aaaaaa',
        marginBottom: '30px',
        lineHeight: '1.5'
    },
    applicationDetails: {
        backgroundColor: '#1e293b',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        textAlign: 'left'
    },
    statusApproved: {
        color: '#28a745',
        fontWeight: 'bold',
        marginLeft: '8px'
    },
    statusRejected: {
        color: '#dc3545',
        fontWeight: 'bold',
        marginLeft: '8px'
    },
    statusPending: {
        color: '#ffc107',
        fontWeight: 'bold',
        marginLeft: '8px'
    },
    buttonGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        alignItems: 'center'
    },
    homeLink: {
        padding: '12px 24px',
        backgroundColor: '#1e293b',
        color: 'white',
        border: '1px solid #2d3748',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        textDecoration: 'none',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    }
};

export default CandidateRegistration;