const axios = require('axios');

class LineLoginService {
    /**
     * Exchange authorization code for access token
     * @param {string} code - Authorization code from LINE Login callback
     * @returns {Promise<Object>} Access token and user profile
     */
    static async exchangeCodeForToken(code) {
        const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;
        const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET;
        const LINE_LOGIN_REDIRECT_URI = process.env.LINE_LOGIN_REDIRECT_URI;

        if (!LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_CHANNEL_SECRET || !LINE_LOGIN_REDIRECT_URI) {
            throw new Error('LINE Login credentials not configured. Please set LINE_LOGIN_CHANNEL_ID, LINE_LOGIN_CHANNEL_SECRET, and LINE_LOGIN_REDIRECT_URI in environment variables.');
        }

        try {
            // Exchange authorization code for access token
            const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', 
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: LINE_LOGIN_REDIRECT_URI,
                    client_id: LINE_LOGIN_CHANNEL_ID,
                    client_secret: LINE_LOGIN_CHANNEL_SECRET
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const { access_token, id_token } = tokenResponse.data;

            // Verify and decode ID token to get user information
            const profileResponse = await axios.get('https://api.line.me/v2/profile', {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            });

            return {
                access_token,
                id_token,
                line_user_id: profileResponse.data.userId,
                display_name: profileResponse.data.displayName,
                picture_url: profileResponse.data.pictureUrl || null,
                email: profileResponse.data.email || null
            };
        } catch (error) {
            console.error('LINE Login token exchange error:', error.response?.data || error.message);
            throw new Error('Failed to exchange LINE authorization code for token');
        }
    }

    /**
     * Verify ID token (optional - for additional security)
     * @param {string} idToken - ID token from LINE
     * @returns {Promise<Object>} Decoded token data
     */
    static async verifyIdToken(idToken) {
        const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;

        try {
            const response = await axios.post('https://api.line.me/oauth2/v2.1/verify', 
                new URLSearchParams({
                    id_token: idToken,
                    client_id: LINE_LOGIN_CHANNEL_ID
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('LINE ID token verification error:', error.response?.data || error.message);
            throw new Error('Failed to verify LINE ID token');
        }
    }

    /**
     * Revoke access token (for logout)
     * @param {string} accessToken - Access token to revoke
     */
    static async revokeToken(accessToken) {
        const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;
        const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET;

        try {
            await axios.post('https://api.line.me/oauth2/v2.1/revoke',
                new URLSearchParams({
                    access_token: accessToken,
                    client_id: LINE_LOGIN_CHANNEL_ID,
                    client_secret: LINE_LOGIN_CHANNEL_SECRET
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
        } catch (error) {
            console.error('LINE token revocation error:', error.response?.data || error.message);
            // Don't throw error - token might already be expired
        }
    }

    /**
     * Get LINE Login authorization URL
     * @param {string} state - State parameter for CSRF protection
     * @returns {string} Authorization URL
     */
    static getAuthorizationUrl(state) {
        const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;
        const LINE_LOGIN_REDIRECT_URI = process.env.LINE_LOGIN_REDIRECT_URI;

        if (!LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_REDIRECT_URI) {
            throw new Error('LINE Login credentials not configured');
        }

        const baseUrl = 'https://access.line.me/oauth2/v2.1/authorize';
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: LINE_LOGIN_CHANNEL_ID,
            redirect_uri: LINE_LOGIN_REDIRECT_URI,
            state: state,
            scope: 'profile openid email',
            bot_prompt: 'normal'
        });

        return `${baseUrl}?${params.toString()}`;
    }
}

module.exports = LineLoginService;

