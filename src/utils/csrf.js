

/*
export function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
*/

// src/utils/csrf.js
export function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

export async function ensureCSRFToken(BASE_URL) {
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
}