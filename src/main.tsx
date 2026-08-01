import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { NotificationProvider } from './context/NotificationContext';
import { store } from './store'; 
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
     <NotificationProvider>
        <App />
      </NotificationProvider>
    </Provider>
  </React.StrictMode>
);