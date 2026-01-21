console.log('Hello from Agent!');
import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Village } from './game/Village';
import { HUD, BuildMenu, SelectionPanel, ToastContainer } from './ui/HUD';
import { WelcomePanel } from './ui/TaskPanel';
import { AgentDashboard } from './ui/AgentDashboard';
import './index.css';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <h1>Quest</h1>
      <div className="loading-spinner" />
      <p style={{ marginTop: '16px', opacity: 0.7 }}>Loading your village...</p>
    </div>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('quest-onboarded');
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleDismissWelcome = () => {
    localStorage.setItem('quest-onboarded', 'true');
    setShowWelcome(false);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="game-container">
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: 3, // ACESFilmicToneMapping
          toneMappingExposure: 1.2,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#87ceeb');
        }}
      >
        <Suspense fallback={null}>
          <Village />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <HUD />
      <AgentDashboard />
      <BuildMenu />
      <SelectionPanel />
      <ToastContainer />

      {/* Welcome Onboarding */}
      {showWelcome && <WelcomePanel onDismiss={handleDismissWelcome} />}
    </div>
  );
}

export default App;
