// src/components/PasswordStrengthMeter.js
/*import React, { useMemo } from 'react';

const PasswordStrengthMeter = ({ password }) => {
    const strength = useMemo(() => {
        if (!password) return 0;
        
        let score = 0;
        // Length check
        if (password.length >= 6) score++;
        if (password.length >= 8) score++;
        
        // Complexity checks
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        return score;
    }, [password]);
    
    const getStrengthLabel = useMemo(() => {
        if (!password) return '';
        if (strength <= 2) return 'Weak';
        if (strength <= 4) return 'Medium';
        return 'Strong';
    }, [password, strength]);
    
    if (!password) return null;
    
    return (
        <div className="password-strength-meter">
            <div className={`strength-bar strength-${getStrengthLabel.toLowerCase()}`}></div>
            <div className="strength-label">Password strength: {getStrengthLabel}</div>
        </div>
    );
};

export default React.memo(PasswordStrengthMeter);*/