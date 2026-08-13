import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import CourseDetail from './pages/CourseDetail';
import HowItWorks from './pages/HowItWorks';
import Categories from './pages/Categories';
import SecurityDashboard from './pages/SecurityDashboard';

import { Skill } from './types';

import {
  AnimatePresence,
  motion,
} from 'motion/react';

import {
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

export default function App() {

  // ============================================================
  // SKILLS
  // ============================================================

  const [skills, setSkills] =
    useState<Skill[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  const [token, setToken] =
    useState<string | null>(
      localStorage.getItem('token'),
    );

  const [user, setUser] =
    useState<{
      id: string;
      username: string;
    } | null>(
      localStorage.getItem('user')
        ? JSON.parse(
            localStorage.getItem('user')!,
          )
        : null,
    );

  // ============================================================
  // AUTH MODAL
  // ============================================================

  const [isAuthModalOpen, setIsAuthModalOpen] =
    useState(false);

  const [authMode, setAuthMode] =
    useState<'login' | 'register'>(
      'login',
    );

  const [authForm, setAuthForm] =
    useState({
      username: '',
      password: '',
    });

  // ============================================================
  // TOAST
  // ============================================================

  const [toast, setToast] =
    useState<{
      title: string;
      sub: string;
      type: 'success' | 'delete';
    } | null>(null);

  // ============================================================
  // LOAD SKILLS
  // ============================================================

  useEffect(() => {
    fetchSkills();
  }, []);

  // ============================================================
  // FETCH SKILLS
  // ============================================================

  const fetchSkills = async () => {

    try {

      const response =
        await fetch('/api/skills');

      const data =
        await response.json();

      setSkills(data);

    } catch (error) {

      console.error(
        'Error fetching skills:',
        error,
      );

    } finally {

      setIsLoading(false);

    }
  };

  // ============================================================
  // TOAST
  // ============================================================

  const showToast = (
    title: string,
    sub: string,
    type: 'success' | 'delete' = 'success',
  ) => {

    setToast({
      title,
      sub,
      type,
    });

    setTimeout(
      () => setToast(null),
      3500,
    );
  };

  // ============================================================
  // LOGIN / REGISTER
  // ============================================================

  const handleAuth = async (
    e: React.FormEvent,
  ) => {

    e.preventDefault();

    try {

      const res =
        await fetch(
          `/api/${authMode}`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              authForm,
            ),
          },
        );

      if (res.ok) {

        const data =
          await res.json();

        // Save token
        setToken(data.token);

        // Save user
        setUser(data.user);

        // Save in browser
        localStorage.setItem(
          'token',
          data.token,
        );

        localStorage.setItem(
          'user',
          JSON.stringify(
            data.user,
          ),
        );

        // Close modal
        setIsAuthModalOpen(false);

        // Reset form
        setAuthForm({
          username: '',
          password: '',
        });

        showToast(
          authMode === 'login'
            ? 'Logged in'
            : 'Registered',
          'Welcome!',
        );

      } else {

        const err =
          await res.json();

        showToast(
          'Error',
          err.error ||
            'Authentication failed',
          'delete',
        );

      }

    } catch (error) {

      console.error(
        'Authentication error:',
        error,
      );

      showToast(
        'Error',
        'Unable to connect to server.',
        'delete',
      );

    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {

    setToken(null);

    setUser(null);

    localStorage.removeItem(
      'token',
    );

    localStorage.removeItem(
      'user',
    );

    showToast(
      'Logged out',
      'See you next time!',
    );
  };

  // ============================================================
  // APPLICATION
  // ============================================================

  return (

    <div className="min-h-screen relative selection:bg-lime selection:text-navy">

      {/* ======================================================
          BACKGROUND NOISE
      ======================================================= */}

      <div
        className="
          fixed
          inset-0
          pointer-events-none
          z-50
          opacity-[0.03]
          animate-pulse
          bg-[url('https://grainy-gradients.vercel.app/noise.svg')]
        "
      />

      {/* ======================================================
          NAVBAR
      ======================================================= */}

      <Navbar

        onPostClick={() => {}}

        token={token}

        user={user}

        onLogin={() =>
          setIsAuthModalOpen(true)
        }

        onLogout={handleLogout}

        onDashboard={() => {}}

      />

      {/* ======================================================
          MAIN CONTENT
      ======================================================= */}

      <div className="pt-20">

        <Routes>

          {/* ==================================================
              HOME
          =================================================== */}

          <Route
            path="/"
            element={
              <Home
                skills={skills}
                isLoading={isLoading}
                user={user}
                token={token}
                showToast={showToast}
                setSkills={setSkills}
              />
            }
          />

          {/* ==================================================
              COURSE DETAIL
          =================================================== */}

          <Route
            path="/course/:id"
            element={
              <CourseDetail
                user={user}
                token={token}
              />
            }
          />

          {/* ==================================================
              HOW IT WORKS
          =================================================== */}

          <Route
            path="/how-it-works"
            element={
              <HowItWorks />
            }
          />

          {/* ==================================================
              CATEGORIES
          =================================================== */}

          <Route
            path="/categories"
            element={
              <Categories
                skills={skills}
              />
            }
          />

          {/* ==================================================
              SECURITY DASHBOARD
          =================================================== */}

          <Route
            path="/security"
            element={
              <SecurityDashboard />
            }
          />

        </Routes>

      </div>

      {/* ======================================================
          FOOTER
      ======================================================= */}

      <footer
        className="
          py-12
          px-6
          md:px-16
          border-t
          border-white/5
          flex
          flex-col
          md:flex-row
          justify-between
          items-center
          gap-6
        "
      >

        <div
          className="
            font-playfair
            text-xl
            font-black
          "
        >

          Skill
          <span className="text-lime">
            Swap
          </span>

        </div>

        <div
          className="
            flex
            gap-8
            text-sm
            text-muted
            underline-offset-4
          "
        >

          <a
            href="#"
            className="
              hover:text-white
              hover:underline
            "
          >
            About
          </a>

          <a
            href="#"
            className="
              hover:text-white
              hover:underline
            "
          >
            Privacy
          </a>

          <a
            href="#"
            className="
              hover:text-white
              hover:underline
            "
          >
            Terms
          </a>

        </div>

        <div
          className="
            text-xs
            text-muted/50
          "
        >
          © 2026 SkillSwap.
          No rights reserved.
        </div>

      </footer>

      {/* ======================================================
          MODALS & TOASTS
      ======================================================= */}

      <AnimatePresence>

        {/* ====================================================
            TOAST
        ===================================================== */}

        {toast && (

          <motion.div

            initial={{
              y: 100,
              opacity: 0,
            }}

            animate={{
              y: 0,
              opacity: 1,
            }}

            exit={{
              y: 100,
              opacity: 0,
            }}

            className="
              fixed
              bottom-8
              right-8
              z-[200]
              bg-navy-3
              border
              border-lime/20
              rounded-xl
              p-5
              shadow-2xl
              flex
              items-center
              gap-4
              max-w-sm
            "
          >

            <div
              className={`
                p-2
                rounded-lg
                ${
                  toast.type === 'success'
                    ? 'bg-lime/10 text-lime'
                    : 'bg-red-500/10 text-red-400'
                }
              `}
            >

              {toast.type === 'success' ? (

                <CheckCircle2
                  className="w-5 h-5"
                />

              ) : (

                <AlertCircle
                  className="w-5 h-5"
                />

              )}

            </div>

            <div>

              <div
                className="
                  font-bold
                  text-sm
                  leading-tight
                  text-white
                  mb-0.5
                "
              >
                {toast.title}
              </div>

              <div
                className="
                  text-xs
                  text-muted
                  leading-tight
                "
              >
                {toast.sub}
              </div>

            </div>

          </motion.div>

        )}

        {/* ====================================================
            AUTH MODAL
        ===================================================== */}

        {isAuthModalOpen && (

          <div
            className="
              fixed
              inset-0
              z-[100]
              flex
              items-center
              justify-center
              p-6
            "
          >

            {/* BACKDROP */}

            <motion.div

              initial={{
                opacity: 0,
              }}

              animate={{
                opacity: 1,
              }}

              exit={{
                opacity: 0,
              }}

              onClick={() =>
                setIsAuthModalOpen(false)
              }

              className="
                absolute
                inset-0
                bg-navy/90
                backdrop-blur-md
              "
            />

            {/* MODAL */}

            <motion.div

              initial={{
                opacity: 0,
                scale: 0.95,
                y: 20,
              }}

              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}

              exit={{
                opacity: 0,
                scale: 0.95,
                y: 20,
              }}

              className="
                relative
                bg-navy-2
                border
                border-lime/20
                w-full
                max-w-md
                rounded-2xl
                p-8
                shadow-2xl
                overflow-hidden
              "
            >

              {/* CLOSE */}

              <button

                onClick={() =>
                  setIsAuthModalOpen(false)
                }

                className="
                  absolute
                  top-4
                  right-4
                  p-2
                  text-muted
                  hover:text-white
                "
              >

                <X
                  className="w-5 h-5"
                />

              </button>

              {/* TITLE */}

              <h3
                className="
                  font-playfair
                  text-2xl
                  font-bold
                  mb-2
                "
              >

                {authMode === 'login'
                  ? 'Login'
                  : 'Create Account'}

              </h3>

              {/* FORM */}

              <form
                onSubmit={handleAuth}
                className="
                  space-y-4
                  mt-8
                "
              >

                {/* USERNAME */}

                <div>

                  <label
                    className="
                      block
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-widest
                      text-muted
                      mb-2
                    "
                  >
                    Username
                  </label>

                  <input

                    type="text"

                    required

                    value={
                      authForm.username
                    }

                    onChange={(e) =>
                      setAuthForm({
                        ...authForm,
                        username:
                          e.target.value,
                      })
                    }

                    className="
                      w-full
                      bg-white/5
                      border
                      border-white/10
                      rounded-lg
                      px-4
                      py-3
                      outline-none
                      focus:border-lime/50
                      transition-all
                      text-sm
                    "
                  />

                </div>

                {/* PASSWORD */}

                <div>

                  <label
                    className="
                      block
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-widest
                      text-muted
                      mb-2
                    "
                  >
                    Password
                  </label>

                  <input

                    type="password"

                    required

                    value={
                      authForm.password
                    }

                    onChange={(e) =>
                      setAuthForm({
                        ...authForm,
                        password:
                          e.target.value,
                      })
                    }

                    className="
                      w-full
                      bg-white/5
                      border
                      border-white/10
                      rounded-lg
                      px-4
                      py-3
                      outline-none
                      focus:border-lime/50
                      transition-all
                      text-sm
                    "
                  />

                </div>

                {/* SUBMIT */}

                <button

                  type="submit"

                  className="
                    w-full
                    bg-lime
                    text-navy
                    py-4
                    rounded-xl
                    font-bold
                    mt-4
                    hover:bg-lime-2
                    transition-all
                  "
                >

                  {authMode === 'login'
                    ? 'Login'
                    : 'Register'}

                </button>

                {/* SWITCH MODE */}

                <p
                  className="
                    text-center
                    text-sm
                    text-muted
                    mt-4
                  "
                >

                  {authMode === 'login'
                    ? "Don't have an account? "
                    : "Already have an account? "}

                  <button

                    type="button"

                    onClick={() =>
                      setAuthMode(
                        authMode === 'login'
                          ? 'register'
                          : 'login',
                      )
                    }

                    className="
                      text-lime
                      hover:underline
                    "
                  >

                    {authMode === 'login'
                      ? 'Register'
                      : 'Login'}

                  </button>

                </p>

              </form>

            </motion.div>

          </div>

        )}

      </AnimatePresence>

    </div>
  );
}
