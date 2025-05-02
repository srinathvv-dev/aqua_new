// pages/_app.js
import { useEffect, useState } from 'react';
import '../styles/globals.css';
import TypingLoader from '../components/TypingLoader'; // Ensure the path is correct

function MyApp({ Component, pageProps }) {
  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (hasVisited) {
      setFirstLoad(false); // User has already visited, no need for loader
    } else {
      localStorage.setItem('hasVisited', 'true'); // Mark as visited
    }
  }, []);

  return (
    <>
      {firstLoad ? (
        <TypingLoader onFinish={() => setFirstLoad(false)} />
      ) : (
        <Component {...pageProps} />
      )}
    </>
  );
}

export default MyApp;
