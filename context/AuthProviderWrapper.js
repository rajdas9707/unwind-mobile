import React, { useContext, useEffect } from 'react';
import { AuthProvider, AuthContext } from './AuthProvider';
import { setAuthContextRef } from '../api/client';

// Wrapper component to connect AuthProvider with client.js
const AuthProviderSetup = ({ children }) => {
  const authContext = useContext(AuthContext);

  useEffect(() => {
    // Set the auth context reference in client.js
    if (authContext) {
      setAuthContextRef(authContext);
    }
  }, [authContext]);

  return <>{children}</>;
};

// Enhanced AuthProvider that automatically sets up client.js integration
export const EnhancedAuthProvider = ({ children }) => {
  return (
    <AuthProvider>
      <AuthProviderSetup>
        {children}
      </AuthProviderSetup>
    </AuthProvider>
  );
};

export default EnhancedAuthProvider;