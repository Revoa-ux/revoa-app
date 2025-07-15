```diff
--- a/src/pages/admin/Auth.tsx
+++ b/src/pages/admin/Auth.tsx
@@ -1,8 +1,6 @@
 import React, { useState, useEffect } from 'react';
 import { useNavigate, useLocation } from 'react-router-dom';
-import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'; // eslint-disable-line @typescript-eslint/no-unused-vars
-import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'; // eslint-disable-line @typescript-eslint/no-unused-vars
-import { useAdmin } from '../contexts/AdminContext';
+import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
 import { PageTitle } from '../components/PageTitle';
 import { cn } from '../lib/utils';
 
@@ -17,8 +15,8 @@
     confirmPassword?: string;
   }>({});
   
-  const { signIn, signUp, resetPassword, user, isAuthenticated, hasCompletedOnboarding } = useAuth();
-  const { isAdmin, checkAdminStatus } = useAdmin();
+  const { signIn, signUp, resetPassword, isAuthenticated, hasCompletedOnboarding } = useAuth(); // eslint-disable-next-line @typescript-eslint/no-unused-vars
+  const { checkAdminStatus } = useAdmin(); // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const navigate = useNavigate();
   const location = useLocation();
 
```