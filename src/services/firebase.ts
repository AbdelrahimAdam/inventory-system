// src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  sendEmailVerification, 
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  sendPasswordResetEmail
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRMOfDZVNyg2ns_v2m0HwKd9ALgUfB_6Q",
  authDomain: "perfume-inventory-prod.firebaseapp.com",
  projectId: "perfume-inventory-prod",
  storageBucket: "perfume-inventory-prod.firebasestorage.app",
  messagingSenderId: "1034944478855",
  appId: "1:1034944478855:web:c9970184845885b223c222",
  measurementId: "G-ZYH6ZDDT2M",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Cloud Functions Service
class CloudFunctionsService {
  /**
   * Generic function to call any Cloud Function
   */
  static async callFunction(functionName: string, data: any) {
    try {
      const functionCall = httpsCallable(functions, functionName);
      const result = await functionCall(data);
      return result.data;
    } catch (error: any) {
      console.error(`Error calling ${functionName}:`, error);
      throw new Error(error.message || `Failed to call ${functionName}`);
    }
  }

  /**
   * Set user role and features (superadmin only)
   */
  static async setUserRoleAndFeatures(targetUserId: string, role: string, features: any) {
    return this.callFunction('setUserRoleAndFeatures', { targetUserId, role, features });
  }

  /**
   * Upsert inventory item
   */
  static async upsertItem(itemData: any) {
    return this.callFunction('upsertItem', itemData);
  }

  /**
   * Transfer between warehouses
   */
  static async transferBetweenWarehouses(transferData: any) {
    return this.callFunction('transferBetweenWarehouses', transferData);
  }

  /**
   * External issue
   */
  static async issueExternal(issueData: any) {
    return this.callFunction('issueExternal', issueData);
  }

  /**
   * Approve movement
   */
  static async approveMovement(movementId: string, notes?: string) {
    return this.callFunction('approveMovement', { movementId, notes });
  }

  /**
   * Create factory return movement
   */
  static async createFactoryReturnMovement(returnData: any) {
    return this.callFunction('createFactoryReturnMovement', returnData);
  }
}

// Email Verification Service
class EmailVerificationService {
  /**
   * Send email verification to current user
   */
  static async sendVerificationEmail(): Promise<{ success: boolean; message?: string }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { success: false, message: "No authenticated user found" };
      }

      if (user.emailVerified) {
        return { success: false, message: "Email is already verified" };
      }

      // First, try without any custom URL (most reliable approach)
      console.log('Attempting to send verification email without custom URL...');
      await sendEmailVerification(user);
      
      return { success: true, message: "Verification email sent successfully. Please check your inbox." };
    } catch (error: any) {
      console.error("Email verification error:", error);
      
      let message = "Failed to send verification email";
      switch (error.code) {
        case 'auth/too-many-requests':
          message = "Too many verification attempts. Please try again later.";
          break;
        case 'auth/user-not-found':
          message = "User account not found.";
          break;
        case 'auth/invalid-email':
          message = "Invalid email address.";
          break;
        case 'auth/network-request-failed':
          message = "Network error. Please check your connection and try again.";
          break;
        case 'auth/unauthorized-continue-uri':
          message = "Verification service temporarily unavailable. Please try again later.";
          break;
        default:
          message = error.message || "An unexpected error occurred";
      }
      
      return { success: false, message };
    }
  }

  /**
   * Alternative method that tries multiple approaches
   */
  static async sendVerificationEmailWithFallback(): Promise<{ success: boolean; message?: string }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { success: false, message: "No authenticated user found" };
      }

      if (user.emailVerified) {
        return { success: false, message: "Email is already verified" };
      }

      // Try different approaches in sequence
      const approaches = [
        // Approach 1: No parameters (most basic)
        () => sendEmailVerification(user),
        
        // Approach 2: Only handleCodeInApp
        () => sendEmailVerification(user, { handleCodeInApp: true }),
        
        // Approach 3: With Firebase's own domain as continue URL
        () => sendEmailVerification(user, {
          url: 'https://perfume-inventory-prod.firebaseapp.com/__/auth/action',
          handleCodeInApp: true
        })
      ];

      for (let i = 0; i < approaches.length; i++) {
        try {
          console.log(`Trying email verification approach ${i + 1}...`);
          await approaches[i]();
          return { success: true, message: "Verification email sent successfully. Please check your inbox." };
        } catch (approachError: any) {
          console.log(`Approach ${i + 1} failed:`, approachError.message);
          // Continue to next approach if this one fails
          if (i === approaches.length - 1) {
            // If this was the last approach, throw the error
            throw approachError;
          }
        }
      }

      // This should never be reached, but just in case
      throw new Error('All verification approaches failed');

    } catch (error: any) {
      console.error("All email verification approaches failed:", error);
      
      let message = "Failed to send verification email";
      switch (error.code) {
        case 'auth/too-many-requests':
          message = "Too many verification attempts. Please try again later.";
          break;
        case 'auth/user-not-found':
          message = "User account not found.";
          break;
        case 'auth/invalid-email':
          message = "Invalid email address.";
          break;
        case 'auth/network-request-failed':
          message = "Network error. Please check your connection and try again.";
          break;
        default:
          message = "Unable to send verification email. Please contact support.";
      }
      
      return { success: false, message };
    }
  }

  /**
   * Verify email with action code from verification link
   */
  static async verifyEmail(oobCode: string): Promise<{ success: boolean; message?: string; user?: any }> {
    try {
      await applyActionCode(auth, oobCode);
      
      // Reload user to get updated verification status
      const user = auth.currentUser;
      if (user) {
        await user.reload();
      }
      
      return { 
        success: true, 
        message: "Email verified successfully! You can now access all features.",
        user: user
      };
    } catch (error: any) {
      console.error("Email verification error:", error);
      
      let message = "Failed to verify email";
      switch (error.code) {
        case 'auth/invalid-action-code':
          message = "This verification link is invalid or has expired.";
          break;
        case 'auth/user-disabled':
          message = "This user account has been disabled.";
          break;
        case 'auth/user-not-found':
          message = "User account not found.";
          break;
        case 'auth/expired-action-code':
          message = "This verification link has expired. Please request a new one.";
          break;
        default:
          message = error.message || "An unexpected error occurred";
      }
      
      return { success: false, message };
    }
  }

  /**
   * Check if user's email is verified
   */
  static isEmailVerified(): boolean {
    const user = auth.currentUser;
    return user ? user.emailVerified : false;
  }

  /**
   * Resend verification email with cooldown check
   */
  static async resendVerificationEmail(lastSentTimestamp?: number): Promise<{ success: boolean; message?: string }> {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, message: "User not authenticated" };
    }

    if (user.emailVerified) {
      return { success: false, message: "Email is already verified" };
    }

    // Cooldown check (2 minutes)
    if (lastSentTimestamp) {
      const cooldown = 2 * 60 * 1000; // 2 minutes
      const timeSinceLast = Date.now() - lastSentTimestamp;
      
      if (timeSinceLast < cooldown) {
        const remainingMinutes = Math.ceil((cooldown - timeSinceLast) / 1000 / 60);
        return { 
          success: false, 
          message: `Please wait ${remainingMinutes} minute(s) before requesting another verification email` 
        };
      }
    }

    // Use the simple approach for resend
    return await this.sendVerificationEmail();
  }
}

// Password Reset Service
class PasswordResetService {
  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Use the simplest approach without custom URLs
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: "Password reset email sent successfully. Please check your inbox." };
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      let message = "Failed to send password reset email";
      switch (error.code) {
        case 'auth/user-not-found':
          message = "No account found with this email address";
          break;
        case 'auth/invalid-email':
          message = "Invalid email address";
          break;
        case 'auth/too-many-requests':
          message = "Too many attempts. Please try again later";
          break;
        case 'auth/network-request-failed':
          message = "Network error. Please check your connection and try again.";
          break;
        default:
          message = error.message || message;
      }
      return { success: false, message };
    }
  }

  /**
   * Verify password reset code
   */
  static async verifyPasswordResetCode(oobCode: string): Promise<{ success: boolean; email?: string; message?: string }> {
    try {
      const email = await verifyPasswordResetCode(auth, oobCode);
      return { success: true, email };
    } catch (error: any) {
      console.error("Password reset code verification error:", error);
      
      let message = "Invalid or expired reset code";
      switch (error.code) {
        case 'auth/expired-action-code':
          message = "This reset link has expired. Please request a new one.";
          break;
        case 'auth/invalid-action-code':
          message = "This reset link is invalid.";
          break;
        case 'auth/user-disabled':
          message = "This user account has been disabled.";
          break;
        case 'auth/user-not-found':
          message = "User account not found.";
          break;
      }
      return { success: false, message };
    }
  }

  /**
   * Confirm password reset with new password
   */
  static async confirmPasswordReset(oobCode: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      return { success: true, message: "Password reset successfully. You can now login with your new password." };
    } catch (error: any) {
      console.error("Password reset confirmation error:", error);
      
      let message = "Failed to reset password";
      switch (error.code) {
        case 'auth/weak-password':
          message = "Password is too weak. Please choose a stronger password with at least 6 characters.";
          break;
        case 'auth/expired-action-code':
          message = "This reset link has expired. Please request a new one.";
          break;
        case 'auth/invalid-action-code':
          message = "This reset link is invalid.";
          break;
        case 'auth/network-request-failed':
          message = "Network error. Please check your connection and try again.";
          break;
        default:
          message = error.message || message;
      }
      return { success: false, message };
    }
  }
}

// Export everything
export { 
  app, 
  analytics, 
  auth, 
  db, 
  storage, 
  functions, 
  httpsCallable,
  EmailVerificationService,
  PasswordResetService,
  CloudFunctionsService
};

// Export the callFunction method for backward compatibility
export const callFunction = CloudFunctionsService.callFunction;

// Default export for backward compatibility
export default {
  app,
  analytics,
  auth,
  db,
  storage,
  functions,
  httpsCallable,
  callFunction,
  EmailVerificationService,
  PasswordResetService,
  CloudFunctionsService
};