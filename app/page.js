"use client";
import { useEffect, useState } from 'react';
import TypingLoader from '../components/TypingLoader'; 
import Dashboard from './dashboard'; 

export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000); 
    return () => clearTimeout(timer); 
  }, []);

  if (loading) {
    return <TypingLoader />;
  }

  return <Dashboard />;
}
