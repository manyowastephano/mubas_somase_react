// src/components/ActivationHandler.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../config'; // 🚨 FIX: Use API_BASE_URL

const ActivationHandler = () => {
    const { uidb64, token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        const activateAccount = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/activate/${uidb64}/${token}/`, {
                    method: 'GET',
                    credentials: 'include',
                });

                // Note: Django might return HTML instead of JSON for this view, 
                // so we handle both cases gracefully
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const data = await response.json();
                    if (response.ok && data.success) {
                        setStatus('success');
                        await Swal.fire({
                            title: 'Email Verified!',
                            text: data.message || 'Your email has been verified successfully.',
                            icon: 'success',
                            confirmButtonColor: '#0d3e6e',
                        });
                        window.location.href = data.redirect_url || '/login';
                    } else {
                        throw new Error(data.message || 'Invalid verification link');
                    }
                } else {
                    // Django returned HTML (Success or Failure page)
                    if (response.ok) {
                        setStatus('success');
                        // Since it's HTML, we can't easily parse the message, just redirect
                        window.location.href = '/login';
                    } else {
                        throw new Error('Verification failed');
                    }
                }
            } catch (error) {
                setStatus('error');
                await Swal.fire({
                    title: 'Verification Error',
                    text: error.message || 'An error occurred during verification.',
                    icon: 'error',
                    confirmButtonColor: '#0d3e6e',
                });
                navigate('/login');
            }
        };

        activateAccount();
    }, [uidb64, token, navigate]);

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #0d3e6e 0%, #1e4a76 100%)',
            color: 'white'
        }}>
            {status === 'loading' && (
                <>
                    <div className="spinner-border text-light" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3" style={{ fontSize: '1.2rem' }}>Verifying your email...</p>
                </>
            )}
            {status === 'success' && (
                <>
                    <div className="spinner-border text-success" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Success</span>
                    </div>
                    <p className="mt-3" style={{ fontSize: '1.2rem' }}>Email verified! Redirecting...</p>
                </>
            )}
            {status === 'error' && (
                <>
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: '#ff6b6b' }}></i>
                    <p className="mt-3" style={{ fontSize: '1.2rem' }}>Verification failed. Redirecting...</p>
                </>
            )}
        </div>
    );
};

export default ActivationHandler;