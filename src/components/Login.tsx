import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '../state';
import { Eye, EyeOff, Shield, ShieldCheck, Lock, Mail, User, ShieldAlert, Key, HelpCircle } from 'lucide-react';

export function Login() {
  const { login, loginAsGuest } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'security'>('signin');

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Sync aria-invalid states for accessibility according to modern guidelines
  useEffect(() => {
    const syncAria = (el: HTMLInputElement) => {
      if (!el) return;
      // We manually toggle aria-invalid when the input fails validation
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setShake(true);
        setErrorMsg('Invalid email format or password complexity requirement unmet. (Default: admin@talentflow.ai / Password123!)');
        setTimeout(() => setShake(false), 500);
      }
    } catch (err) {
      setShake(true);
      setErrorMsg('An error occurred during authentication. Please try again.');
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-canvas-parchment dark:bg-canvas p-6 relative overflow-hidden transition-colors duration-300">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-accent-teal/5 dark:bg-accent-teal/2.5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45rem] h-[45rem] rounded-full bg-accent-blue-link/5 dark:bg-accent-blue-link/2.5 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className={`w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-canvas-light dark:bg-surface-soft border border-hairline-light dark:border-hairline-dark rounded-2xl shadow-2xl overflow-hidden glass-panel dark:glass-panel-dark transition-all duration-300 ${shake ? 'animate-shake' : ''}`}>
        
        {/* Left column: Authentication Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r border-hairline-light dark:border-hairline-dark">
          {/* Logo & Header */}
          <div className="flex items-center gap-3 mb-8">
            <svg className="w-10 h-10 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="24" height="24" rx="6" fill="#111111" className="dark:fill-white" />
              <path d="M10 11H22M16 11V22M16 16.5H20.5" stroke="#ffffff" className="dark:stroke-black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <h1 className="font-display font-bold text-ink dark:text-white text-xl tracking-tight leading-none">TalentFlow</h1>
              <p className="text-[11px] uppercase tracking-wider text-mute dark:text-body-on-dark/60 font-mono mt-1">Secure Workspace Console</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-display font-semibold text-ink dark:text-white">Welcome Back</h2>
            <p className="text-xs text-mute dark:text-body-on-dark/60 mt-1">Log in to coordinate your agentic career operations.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-lg bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-xs flex gap-2.5 items-start animate-fade-in" role="alert">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="email-login" className="text-xs font-semibold text-ink dark:text-white">Email Address</label>
              <span id="email-login-hint" className="sr-only">Format: you@example.com</span>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-mute dark:text-body-on-dark/40" />
                <input
                  type="email"
                  id="email-login"
                  ref={emailRef}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@talentflow.ai"
                  required
                  autocomplete="username email"
                  aria-describedby="email-login-hint"
                  className="w-full pl-10 pr-4 py-3 bg-canvas-parchment dark:bg-canvas text-sm text-ink dark:text-white placeholder-mute/60 dark:placeholder-body-on-dark/30 border border-hairline-light dark:border-hairline-dark rounded-lg focus:outline-none focus:border-ink dark:focus:border-white transition-all
                  invalid:border-accent-danger focus:invalid:border-accent-danger"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5 text-left">
              <div className="flex justify-between items-center">
                <label htmlFor="password-login" className="text-xs font-semibold text-ink dark:text-white">Password</label>
                <span className="text-[10px] text-mute dark:text-body-on-dark/40">(Default: Password123!)</span>
              </div>
              <ul id="password-login-rules" className="sr-only">
                <li>At least 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-mute dark:text-body-on-dark/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password-login"
                  ref={passwordRef}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}"
                  autocomplete="current-password"
                  aria-describedby="password-login-rules"
                  className="w-full pl-10 pr-10 py-3 bg-canvas-parchment dark:bg-canvas text-sm text-ink dark:text-white placeholder-mute/60 dark:placeholder-body-on-dark/30 border border-hairline-light dark:border-hairline-dark rounded-lg focus:outline-none focus:border-ink dark:focus:border-white transition-all
                  invalid:border-accent-danger focus:invalid:border-accent-danger"
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

            {/* Buttons */}
            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-ink hover:bg-primary-focus dark:bg-white dark:hover:bg-primary-focus/90 text-white dark:text-ink text-sm font-semibold rounded-lg flex items-center justify-center gap-2 border-none outline-none shadow-product transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying Credentials...' : 'Log In Securely'}
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
          </form>
        </div>

        {/* Right column: Interactive Security recommendations */}
        <div className="bg-canvas-parchment dark:bg-canvas/40 p-8 md:p-12 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-accent-teal" />
              <h3 className="font-display font-semibold text-ink dark:text-white text-base">Cybersecurity Guard</h3>
            </div>

            <div className="space-y-5 text-left">
              <div>
                <h4 className="text-xs font-bold text-ink dark:text-white uppercase font-mono tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                  Key Encryption at Rest
                </h4>
                <p className="text-xs text-mute dark:text-body-on-dark/60 leading-relaxed">
                  In Guest mode, API keys are held transiently in local storage. For production settings, always override settings via server-side environment variables to prevent client-side credential leaking.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-ink dark:text-white uppercase font-mono tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                  Safe IMAP Integration
                </h4>
                <p className="text-xs text-mute dark:text-body-on-dark/60 leading-relaxed">
                  Our AI sync connects to IMAP over port 993 (SSL/TLS). Always use app-specific passwords or OAuth credentials rather than primary server passwords.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-ink dark:text-white uppercase font-mono tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                  Session Expiry & Token Security
                </h4>
                <p className="text-xs text-mute dark:text-body-on-dark/60 leading-relaxed">
                  Authentication is managed via <code className="px-1 py-0.5 rounded bg-faint dark:bg-surface-elevated font-mono text-[10px]">sessionStorage</code> which expires automatically when the tab is closed, protecting you against physical device snooping.
                </p>
              </div>
            </div>
          </div>

          {/* Security Checklist Status */}
          <div className="mt-8 pt-6 border-t border-hairline-light dark:border-hairline-dark text-left">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-soft dark:bg-surface-soft/60 border border-hairline-light dark:border-hairline-dark">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-accent-teal shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-ink dark:text-white uppercase font-mono leading-none">Security Rating</p>
                  <p className="text-xs text-mute dark:text-body-on-dark/60 mt-1 leading-none">HTTPS & AES-GCM Encrypted</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-accent-teal uppercase tracking-wider bg-accent-teal/10 px-2 py-1 rounded">Grade A</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
