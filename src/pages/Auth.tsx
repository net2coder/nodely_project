import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, Eye, EyeOff, Mail, Lock, User, ArrowLeft, Loader2, KeyRound, Phone, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const phoneSchema = z.string()
  .min(10, 'Please enter a valid phone number')
  .refine((val) => {
    const cleaned = val.replace(/\D/g, '');
    return cleaned.length >= 10;
  }, 'Please enter a valid 10-digit phone number');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// Format phone number to E.164 format for India (+91)
const formatPhoneE164 = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  // If already has country code
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  // If starts with 0, remove it
  if (cleaned.startsWith('0')) {
    return `+91${cleaned.slice(1)}`;
  }
  // If 10 digit number, add +91
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return `+${cleaned}`;
};

type AuthMode = 'login' | 'signup' | 'forgot' | 'otp';
type LoginMethod = 'email' | 'phone';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; phone?: string; password?: string }>({});

  const { 
    signIn, 
    signInWithOtp, 
    signInWithPhone, 
    verifyOtp, 
    verifyPhoneOtp, 
    resetPassword, 
    signUp, 
    signUpWithPhone, 
    user 
  } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (mode === 'signup') setAuthMode('signup');
    else if (mode === 'forgot') setAuthMode('forgot');
    else setAuthMode('login');
  }, [mode]);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; phone?: string; password?: string } = {};
    
    if (loginMethod === 'email') {
      try {
        emailSchema.parse(email);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.email = e.errors[0].message;
        }
      }
    } else {
      try {
        phoneSchema.parse(phone);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.phone = e.errors[0].message;
        }
      }
    }

    if (authMode === 'login' && loginMethod === 'email') {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.password = e.errors[0].message;
        }
      }
    }

    if (authMode === 'signup') {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.password = e.errors[0].message;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Email + Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: 'Sign in failed',
          description: 'Invalid email or password. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Phone OTP Login
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formattedPhone = formatPhoneE164(phone);
      const { error } = await signInWithPhone(formattedPhone);
      if (error) {
        toast({
          title: 'Failed to send OTP',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'OTP sent!',
          description: `Check your phone (${formattedPhone}) for the verification code.`,
        });
        setPhone(formattedPhone); // Store formatted phone for verification
        setAuthMode('otp');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setLoading(true);
    try {
      const { error } = loginMethod === 'phone' 
        ? await verifyPhoneOtp(phone, otp)
        : await verifyOtp(email, otp);
      
      if (error) {
        toast({
          title: 'Invalid OTP',
          description: 'Please check your code and try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Welcome!',
          description: 'Redirecting to dashboard...',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
    } catch {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast({
          title: 'Failed to send reset link',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Reset link sent!',
          description: 'Check your email to reset your password.',
        });
        setAuthMode('login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign Up with Email (confirmation via link)
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: 'Account exists',
            description: 'This email is already registered. Please sign in instead.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Sign up failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Account created!',
          description: 'Check your email to confirm your account.',
        });
        setAuthMode('login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign Up with Phone (OTP verification)
  const handlePhoneSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formattedPhone = formatPhoneE164(phone);
      const { error } = await signUpWithPhone(formattedPhone, password, fullName);
      if (error) {
        toast({
          title: 'Sign up failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'OTP sent!',
          description: `Check your phone (${formattedPhone}) for the verification code.`,
        });
        setPhone(formattedPhone); // Store formatted phone for verification
        setAuthMode('otp');
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (authMode) {
      case 'signup': return 'Create your account';
      case 'forgot': return 'Reset password';
      case 'otp': return 'Enter verification code';
      default: return 'Welcome back';
    }
  };

  const getSubtitle = () => {
    switch (authMode) {
      case 'signup': return 'Start managing your IoT devices today';
      case 'forgot': return "We'll send you a password reset link";
      case 'otp': return `Enter the 6-digit code sent to ${loginMethod === 'phone' ? phone : email}`;
      default: return loginMethod === 'email' ? 'Sign in with your email and password' : 'Sign in with your phone number';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="glass-card rounded-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-4">
              <Cpu className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold">NODELY</span>
            </div>
            <h1 className="text-xl font-semibold">{getTitle()}</h1>
            <p className="text-sm text-muted-foreground mt-1">{getSubtitle()}</p>
          </div>

          {/* Login Method Toggle (for login and signup) */}
          {(authMode === 'login' || authMode === 'signup') && (
            <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as LoginMethod)} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="gap-2">
                  <Smartphone className="w-4 h-4" />
                  Mobile
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* OTP Verification Form */}
          {authMode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                type="submit" 
                variant="hero" 
                className="w-full" 
                size="lg"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Verify Code
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => { setAuthMode('login'); setOtp(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            </form>
          )}

          {/* Login Form */}
          {authMode === 'login' && (
            <form onSubmit={loginMethod === 'email' ? handleEmailLogin : handlePhoneLogin} className="space-y-4">
              {loginMethod === 'email' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (India +91)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-12"
                      maxLength={10}
                      required
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                variant="hero" 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {loginMethod === 'phone' ? 'Sending OTP...' : 'Signing in...'}
                  </>
                ) : (
                  loginMethod === 'phone' ? 'Send OTP' : 'Sign In'
                )}
              </Button>

              {loginMethod === 'email' && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setAuthMode('forgot')}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Sign Up Form */}
          {authMode === 'signup' && (
            <form onSubmit={loginMethod === 'email' ? handleEmailSignUp : handlePhoneSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loginMethod === 'email' ? (
                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="signupPhone">Phone Number (India +91)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                    <Input
                      id="signupPhone"
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-12"
                      maxLength={10}
                      required
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="signupPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signupPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <Button 
                type="submit" 
                variant="hero" 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                {loginMethod === 'email' 
                  ? "You'll receive a confirmation email to verify your account."
                  : "You'll receive an OTP to verify your phone number."}
              </p>
            </form>
          )}

          {/* Forgot Password Form */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <Button 
                type="submit" 
                variant="hero" 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            </form>
          )}

          {/* Toggle between login/signup */}
          {authMode !== 'otp' && authMode !== 'forgot' && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Link
                to={authMode === 'signup' ? '/auth' : '/auth?mode=signup'}
                className="text-primary font-medium hover:underline"
              >
                {authMode === 'signup' ? 'Sign in' : 'Sign up'}
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}