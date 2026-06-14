import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '../state';
import { Eye, EyeOff, Shield, ShieldCheck, Lock, Mail, User, ShieldAlert, Check } from 'lucide-react';

export function Login() {
  const { login, loginAsGuest } = useAppState();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Sign In Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Sign Up Form States
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  
  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const signupEmailRef = useRef<HTMLInputElement>(null);
  const signupPasswordRef = useRef<HTMLInputElement>(null);

  // Password Rules validation checkers
  const passLengthVal = signupPassword.length >= 8;
  const passUpperVal = /[A-Z]/.test(signupPassword);
  const passNumberVal = /[0-9]/.test(signupPassword);
  const passSpecialVal = /[\W_]/.test(signupPassword);
  const passIsComplex = passLengthVal && passUpperVal && passNumberVal && passSpecialVal;

  // Sync aria-invalid states for accessibility
  useEffect(() => {
    const syncAria = (el: HTMLInputElement) => {
      if (!el) return;
      const isInvalid = el.matches(':user-invalid') || el.classList.contains('user-invalid-fallback');
      el.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (target && (target.type === 'email' || target.type === 'password')) {
        syncAria(target);
      }
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target && target.hasAttribute('aria-invalid')) {
        syncAria(target);
      }
    };

    document.addEventListener('blur', handleBlur, true);
    document.addEventListener('input', handleInput);

    return () => {
      document.removeEventListener('blur', handleBlur, true);
      document.removeEventListener('input', handleInput);
    };
  }, []);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setShake(true);
        setErrorMsg('Invalid email or password. Verify complexity constraints. (Default: admin@talentflow.ai / Password123!)');
        setTimeout(() => setShake(false), 500);
      }
    } catch (err) {
      setShake(true);
      setErrorMsg('Authentication error. Please try again.');
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Email format validate
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail)) {
      setErrorMsg('Please enter a valid email address.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    // Password strength validate
    if (!passIsComplex) {
      setErrorMsg('Password must satisfy all complexity constraints.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    // Password matches validate
    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    try {
      // Load current local accounts
      const savedAccounts = localStorage.getItem('tf_accounts');
      const accounts = savedAccounts ? JSON.parse(savedAccounts) : [];

      // Check duplicate
      const duplicate = accounts.find((acc: any) => acc.email.toLowerCase() === signupEmail.toLowerCase());
      if (duplicate) {
        setErrorMsg('An account with this email address already exists.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      // Add and save account
      const newAccount = { email: signupEmail, password: signupPassword };
      localStorage.setItem('tf_accounts', JSON.stringify([...accounts, newAccount]));

      setSuccessMsg('Account created successfully! You can now sign in using your credentials.');
      setMode('signin');
      setEmail(signupEmail);
      setPassword('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
    } catch (err) {
      setErrorMsg('Failed to register account. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-canvas-parchment dark:bg-canvas p-6 relative overflow-hidden transition-colors duration-300">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-accent-teal/5 dark:bg-accent-teal/2.5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45rem] h-[45rem] rounded-full bg-accent-blue-link/5 dark:bg-accent-blue-link/2.5 blur-[120px] pointer-events-none" />

      {/* Clean Centered Auth Card */}
      <div className={`w-full max-w-md bg-canvas-light dark:bg-surface-soft border border-hairline-light dark:border-hairline-dark rounded-2xl shadow-2xl p-8 glass-panel dark:glass-panel-dark transition-all duration-300 ${shake ? 'animate-shake' : ''}`}>
        
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <svg className="w-12 h-12 mb-3" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="24" height="24" rx="6" fill="#111111" className="dark:fill-white" />
            <path d="M10 11H22M16 11V22M16 16.5H20.5" stroke="#ffffff" className="dark:stroke-black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="font-display font-bold text-ink dark:text-white text-2xl tracking-tight leading-none">TalentFlow</h1>
          <p className="text-[11px] uppercase tracking-wider text-mute dark:text-body-on-dark/60 font-mono mt-1.5">AI Career Workspace</p>
        </div>

        {/* Action Header */}
        <div className="mb-6 text-center">
          <h2 className="text-lg font-display font-semibold text-ink dark:text-white">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-xs text-mute dark:text-body-on-dark/60 mt-1">
            {mode === 'signin' 
              ? 'Log in to coordinate your agentic career operations.' 
              : 'Sign up to build your secure career workspace database.'}
          </p>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-xs flex gap-2.5 items-start animate-fade-in" role="alert">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-lg bg-accent-teal/10 border border-accent-teal/20 text-accent-teal text-xs flex gap-2.5 items-start animate-fade-in" role="alert">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Mode switcher layouts */}
        {mode === 'signin' ? (
          <form onSubmit={handleSignInSubmit} className="space-y-5" noValidate>
            {/* Email Input */}
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="email-signin" className="text-xs font-semibold text-ink dark:text-white">Email Address</label>
              <span id="email-signin-hint" className="sr-only">Format: you@example.com</span>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-mute dark:text-body-on-dark/40" />
                <input
                  type="email"
                  id="email-signin"
                  ref={emailRef}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@talentflow.ai"
                  required
                  autocomplete="username email"
                  aria-describedby="email-signin-hint"
                  className="w-full pl-10 pr-4 py-3 bg-canvas-parchment dark:bg-canvas text-sm text-ink dark:text-white placeholder-mute/60 dark:placeholder-body-on-dark/30 border border-hairline-light dark:border-hairline-dark rounded-lg focus:outline-none focus:border-ink dark:focus:border-white transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5 text-left">
              <div className="flex justify-between items-center">
                <label htmlFor="password-signin" className="text-xs font-semibold text-ink dark:text-white">Password</label>
                <span className="text-[10px] text-mute dark:text-body-on-dark/40">(Default: Password123!)</span>
              </div>
              <ul id="password-signin-rules" className="sr-only">
                <li>At least 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-mute dark:text-body-on-dark/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password-signin"
                  ref={passwordRef}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}"
                  autocomplete="current-password"
                  aria-describedby="password-signin-rules"
                  className="w-full pl-10 pr-10 py-3 bg-canvas-parchment dark:bg-canvas text-sm text-ink dark:text-white placeholder-mute/60 dark:placeholder-body-on-dark/30 border border-hairline-light dark:border-hairline-dark rounded-lg focus:outline-none focus:border-ink dark:focus:border-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-3.5 p-0.5 hover:text-ink dark:hover:text-white text-mute bg-transparent border-none outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 text-left">
              <input 
                type="checkbox" 
                id="remember" 
                className="w-4 h-4 rounded border-hairline-light dark:border-hairline-dark text-ink dark:text-white focus:ring-0 focus:ring-offset-0 cursor-pointer" 
              />
              <label htmlFor="remember" className="text-xs text-mute dark:text-body-on-dark/60 select-none cursor-pointer">Remember this device</label>
            </div>

            {/* Submit Action */}
            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-ink hover:bg-primary-focus dark:bg-white dark:hover:bg-primary-focus/90 text-on-primary text-sm font-semibold rounded-lg flex items-center justify-center gap-2 border-none outline-none shadow-product transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying Credentials...' : 'Login'}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-hairline-light dark:border-hairline-dark" />
                <span className="flex-shrink mx-4 text-[10px] text-mute dark:text-body-on-dark/40 uppercase font-mono tracking-wider">or</span>
                <div className="flex-grow border-t border-hairline-light dark:border-hairline-dark" />
              </div>

              <button
                type="button"
                onClick={loginAsGuest}
                className="w-full py-3 bg-surface-soft hover:bg-faint dark:bg-canvas/50 dark:hover:bg-canvas text-ink dark:text-white text-sm font-semibold rounded-lg border border-hairline-light dark:border-hairline-dark outline-none transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4 text-mute dark:text-body-on-dark/40" />
                Continue as Guest (Read-Only Mode)
              </button>
            </div>

            {/* Toggle Sign Up */}
            <div className="text-xs text-center mt-6 text-mute dark:text-body-on-dark/60">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className="text-ink dark:text-white font-bold hover:underline bg-transparent border-none outline-none cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUpSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="email-signup" className="text-xs font-semibold text-ink dark:text-white">Email Address</label>
              <span id="email-signup-hint" className="sr-only">Format: you@example.com</span>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-mute dark:text-body-on-dark/40" />
                <input
                  type="email"
                  id="email-signup"
                  ref={signupEmailRef}
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autocomplete="username email"
                  aria-describedby="email-signup-hint"
                  className="w-full pl-10 pr-4 py-3 bg-canvas-parchment dark:bg-canvas text-sm text-ink dark:text-white placeholder-mute/60 dark:placeholder-body-on-dark/30 border border-hairline-light dark:border-hairline-dark rounded-lg focus:outline-none focus:border-ink dark:focus:border-white transition-all"
                />
              </div>
            </div>

            {/* Visual Rules Checklist (Structured guidance) */}
            <div className="p-3 bg-surface-soft dark:bg-canvas border border-hairline-light dark:border-hairline-dark rounded-lg text-left">
              <span className="text-[10px] uppercase font-mono font-bold text-mute block mb-2">Password Requirements</span>
              <ul className="grid grid-cols-2 gap-2 font-sans text-[10px]">
                <li className={`flex items-center gap-1.5 ${passLengthVal ? 'text-accent-teal font-semibold' : 'text-mute'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${passLengthVal ? 'bg-accent-teal/10' : 'bg-faint dark:bg-surface-elevated'}`}>
                    {passLengthVal && <Check className="w-2.5 h-2.5" />}
                  </span>
                  Min 8 Characters
                </li>
                <li className={`flex items-center gap-1.5 ${passUpperVal ? 'text-accent-teal font-semibold' : 'text-mute'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${passLengthVal ? 'bg-accent-teal/10' : 'bg-faint dark:bg-surface-elevated'}`}>
                    {passUpperVal && <Check className="w-2.5 h-2.5" />}
                  </span>
                  1 Uppercase Letter
                </li>
                <li className={`flex items-center gap-1.5 ${passNumberVal ? 'text-accent-teal font-semibold' : 'text-mute'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${passLengthVal ? 'bg-accent-teal/10' : 'bg-faint dark:bg-surface-elevated'}`}>
                    {passNumberVal && <Check className="w-2.5 h-2.5" />}
                  </span>
                  1 Number
                </li>
                <li className={`flex items-center gap-1.5 ${passSpecialVal ? 'text-accent-teal font-semibold' : 'text-mute'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${passLengthVal ? 'bg-accent-teal/10' : 'bg-faint dark:bg-surface-elevated'}`}>
                    {passSpecialVal && <Check className="w-2.5 h-2.5" />}
                  </span>
                  1 Special Character
                </li>
              </ul>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="password-signup" className="text-xs font-semibold text-ink dark:text-white">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-mute dark:text-body-on-dark/40" />
                <input
                  type={showSignupPassword ? "text" : "password"}
                  id="password-signup"
                  ref={signupPasswordRef}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Create Password"
                  required
                  pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}"
                  autocomplete="new-password"
                  className="w-full pl-10 pr-10 py-3 bg-canvas-parchment dark:bg-canvas text-sm text-ink dark:text-white placeholder-mute/60 dark:placeholder-body-on-dark/30 border border-hairline-light dark:border-hairline-dark rounded-lg focus:outline-none focus:border-ink dark:focus:border-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  aria-label={showSignupPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-3.5 p-0.5 hover:text-ink dark:hover:text-white text-mute bg-transparent border-none outline-none cursor-pointer"
                >
                  {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="confirm-signup" className="text-xs font-semibold text-ink dark:text-white">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-mute dark:text-body-on-dark/40" />
                <input
                  type="password"
                  id="confirm-signup"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="Re-enter Password"
                  required
                  autocomplete="new-password"
                  className="w-full pl-10 pr-4 py-3 bg-canvas-parchment dark:bg-canvas text-sm text-ink dark:text-white placeholder-mute/60 dark:placeholder-body-on-dark/30 border border-hairline-light dark:border-hairline-dark rounded-lg focus:outline-none focus:border-ink dark:focus:border-white transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-ink hover:bg-primary-focus dark:bg-white dark:hover:bg-primary-focus/90 text-on-primary text-sm font-semibold rounded-lg flex items-center justify-center gap-2 border-none outline-none shadow-product transition-all cursor-pointer"
              >
                Register & Create Account
              </button>
            </div>

            {/* Toggle Sign In */}
            <div className="text-xs text-center mt-6 text-mute dark:text-body-on-dark/60">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                }}
                className="text-ink dark:text-white font-bold hover:underline bg-transparent border-none outline-none cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
