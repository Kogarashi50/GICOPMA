import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css'; // If loading CSS via npm too
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // <--- This is essential
import App from './App';
import reportWebVitals from './reportWebVitals';
import "@fontsource/poppins"; 
import "@fontsource/poppins/300.css"; 
import "@fontsource/poppins/600.css"; 
import "@fontsource/nunito"; 
import "@fontsource/nunito/300.css";
import "@fontsource/nunito/700.css"; 
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
