const AUTH_TOKEN_KEY = 'customAuthToken';
const AUTH_USER_KEY = 'customAuthUser';

const getApiBaseUrl = () => {
    if (typeof process !== 'undefined' && process.env && typeof process.env.AUTH_API_BASE_URL === 'string' && process.env.AUTH_API_BASE_URL.length > 0) {
        return process.env.AUTH_API_BASE_URL;
    }
    return '';
};

const getAuthUrl = (path) => `${getApiBaseUrl()}/api/auth${path}`;

const saveAuthSession = ({ token, user }) => {
    if (typeof localStorage === 'undefined') {
        return;
    }
    if (typeof token === 'string' && token.length > 0) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
    if (user && typeof user === 'object') {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    }
};

const clearAuthSession = () => {
    if (typeof localStorage === 'undefined') {
        return;
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
};

const getAuthToken = () => {
    if (typeof localStorage === 'undefined') {
        return '';
    }
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
};

const requestJson = async (url, options) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(typeof payload?.message === 'string' ? payload.message : 'Request failed');
    }
    return payload;
};

const loginWithCredentials = async ({ email, password }) => {
    const payload = await requestJson(getAuthUrl('/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    saveAuthSession({ token: payload.token, user: payload.user });
    return payload;
};

const registerWithCredentials = async ({ email, password }) => {
    const payload = await requestJson(getAuthUrl('/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    saveAuthSession({ token: payload.token, user: payload.user });
    return payload;
};

module.exports = {
    loginWithCredentials,
    registerWithCredentials,
    clearAuthSession,
    getAuthToken,
};
