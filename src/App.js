import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
//import LoadingSpinner from './components/LoadingSpinner';
import './App.css';

// Lazy load all components
const Login = lazy(() => import('./components/Login'));
const Register = lazy(() => import('./components/Register'));
const ElectionsDashboard = lazy(() => import('./components/ElectionsDashboard'));
const CandidateRegistration = lazy(() => import('./components/CandidateRegistration'));
const MUBASVotingDashboard = lazy(() => import('./components/MUBASVotingDashboard'));
const EditCandidateApplication = lazy(() => import('./components/EditCandidateApplication'));
const ActivationHandler = lazy(() => import('./components/ActivationHandler'));

function App() {
    return (
        <Router>
            <div className="App">
                <Suspense fallback={
                    <div className="full-page-loading">
                        
                    </div>
                }>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/VotingDashboard" element={<MUBASVotingDashboard />} />
                        <Route path="/activate/:uidb64/:token" element={<ActivationHandler />} />
                        <Route path="/ElectionDashboard" element={<ElectionsDashboard />} />
                        <Route path="/CandidateRegistration" element={<CandidateRegistration />} />
                        <Route path="/candidate-application/edit/:id" element={<EditCandidateApplication />} />
                        <Route path="/" element={<Login />} />
                    </Routes>
                </Suspense>
            </div>
        </Router>
    );
}

export default App;