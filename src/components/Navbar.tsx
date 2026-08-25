import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ onPostClick, token, user, onLogin, onLogout, onDashboard }: any) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-16 transition-all duration-300 ${
      isScrolled ? 'py-3.5 bg-navy/70 backdrop-blur-lg border-b border-lime/10' : 'py-5 bg-transparent'
    }`}>
      <Link to="/" className="font-playfair text-2xl font-black tracking-tight cursor-pointer">
        Skill<span className="text-lime">Swap</span>
      </Link>
      <div className="hidden md:flex items-center gap-9">
        {[
          { name: 'Skills', path: '/' },
          { name: 'How It Works', path: '/how-it-works' },
          { name: 'Categories', path: '/categories' },
          { name: 'Security Dashboard', path: '/dashboard' }
        ].map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className={`text-sm font-medium transition-colors uppercase tracking-widest relative group ${
              location.pathname === link.path ? 'text-white' : 'text-muted hover:text-white'
            }`}
          >
            {link.name}
            <span className={`absolute -bottom-1 left-0 h-0.5 bg-lime transition-all duration-300 ${
              location.pathname === link.path ? 'w-full' : 'w-0 group-hover:w-full'
            }`} />
          </Link>
        ))}
      </div>
      <div className="flex gap-4 items-center">
        {!token ? (
          <button 
            onClick={onLogin}
            className="text-sm font-medium text-muted hover:text-white transition-colors uppercase tracking-widest"
          >
            Login / Register
          </button>
        ) : (
          <>
            <button 
              onClick={onDashboard}
              className="text-sm font-medium text-muted hover:text-white transition-colors uppercase tracking-widest"
            >
              Dashboard
            </button>
            <button 
              onClick={onLogout}
              className="text-sm font-medium text-muted hover:text-white transition-colors uppercase tracking-widest"
            >
              Logout
            </button>
          </>
        )}
        <button 
          onClick={onPostClick}
          className="bg-lime hover:bg-lime-2 text-navy px-6 py-2.5 rounded font-bold text-sm transition-all active:scale-95 shadow-lg shadow-lime/20"
        >
          Post a Skill
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
