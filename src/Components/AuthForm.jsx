import React, { useState } from 'react';
import './AuthForm.css';
import { auth, db } from './firebase/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const AuthForm = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const validatePassword = (password) => {
    // Check for whitespace
    if (/\s/.test(password)) {
      return 'Password cannot contain spaces';
    }
    
    // Check minimum length
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    
    return '';
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    if (isSignup) {
      const error = validatePassword(newPassword);
      setPasswordError(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignup) {
        if (!username.trim()) {
          setErrorMsg('Please enter a username');
          return;
        }

        // Validate password for signup
        const passwordValidationError = validatePassword(password);
        if (passwordValidationError) {
          setErrorMsg(passwordValidationError);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Update profile
        await updateProfile(userCredential.user, { displayName: username });

        // Save to Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email,
          username,
          createdAt: new Date().toISOString(),
        });

        setSuccessMsg('Signup successful! Redirecting...');
        setTimeout(() => navigate('/'), 2000);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg('Login successful! Redirecting...');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      console.error('Error:', error);
      
      // Provide user-friendly error messages
      let friendlyMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already registered. Try logging in instead.';
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/user-not-found') {
        friendlyMessage = 'No account found with this email. Please sign up first.';
      } else if (error.code === 'auth/wrong-password') {
        friendlyMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email or password. Please check your credentials.';
      }
      
      setErrorMsg(friendlyMessage);
    }
  };

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setPasswordError('');
  };

  return (
    <div className={`auth-container ${isSignup ? 'signup-active' : ''}`}>
      <div className="auth-box">
        <div className="form-wrapper">
          <form onSubmit={handleSubmit}>
            <h2>{isSignup ? 'Sign Up' : 'Login'}</h2>

            {successMsg && <p className="success-message">{successMsg}</p>}
            {errorMsg && <p className="error-message">{errorMsg}</p>}

            {isSignup && (
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    clearMessages();
                  }}
                  required
                  className="auth-input"
                />
              </div>
            )}

            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearMessages();
                }}
                required
                className="auth-input"
              />
            </div>

            <div className="input-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                required
                className={`auth-input ${passwordError ? 'error' : ''}`}
              />
              {passwordError && <span className="password-error">{passwordError}</span>}
            </div>

            <button 
              type="submit" 
              className="auth-button"
              disabled={isSignup && passwordError}
            >
              {isSignup ? 'Sign Up' : 'Login'}
            </button>
          </form>
        </div>

        <div className="side-toggle">
          <p>{isSignup ? 'Already have an account?' : "Don't have an account?"}</p>
          <button 
            onClick={() => {
              setIsSignup(!isSignup);
              clearMessages();
              setPassword('');
              setEmail('');
              setUsername('');
            }}
            className="toggle-button"
          >
            {isSignup ? 'Login' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;