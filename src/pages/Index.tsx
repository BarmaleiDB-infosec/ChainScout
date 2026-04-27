import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import MainContent from "@/components/MainContent";
import ScannerSelector from "@/components/ScannerSelector";
import Footer from "@/components/Footer";
import cyberNetworkBg from "@/assets/cyber-network-bg.jpg";
import floatingElements from "@/assets/floating-elements.jpg";

const Index = () => {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX - window.innerWidth / 2) / 50,
        y: (e.clientY - window.innerHeight / 2) / 50,
      });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${cyberNetworkBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        />
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${floatingElements})`,
            backgroundSize: '80%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px) scale(1.1)`,
          }}
        />
        <div className="absolute inset-0 cyber-grid opacity-30" />
      </div>

      {/* Floating Interactive Elements */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <div 
          className="absolute w-32 h-32 bg-primary/10 rounded-full blur-xl animate-float"
          style={{
            top: '20%',
            left: '10%',
            transform: `translate(${mousePosition.x * 2}px, ${mousePosition.y * 2}px)`,
          }}
        />
        <div 
          className="absolute w-24 h-24 bg-cyber-blue/10 rounded-full blur-xl animate-float"
          style={{
            top: '60%',
            right: '15%',
            animationDelay: '1s',
            transform: `translate(${-mousePosition.x * 1.5}px, ${-mousePosition.y * 1.5}px)`,
          }}
        />
        <div 
          className="absolute w-40 h-40 bg-cyber-pink/5 rounded-full blur-2xl animate-float"
          style={{
            top: '40%',
            left: '60%',
            animationDelay: '2s',
            transform: `translate(${mousePosition.x * 0.8}px, ${mousePosition.y * 0.8}px)`,
          }}
        />
      </div>

      <div className="relative z-20">
        <Header />
        <main className="flex-1">
          <Hero />
          <ScannerSelector />
          <MainContent />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Index;
