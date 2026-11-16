import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './context/AuthContext.js';
import App from './App.js';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    // Retrying an unreachable server only delays the offline fallbacks.
    queries: { refetchOnWindowFocus: false, staleTime: 30_000, retry: (count, err) => !(err as { offline?: boolean }).offline && count < 1 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <App />
        </AuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
