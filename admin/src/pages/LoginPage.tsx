import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/data';
import { auth } from '../lib/firebase';

export function LoginPage() {
  const { user, noAccess } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const msg = errorMessage(err);
      setError(/invalid-credential|wrong-password|user-not-found/.test(String((err as { code?: string }).code)) ? 'Email or password is incorrect.' : msg);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError(null);
    if (!email.trim()) return setError('Enter your email first.');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo(`If ${email.trim()} has an admin account, a reset link has been sent.`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#0b3d2e', p: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <form onSubmit={login}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                SKSSF Amappoyil
              </Typography>
              <Typography color="text.secondary">Admin panel sign in</Typography>
            </Box>
            {noAccess && <Alert severity="warning">This account has no admin access. Ask the super admin to grant a role.</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            {info && <Alert severity="info">{info}</Alert>}
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
            <Button onClick={reset} size="small">
              Forgot password?
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
