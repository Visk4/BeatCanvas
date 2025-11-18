# OAuth Setup Guide

## Google OAuth Configuration

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: Beat Canvas
   - User support email: your email
   - Developer contact: your email
6. Application type: **Web application**
7. Add **Authorized redirect URIs**:
   - `http://localhost:8000/api/v1/auth/google/callback`
   - `https://yourdomain.com/api/v1/auth/google/callback` (for production)
8. Click **Create**
9. Copy the **Client ID** and **Client Secret**

### 2. Configure Backend

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Google OAuth credentials to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   FRONTEND_URL=http://localhost:5173
   ```

### 3. Install Dependencies

```bash
pip install authlib httpx
```

Or install all dependencies:
```bash
pip install -r requirements.txt
```

### 4. Test OAuth Flow

1. Start the backend:
   ```bash
   python main.py
   ```

2. Navigate to: `http://localhost:8000/api/v1/auth/google`
3. Complete the Google sign-in flow
4. You'll be redirected to frontend with a JWT token

## OAuth Endpoints

- **GET** `/api/v1/auth/google` - Initiate Google OAuth flow
- **GET** `/api/v1/auth/google/callback` - OAuth callback handler (used by Google)

## Frontend Integration

The OAuth flow redirects to: `{FRONTEND_URL}/auth/callback?token={jwt_token}`

Create a callback handler in your frontend to:
1. Extract the token from URL params
2. Store it in localStorage/cookies
3. Redirect to dashboard

Example:
```javascript
// In your frontend router
<Route path="/auth/callback" element={<OAuthCallback />} />

// OAuthCallback component
function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      navigate('/dashboard');
    } else {
      navigate('/login?error=oauth_failed');
    }
  }, []);
  
  return <div>Completing sign in...</div>;
}
```

## Database Schema

Users created via OAuth will have these additional fields:
- `oauth_provider`: "google"
- `oauth_id`: Google user ID
- `name`: User's full name from Google
- `picture`: Profile picture URL from Google
- **No `hashed_password`** (OAuth users can't login with password)

## Security Notes

1. Keep your `.env` file private (it's in `.gitignore`)
2. Use different OAuth credentials for development and production
3. Enable HTTPS for production OAuth redirects
4. Regularly rotate your `JWT_SECRET`
