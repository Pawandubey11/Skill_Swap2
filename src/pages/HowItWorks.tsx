import React from 'react';
import { motion } from 'motion/react';
import { Search, MessageSquare, Repeat, Award } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: Search,
      title: 'Find a Match',
      desc: 'Browse our massive directory of skilled individuals looking to swap their knowledge for yours. Use our advanced filters to pinpoint exactly what you need.',
      color: 'text-lime',
      bg: 'bg-lime/10'
    },
    {
      icon: MessageSquare,
      title: 'Propose a Swap',
      desc: 'Send a request detailing your current skill level, what you can offer, and your availability. Our built-in messaging system makes coordination a breeze.',
      color: 'text-gold',
      bg: 'bg-gold/10'
    },
    {
      icon: Repeat,
      title: 'The Exchange',
      desc: 'Hop on a video call or meet locally. Spend an hour teaching your skill, then spend an hour learning theirs. It is a 1-to-1 time exchange.',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10'
    },
    {
      icon: Award,
      title: 'Grow & Review',
      desc: 'Leave a detailed review of your experience. As you build your reputation, you unlock access to master-level swappers and exclusive community events.',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10'
    }
  ];

  return (
    <div className="container mx-auto px-6 md:px-16 py-24 min-h-[80vh]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mx-auto mb-20"
      >
        <div className="text-xs font-bold text-lime uppercase tracking-widest mb-3">The Process</div>
        <h1 className="font-playfair text-4xl md:text-5xl font-black mb-6">How SkillSwap Works</h1>
        <p className="text-muted text-lg">
          We believe knowledge should be free and accessible. Our platform removes financial barriers 
          by facilitating direct, peer-to-peer educational exchanges.
        </p>
      </motion.div>

      <div className="max-w-4xl mx-auto">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col md:flex-row gap-8 items-center mb-16 relative"
            >
              {index !== steps.length - 1 && (
                <div className="hidden md:block absolute left-1/2 top-full w-px h-16 bg-gradient-to-b from-white/20 to-transparent -translate-x-1/2" />
              )}
              
              <div className={`w-full md:w-1/2 flex justify-center ${index % 2 !== 0 ? 'md:order-2' : ''}`}>
                <div className={`w-32 h-32 rounded-3xl ${step.bg} flex items-center justify-center border border-white/5 rotate-3 hover:rotate-6 transition-transform shadow-2xl`}>
                  <Icon className={`w-12 h-12 ${step.color}`} />
                </div>
              </div>
              
              <div className={`w-full md:w-1/2 ${index % 2 !== 0 ? 'md:text-right' : ''}`}>
                <div className="text-6xl font-black text-white/5 absolute -top-8 -left-4 z-[-1]">0{index + 1}</div>
                <h3 className="font-playfair text-3xl font-bold mb-4">{step.title}</h3>
                <p className="text-muted leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default HowItWorks;
