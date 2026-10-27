// src/components/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import './Login.css';
import somaselogo from '../images/somase-logo.jpeg';
import Swal from 'sweetalert2';
import { auth, googleProvider } from '../firebase'; 
import { signInWithPopup } from 'firebase/auth';
import { API_BASE_URL } from '../config';

const Login = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setIsSubmitting(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const token = await user.getIdToken();

            const response = await fetch(`${API_BASE_URL}/api/firebase-login/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("Backend returned HTML instead of JSON:", text);
                throw new Error(`Server Error (${response.status}): Check Django terminal.`);
            }

            if (response.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                
                await Swal.fire({
                    icon: 'success',
                    title: 'Login Successful!',
                    text: 'Redirecting to dashboard...',
                    timer: 2000,
                    showConfirmButton: false
                });

                if (data.user.role === 'voter') {
                    navigate('/VotingDashboard');
                } else {
                    navigate('/ElectionDashboard');
                }
            } else {
                throw new Error(data.detail || 'Access Denied');
            }

        } catch (error) {
            console.error("Login error:", error);
            let errorMsg = error.message;
            if (error.code === 'auth/popup-closed-by-user') {
                errorMsg = 'Login cancelled.';
            }
            Swal.fire({ icon: 'error', title: 'Access Denied', text: errorMsg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Helmet>
                <title>Login - MUBAS SOMASE Voting System</title>
            </Helmet>
            
            <div className="login-container">
                <div className="login-header">
                    <div className="logo-fish">
                        <img src={somaselogo} alt="SOMASE" width="120" height="120" loading="eager" />
                    </div>
                    <div className="logo-tagline">Society Of Mathematical Science Students</div>
                </div>
                
                <div className="login-form" style={{ textAlign: 'center', padding: '20px' }}>
                    <h3 style={{ color: 'white', marginBottom: '20px' }}>
                        Sign in to Vote
                    </h3>
                    <p style={{ color: '#aaa', marginBottom: '30px', fontSize: '14px' }}>
                        Only verified MUBAS Mathematical Sciences students are allowed.
                    </p>
                    
                    <button 
                        onClick={handleGoogleLogin} 
                        disabled={isSubmitting}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '10px',
                            backgroundColor: '#ffffff', // White background
                            color: '#333333',           // Dark text
                            fontWeight: '600',
                            border: '1px solid #cccccc', // Light gray border
                            borderRadius: '6px',
                            padding: '12px 24px',
                            width: '100%',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            transition: 'background-color 0.2s ease',
                            marginTop: '10px'
                        }}
                        onMouseOver={(e) => {
                            if (!isSubmitting) e.target.style.backgroundColor = '#f8f9fa'; // Light gray on hover
                        }}
                        onMouseOut={(e) => {
                            if (!isSubmitting) e.target.style.backgroundColor = '#ffffff'; // Back to white
                        }}
                    >
                        {isSubmitting ? 'Signing in...' : (
                            <>
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="22" />
                                Sign in with school email
                            </>
                        )}
                    </button>
                    
                    {/* CANDIDATE REGISTRATION LINK SECTION */}
                    <div className="candidate-registration-link" style={{
                        textAlign: 'center',
                        marginTop: '30px',
                        padding: '15px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <p style={{color: '#aaaaaa', marginBottom: '10px', fontSize: '14px'}}>
                            Want to run for a position?
                        </p>
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
                            Register as a Candidate
                        </Link>
                        
                    </div>
                </div>
            </div>
        </>
    );
};

export default React.memo(Login);