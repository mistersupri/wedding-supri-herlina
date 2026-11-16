import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './context/AuthContext.js';
import App from './App.js';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    // 'always': do not let the library hold requests while the browser reports offline. The service worker's
    // saved answers and the wish queue handle a missing connection, and they need the request to actually run.
    // Retrying an unreachable server only delays those fallbacks.
    queries: {
      networkMode: 'always',
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: (count, err) => !(err as { offline?: boolean }).offline && count < 1,
    },
    mutations: { networkMode: 'always' },
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
