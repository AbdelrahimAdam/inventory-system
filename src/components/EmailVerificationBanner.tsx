// src/components/EmailVerificationBanner.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const EmailVerificationBanner: React.FC = () => {
  const { user, firebaseUser, sendEmailVerification, resendVerificationEmail, reloadUser } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendVerification = async () => {
    if (!firebaseUser) return;
    
    setIsSending(true);
    setMessage(null);
    
    try {
      const result = await sendEmailVerification();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Verification email sent! Check your inbox and spam folder.' });
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to send verification email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while sending verification email' });
    } finally {
      setIsSending(false);
    }
  };

  const handleResendVerification = async () => {
    setIsSending(true);
    setMessage(null);
    
    const result = await resendVerificationEmail();
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Verification email sent! Check your inbox and spam folder.' });
    } else {
      setMessage({ type: 'error', text: result.message || 'Failed to send verification email' });
    }
    
    setIsSending(false);
  };

  const handleRefreshStatus = async () => {
    await reloadUser();
  };

  // Don't show if user is verified or no user
  if (!user || !firebaseUser || firebaseUser.emailVerified) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Verify your email address
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            Please verify your email address ({user.email}) to access all features.
            Check your inbox for the verification link.
          </p>
          
          {message && (
            <div className={`mt-2 flex items-center text-sm ${
              message.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {message.text}
            </div>
          )}
          
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              onClick={handleSendVerification}
              disabled={isSending}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              {isSending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Verification Email
            </button>
            
            <button
              onClick={handleResendVerification}
              disabled={isSending}
              className="inline-flex items-center px-3 py-2 border border-yellow-300 text-sm leading-4 font-medium rounded-md text-yellow-700 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Resend Email
            </button>
            
            <button
              onClick={handleRefreshStatus}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;