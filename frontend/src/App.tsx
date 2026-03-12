import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from './components/AuthLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home } from './pages/Home';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/home" element={<Home />} />
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
    </Routes>
  );
}

export default App;