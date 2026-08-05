import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Code, Palette, Music, Globe, Utensils, Activity, Trash2 } from 'lucide-react';
import { Skill, Category } from '../types';
import { Link } from 'react-router-dom';

const categories: { id: Category; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'tech', label: 'Tech', icon: Code },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'language', label: 'Language', icon: Globe },
  { id: 'cooking', label: 'Cooking', icon: Utensils },
  { id: 'fitness', label: 'Fitness', icon: Activity },
];

const Home = ({ skills, isLoading, user, token, showToast, setSkills }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Category>('all');

  const filteredSkills = useMemo(() => {
    return skills.filter((s: Skill) => {
      const matchesFilter = activeFilter === 'all' || s.category === activeFilter;
      const matchesSearch = s.offer.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           s.bio.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [skills, activeFilter, searchQuery]);

  const handleDeleteSkill = async (id: string) => {
    try {
      const response = await fetch(`/api/skills/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSkills(skills.filter((s: Skill) => s.id !== id));
        showToast('Skill deleted', 'Listing removed from the community.', 'delete');
      } else {
        const err = await response.json();
        showToast('Error', err.error, 'delete');
      }
    } catch (error) {
      console.error('Error deleting skill:', error);
    }
  };

  return (
    <>
      <section className="relative min-h-[90vh] flex items-center px-6 md:px-16 overflow-hidden">
        <div className="absolute top-[-100px] right-[-80px] w-[520px] h-[520px] bg-lime/10 blur-[90px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-60px] left-[10%] w-[380px] h-[380px] bg-gold/5 blur-[90px] rounded-full" />
        
        <div className="relative z-10 max-w-3xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 border border-lime/20 rounded-full text-xs font-semibold text-lime uppercase tracking-widest mb-8 bg-lime/5"
          >
            <span className="w-1.5 h-1.5 bg-lime rounded-full animate-ping" />
            Now Live — Join 12,000+ Swappers
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-playfair text-5xl md:text-8xl font-black leading-[0.9] tracking-tighter mb-6"
          >
            Trade <span className="text-lime">Skills,</span><br />
            Grow <span className="text-gold">Together.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted leading-relaxed max-w-lg mb-12"
          >
            No money. No hierarchy. Just humans exchanging what they know for what they need. 
            Teach design, learn to code. Swap cooking for guitar.
          </motion.p>
        </div>
      </section>

      <section id="skills" className="py-24 px-6 md:px-16 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
          <div>
            <div className="text-xs font-bold text-lime uppercase tracking-widest mb-3">Community Skills</div>
            <h2 className="font-playfair text-4xl font-bold tracking-tight">Find Your Swap</h2>
          </div>
          
          <div className="w-full md:w-96 bg-navy-2 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-lime/50 transition-all">
            <Search className="text-muted w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search skills..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-white placeholder:text-muted"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-10">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  activeFilter === cat.id 
                    ? 'bg-lime text-navy' 
                    : 'bg-white/5 text-muted border border-white/5 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredSkills.map((skill: Skill) => (
              <motion.div
                key={skill.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-navy-2 border border-white/10 rounded-2xl p-7 relative group hover:border-lime/30 transition-all shadow-lg shadow-black/20 overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-lime to-gold scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                
                {user && user.id === skill.authorId && (
                  <button 
                    onClick={() => handleDeleteSkill(skill.id)}
                    className="absolute top-4 right-4 p-2 bg-white/5 rounded-full text-muted hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div className="flex items-center gap-4 mb-6 relative z-0">
                  <div className="w-12 h-12 rounded-full bg-navy-3 border border-lime/20 flex items-center justify-center text-xl shadow-inner">
                    🌟
                  </div>
                  <div>
                    <div className="text-xs text-muted mb-0.5">{skill.name}</div>
                    <div className="font-playfair text-xl font-bold line-clamp-1">{skill.offer}</div>
                  </div>
                </div>

                <p className="text-sm text-muted leading-relaxed mb-6 line-clamp-3 relative z-0">
                  {skill.bio}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-muted">
                    {skill.category}
                  </span>
                </div>

                <div className="pt-5 border-t border-white/5 flex items-center justify-between relative z-0">
                  <div className="text-sm text-muted">
                    Wants: <strong className="text-gold">{skill.want}</strong>
                  </div>
                  <Link 
                    to={`/course/${skill.id}`}
                    className="text-xs font-bold text-lime bg-lime/10 px-3 py-1.5 rounded hover:bg-lime/20 transition-all"
                  >
                    View Course →
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredSkills.length === 0 && !isLoading && (
            <div className="col-span-full py-20 text-center text-muted">
              No skills match your search. Try another keyword.
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Home;
