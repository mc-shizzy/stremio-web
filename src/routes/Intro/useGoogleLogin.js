const React = require('react');

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const getGoogleClientId = () => {
    if (typeof process !== 'undefined' && process.env && typeof process.env.GOOGLE_CLIENT_ID === 'string' && process.env.GOOGLE_CLIENT_ID.length > 0) {
        return process.env.GOOGLE_CLIENT_ID;
    }
    if (typeof window !== 'undefined' && typeof window.GOOGLE_CLIENT_ID === 'string' && window.GOOGLE_CLIENT_ID.length > 0) {
        return window.GOOGLE_CLIENT_ID;
    }
    return '';
};

const loadGoogleScript = () => new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
        reject(new Error('Google sign in is not available.'));
        return;
    }
    if (window.google?.accounts?.id) {
        resolve(window.google);
        return;
    }

    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
        existing.addEventListener('load', () => resolve(window.google), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Google script.')), { once: true });
        return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google script.'));
    document.head.appendChild(script);
});

const useGoogleLogin = () => {
    const start = React.useCallback(async () => {
        const clientId = getGoogleClientId();
        if (!clientId) {
            throw new Error('Google login is not configured. Missing GOOGLE_CLIENT_ID.');
        }

        const google = await loadGoogleScript();
        if (!google?.accounts?.id) {
            throw new Error('Google login is unavailable right now.');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Google authentication timed out.'));
            }, 60000);

            google.accounts.id.initialize({
                client_id: clientId,
                callback: (response) => {
                    clearTimeout(timeout);
                    if (!response?.credential) {
                        reject(new Error('Google authentication failed.'));
                        return;
                    }
                    resolve({ idToken: response.credential });
                },
                ux_mode: 'popup',
                auto_select: false
            });

            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    clearTimeout(timeout);
                    reject(new Error('Google login popup could not be displayed.'));
                }
            });
        });
    }, []);

    return [start];
};

module.exports = useGoogleLogin;
