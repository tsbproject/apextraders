import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCurrentUser, logout } from '../store/authSlice';

export const useAuthInit = () => {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    // If no token exists, ensure clean logged out state
    if (!token) {
      if (user) dispatch(logout());
      return;
    }

    // Re-verify session in background on mount
    dispatch(fetchCurrentUser());
  }, [dispatch, token]);
};