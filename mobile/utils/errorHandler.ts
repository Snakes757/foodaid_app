export const getErrorMessage = (error: any): string => {
  if (!error) return "An unknown error occurred.";

  // 1. Backend API Errors (FastAPI/Axios)
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      // Pydantic validation errors often come as an array of objects
      return detail.map((err: any) => err.msg).join('\n');
    }
    return JSON.stringify(detail);
  }

  // 2. Firebase Auth Errors
  if (error.code) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'The email address format is invalid.';
      case 'auth/user-disabled':
        return 'This user account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email. Please register first.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        return `Authentication Error: ${error.code.replace('auth/', '')}`;
    }
  }

  // 3. Network Errors (Axios)
  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
    return 'Unable to connect to the server. Please check your internet connection or try again later.';
  }

  // 4. Default Fallback
  return error.message || "Something went wrong. Please try again.";
};