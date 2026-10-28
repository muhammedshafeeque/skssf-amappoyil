import {
  AppBar,
  Badge,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import {
  Article,
  Bloodtype,
  Dashboard,
  Groups,
  History,
  Inbox,
  Logout,
  Menu,
  MedicalServices,
  People,
  Settings,
  VolunteerActivism,
  Accessible,
} from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { where } from 'firebase/firestore';
import { Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { SAHAJARI_REQUEST_TYPES } from '../shared';
import { useAuth, useCan } from '../lib/auth';
import { useCollection } from '../lib/data';
import { auth } from '../lib/firebase';
import { label } from '../lib/labels';

const WIDTH = 240;

interface Item {
  to: string;
  text: string;
  icon: ReactNode;
  admin?: boolean;
  badge?: number;
}

export function Layout() {
  const { user, role } = useAuth();
  const { isAdmin } = useCan();
  const mobile = useMediaQuery('(max-width:900px)');
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const pending = useCollection(
    'requests',
    isAdmin ? [where('status', '==', 'pending')] : [where('status', '==', 'pending'), where('type', 'in', [...SAHAJARI_REQUEST_TYPES])],
    `pending-${isAdmin}`,
  );

  const sections: { title?: string; items: Item[] }[] = [
    { items: [{ to: '/', text: 'Dashboard', icon: <Dashboard /> }] },
    {
      title: 'Unit',
      items: [
        { to: '/members', text: 'Members', icon: <People /> },
        { to: '/donors', text: 'Blood donors', icon: <Bloodtype /> },
        { to: '/committee', text: 'Committee', icon: <Groups /> },
        { to: '/news', text: 'News', icon: <Article />, admin: true },
      ],
    },
    {
      title: 'Sahajari',
      items: [
        { to: '/patients', text: 'Patients', icon: <MedicalServices /> },
        { to: '/donations', text: 'Donations', icon: <VolunteerActivism /> },
        { to: '/equipment', text: 'Equipment', icon: <Accessible /> },
      ],
    },
    {
      title: 'Admin',
      items: [
        { to: '/requests', text: 'Requests', icon: <Inbox />, badge: pending.data.length },
        { to: '/audit', text: 'Audit log', icon: <History />, admin: true },
        { to: '/settings', text: 'Settings', icon: <Settings />, admin: true },
      ],
    },
  ];

  const drawer = (
    <Box sx={{ bgcolor: '#0b3d2e', color: '#e8f3ef', height: '100%' }}>
      <Toolbar>
        <Box>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>SKSSF Amappoyil</Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Unit admin
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      {sections.map((s, i) => {
        const items = s.items.filter((it) => !it.admin || isAdmin);
        if (items.length === 0) return null;
        return (
          <List key={i} dense subheader={s.title ? <Typography variant="overline" sx={{ px: 2, opacity: 0.6 }}>{s.title}</Typography> : undefined}>
            {items.map((it) => {
              const active = it.to === '/' ? location.pathname === '/' : location.pathname.startsWith(it.to);
              return (
                <ListItemButton
                  key={it.to}
                  component={NavLink}
                  to={it.to}
                  onClick={() => setOpen(false)}
                  sx={{ mx: 1, borderRadius: 2, bgcolor: active ? 'rgba(255,255,255,0.14)' : undefined, color: 'inherit' }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                    {it.badge ? (
                      <Badge badgeContent={it.badge} color="error">
                        {it.icon}
                      </Badge>
                    ) : (
                      it.icon
                    )}
                  </ListItemIcon>
                  <ListItemText primary={it.text} />
                </ListItemButton>
              );
            })}
          </List>
        );
      })}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" color="inherit" sx={{ ml: { md: `${WIDTH}px` }, width: { md: `calc(100% - ${WIDTH}px)` }, borderBottom: '1px solid #e3e8e6' }} elevation={0}>
        <Toolbar>
          {mobile && (
            <IconButton edge="start" onClick={() => setOpen(true)} sx={{ mr: 1 }} aria-label="Open menu">
              <Menu />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }} />
          <Chip size="small" label={label(role)} color="primary" variant="outlined" sx={{ mr: 1 }} />
          <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
            {user?.displayName ?? user?.email}
          </Typography>
          <Tooltip title="Sign out">
            <IconButton onClick={() => signOut(auth)} aria-label="Sign out">
              <Logout />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={mobile ? 'temporary' : 'permanent'}
        open={mobile ? open : true}
        onClose={() => setOpen(false)}
        sx={{ width: WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: WIDTH } }}
      >
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, mt: 8 }}>
        <Suspense fallback={<CircularProgress sx={{ m: 4 }} />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
}
