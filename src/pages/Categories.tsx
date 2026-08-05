import React from 'react';
import { motion } from 'motion/react';
import { Code, Palette, Music, Globe, Utensils, Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Category, Skill } from '../types';

const Categories = ({ skills }: { skills: Skill[] }) => {
  const categoryData = [
    { id: 'tech', label: 'Technology', icon: Code, desc: 'Programming, Architecture, AI', color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'design', label: 'Design & UX', icon: Palette, desc: 'UI/UX, 3D, Graphic Design', color: 'text-pink-400', bg: 'bg-pink-400/10' },
    { id: 'music', label: 'Music & Audio', icon: Music, desc: 'Instruments, Production', color: 'text-gold', bg: 'bg-gold/10' },
    { id: 'language', label: 'Languages', icon: Globe, desc: 'Linguistics, Translation', color: 'text-green-400', bg: 'bg-green-400/10' },
    { id: 'cooking', label: 'Culinary Arts', icon: Utensils, desc: 'Baking, Nutrition', color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'fitness', label: 'Health & Fitness', icon: Activity, desc: 'Yoga, HIIT, Wellness', color: 'text-red-400', bg: 'bg-red-400/10' },
  ];

  return (
    <div className="container mx-auto px-6 md:px-16 py-24 min-h-[80vh]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16"
      >
        <div className="text-xs font-bold text-lime uppercase tracking-widest mb-3">Explore</div>
        <h1 className="font-playfair text-4xl md:text-5xl font-black mb-6">Course Categories</h1>
        <p className="text-muted text-lg max-w-xl">
          Dive deep into our massive directory of disciplines. From classical arts to 
          cutting-edge technology, our community offers rigorous, documentation-rich courses.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoryData.map((cat, index) => {
          const Icon = cat.icon;
          const count = skills.filter(s => s.category === cat.id).length;

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-navy-2 border border-white/10 rounded-3xl p-8 hover:border-lime/30 transition-all group relative overflow-hidden flex flex-col h-full shadow-lg"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
              
              <div className={`w-14 h-14 rounded-2xl ${cat.bg} flex items-center justify-center mb-6 shadow-inner`}>
                <Icon className={`w-7 h-7 ${cat.color}`} />
              </div>

              <h3 className="font-playfair text-2xl font-bold mb-2">{cat.label}</h3>
              <p className="text-sm text-muted mb-6 flex-grow">{cat.desc}</p>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <span className="text-xs font-medium text-white/50">{count} Courses Available</span>
                <Link to="/" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-lime group-hover:text-navy transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Categories;
