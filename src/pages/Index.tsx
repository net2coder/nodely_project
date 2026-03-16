import { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';

const FeaturesSection = lazy(() => import('@/components/landing/FeaturesSection').then(m => ({ default: m.FeaturesSection })));
const HowItWorksSection = lazy(() => import('@/components/landing/HowItWorksSection').then(m => ({ default: m.HowItWorksSection })));
const SecuritySection = lazy(() => import('@/components/landing/SecuritySection').then(m => ({ default: m.SecuritySection })));
const Footer = lazy(() => import('@/components/landing/Footer').then(m => ({ default: m.Footer })));

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true, state: { welcomeBack: true } });
    }
  }, [user, loading, navigate]);

  // Show nothing while checking auth to prevent flash
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <Suspense fallback={null}>
        <FeaturesSection />
        <HowItWorksSection />
        <SecuritySection />
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
