import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import InternationalApp from './InternationalApp';
import { DataProvider } from './context/DataContext';
import './styles/index.css';

type Route = 'domestic' | 'international';

const baseUrl = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');

function resolveRoute(): Route {
  const { hash, pathname } = window.location;
  const hashPath = hash.replace(/^#/, '').toLowerCase();
  if (hashPath.startsWith('/international') || hashPath === 'international') {
    return 'international';
  }
  const relativePath = pathname.startsWith(baseUrl) ? pathname.slice(baseUrl.length) : pathname.slice(1);
  if (relativePath.toLowerCase().startsWith('international')) {
    return 'international';
  }
  return 'domestic';
}

function Root() {
  const [route, setRoute] = useState<Route>(() => resolveRoute());

  useEffect(() => {
    const handleNavigation = () => {
      setRoute(resolveRoute());
    };
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  if (route === 'international') {
    return <InternationalApp />;
  }

  return (
    <DataProvider>
      <App />
    </DataProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
