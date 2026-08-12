import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { ArrowLeft, Clock, BookOpen, User } from 'lucide-react';
import { motion } from 'motion/react';

const CourseDetail = ({ user, token }: any) => {
  const { id } = useParams();

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await fetch(`/api/skills/${id}`);

        if (res.ok) {
          const data = await res.json();
          setCourse(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

  if (loading) {
    return (
      <div className="pt-32 text-center text-lime animate-pulse">
        Loading course data...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="pt-32 text-center text-red-400">
        Course not found.
      </div>
    );
  }

  const youtubeUrl = course.youtubeId
    ? `https://www.youtube.com/watch?v=${course.youtubeId}`
    : '';

  return (
    <div className="container mx-auto px-6 md:px-16 pb-24">

      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Skills
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Main Content */}
        <div className="lg:col-span-2">

          {/* Course Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <span className="text-xs font-bold text-lime uppercase tracking-widest px-3 py-1.5 rounded-full bg-lime/10 mb-4 inline-block">
              {course.category}
            </span>

            <h1 className="font-playfair text-4xl md:text-6xl font-black leading-tight mb-4">
              {course.offer}
            </h1>

            <p className="text-lg text-muted">
              {course.bio}
            </p>
          </motion.div>

          {/* YouTube Video */}
          {youtubeUrl && (
            <div className="bg-navy-2 border border-white/10 rounded-2xl overflow-hidden mb-12 shadow-2xl">
              <div className="aspect-video">

                <ReactPlayer
                  src={youtubeUrl}
                  width="100%"
                  height="100%"
                  controls
                  light
                  playIcon={
                    <div className="bg-lime text-navy p-4 rounded-full font-bold">
                      Play Lecture
                    </div>
                  }
                />

              </div>
            </div>
          )}

          {/* Course Documentation */}
          <div className="bg-navy-2 border border-white/10 rounded-2xl p-8 md:p-12 shadow-xl relative overflow-hidden">

            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-lime/5 blur-[100px] rounded-full pointer-events-none" />

            <MarkdownRenderer
              content={course.documentation || ''}
            />

          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">

          <div className="sticky top-28 bg-navy-2 border border-white/10 rounded-2xl p-6 shadow-xl">

            <h3 className="font-playfair text-xl font-bold mb-6 border-b border-white/5 pb-4">
              Course Info
            </h3>

            <div className="flex flex-col gap-5">

              {/* Instructor */}
              <div className="flex items-center gap-4">

                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lime">
                  <User className="w-5 h-5" />
                </div>

                <div>
                  <div className="text-xs text-muted">
                    Instructor
                  </div>

                  <div className="font-bold">
                    {course.authorName}
                  </div>
                </div>

              </div>

              {/* Posted Date */}
              <div className="flex items-center gap-4">

                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lime">
                  <Clock className="w-5 h-5" />
                </div>

                <div>
                  <div className="text-xs text-muted">
                    Posted
                  </div>

                  <div className="font-bold">
                    {course.createdAt
                      ? new Date(course.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>

              </div>

              {/* Requirements */}
              <div className="flex items-center gap-4">

                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lime">
                  <BookOpen className="w-5 h-5" />
                </div>

                <div>
                  <div className="text-xs text-muted">
                    Requirements
                  </div>

                  <div className="font-bold text-gold">
                    Must teach: {course.want}
                  </div>
                </div>

              </div>

            </div>

            {/* Request Swap */}
            <div className="mt-8 pt-6 border-t border-white/5">

              <button
                className="w-full bg-lime text-navy py-4 rounded-xl font-bold hover:bg-lime-2 transition-all shadow-lg shadow-lime/20"
              >
                Request Swap
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default CourseDetail;
