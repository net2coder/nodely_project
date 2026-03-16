const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Auth page
router.get('/', (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  const mode = req.query.mode || 'login';
  res.render('auth', { 
    title: mode === 'signup' ? 'Sign Up' : 'Sign In',
    mode,
    error: null
  });
});

// Email login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return res.render('auth', { 
        title: 'Sign In',
        mode: 'login',
        error: error.message
      });
    }
    
    req.session.access_token = data.session.access_token;
    req.session.refresh_token = data.session.refresh_token;
    
    res.redirect('/dashboard');
  } catch (err) {
    res.render('auth', { 
      title: 'Sign In',
      mode: 'login',
      error: 'An error occurred'
    });
  }
});

// Email signup
router.post('/signup', async (req, res) => {
  const { email, password, fullName } = req.body;
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    
    if (error) {
      return res.render('auth', { 
        title: 'Sign Up',
        mode: 'signup',
        error: error.message
      });
    }
    
    if (data.session) {
      req.session.access_token = data.session.access_token;
      req.session.refresh_token = data.session.refresh_token;
      return res.redirect('/dashboard');
    }
    
    res.render('auth', { 
      title: 'Sign Up',
      mode: 'login',
      error: null,
      success: 'Account created! Please check your email to verify.'
    });
  } catch (err) {
    res.render('auth', { 
      title: 'Sign Up',
      mode: 'signup',
      error: 'An error occurred'
    });
  }
});

// Phone login - send OTP
router.post('/phone-login', async (req, res) => {
  let { phone } = req.body;
  
  // Format to E.164 for India
  phone = phone.replace(/\D/g, '');
  if (phone.length === 10) {
    phone = '+91' + phone;
  } else if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }
  
  try {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    
    if (error) {
      return res.json({ success: false, error: error.message });
    }
    
    res.json({ success: true, phone });
  } catch (err) {
    res.json({ success: false, error: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { phone, token } = req.body;
  
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms'
    });
    
    if (error) {
      return res.json({ success: false, error: error.message });
    }
    
    req.session.access_token = data.session.access_token;
    req.session.refresh_token = data.session.refresh_token;
    
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: 'Failed to verify OTP' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL}/auth/reset-password`
    });
    
    if (error) {
      return res.json({ success: false, error: error.message });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: 'Failed to send reset email' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
