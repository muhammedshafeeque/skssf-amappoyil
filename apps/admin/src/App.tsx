import { CssBaseline, Typography } from '@mui/material';
import { MEMBER_ID_PREFIX } from '@skamp/shared';

export function App() {
  return (
    <>
      <CssBaseline />
      <Typography variant="h5" sx={{ p: 3 }}>
        {MEMBER_ID_PREFIX} Admin
      </Typography>
    </>
  );
}
