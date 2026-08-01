import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setAuthSuccess, logout } from '../store/authSlice';
import { api } from '../services/api';

export const useAuthInit = () => {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const response = await api.get('/auth/me');
        dispatch(setAuthSuccess({ user: response.data.user, token }));
      } catch  {
        console.error('Session expired or invalid token');
        dispatch(logout());
      }
    };

    fetchProfile();
  }, [dispatch, token]);
};