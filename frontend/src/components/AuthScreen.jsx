import { useEffect, useState } from 'react';
import { Mail, KeyRound, Loader2, Lock, UserPlus, User } from 'lucide-react';

export default function AuthScreen({ onRequestOtp, onVerifyOtp, onSignup, onLogin, busy }) {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [authMethod, setAuthMethod] = useState('otp'); // 'otp' or 'password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const pending = localStorage.getItem('pendingEmail') || localStorage.getItem('authEmail');
    if (pending) {
      setEmail(pending);
    }
  }, []);

  const handleRequestOtp = (evt) => {
    evt.preventDefault();
    if (!email) return;
    localStorage.setItem('pendingEmail', email);
    onRequestOtp(email);
  };

  const handleVerifyOtp = (evt) => {
    evt.preventDefault();
    if (!email || !code) return;
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      alert('Please enter a valid 6-digit OTP code');
      return;
    }
    localStorage.setItem('pendingEmail', email);
    onVerifyOtp({ email, code: cleanCode });
  };

  const handlePasswordLogin = (evt) => {
    evt.preventDefault();
    if (!email || !password) return;
    onLogin({ email, password });
  };

  const handleSignup = (evt) => {
    evt.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    onSignup({ email, password, full_name: fullName || undefined });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-slate-100">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">Welcome to AssetFlow</h1>
          <p className="text-slate-600">
            Manage assets, maintenance, and procurement in one place.
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="bg-white shadow-xl rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setCode('');
                setPassword('');
              }}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                mode === 'signin'
                  ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setCode('');
                setPassword('');
              }}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                mode === 'signup'
                  ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="p-8 space-y-6">
            {mode === 'signin' ? (
              <>
                {/* Auth Method Tabs */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('otp');
                      setCode('');
                      setPassword('');
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
                      authMethod === 'otp'
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    OTP Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('password');
                      setCode('');
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
                      authMethod === 'password'
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Password Login
                  </button>
                </div>

                {authMethod === 'otp' ? (
                  <>
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 uppercase mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                          <input
                            type="email"
                            className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white py-3 text-sm font-semibold shadow-sm transition disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        Send OTP
                      </button>
                    </form>

                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 uppercase mb-2">
                          One-Time Password
                        </label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="6-digit code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={busy || !code}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white py-3 text-sm font-semibold shadow-sm transition disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        Verify & Sign In
                      </button>
                    </form>
                  </>
                ) : (
                  <form onSubmit={handlePasswordLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 uppercase mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 uppercase mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white py-3 text-sm font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      Sign In
                    </button>
                  </form>
                )}
              </>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 uppercase mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 uppercase mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 uppercase mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Password must be at least 6 characters</p>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white py-3 text-sm font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Create Account
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500">
          Need help? Contact your system administrator or support@assetflow.com
        </p>
      </div>
    </div>
  );
}
