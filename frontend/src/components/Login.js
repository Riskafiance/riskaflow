import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Failed:", error);
      alert("Failed to log in with Google. Please try again.");
      setIsLoading(false);
    }
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row', backgroundColor: '#f8fafc', fontFamily: '"Inter", sans-serif' }}>
      
      {/* Left Side - Branding */}
      <div style={{
        flex: isMobile ? 'none' : 1,
        background: 'linear-gradient(135deg, #023c34 0%, #065f46 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: isMobile ? '40px 28px 32px 28px' : '60px',
        color: 'white',
      }}>
        <div style={{ maxWidth: isMobile ? '100%' : '500px', margin: '0 auto' }}>
          <div style={{ width: '52px', height: '52px', backgroundColor: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857', fontSize: '28px', fontWeight: '900', marginBottom: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            R
          </div>
          <h1 style={{ fontSize: isMobile ? '28px' : '48px', fontWeight: '900', margin: '0 0 14px 0', letterSpacing: '-0.03em', lineHeight: '1.15' }}>
            Run your business with confidence.
          </h1>
          <p style={{ fontSize: isMobile ? '15px' : '18px', color: '#a7f3d0', lineHeight: '1.6', fontWeight: '400', margin: 0 }}>
            RiskaFlow is the all-in-one financial operating system. Manage clients, send professional invoices, and get paid faster.
          </p>
        </div>
      </div>

      {/* Right Side - Login Box */}
      <div style={{
        flex: isMobile ? 'none' : 1,
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '32px 20px' : '40px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'white',
          padding: isMobile ? '32px 24px' : '50px 40px',
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #f1f5f9',
          boxSizing: 'border-box',
        }}>
          <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Welcome back
          </h2>
          <p style={{ color: '#64748b', fontSize: '15px', margin: '0 0 32px 0' }}>
            Log in or create an account to access your workspace.
          </p>

          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              width: '100%',
              backgroundColor: 'white',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 20px',
              fontSize: '16px',
              fontWeight: '700',
              color: '#334155',
              cursor: isLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              boxSizing: 'border-box',
              minHeight: '52px',
            }}
            onMouseOver={(e) => { if(!isLoading) { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; } }}
            onMouseOut={(e) => { if(!isLoading) { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}
          >
            {isLoading ? 'Signing in...' : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '28px', marginBottom: 0 }}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;