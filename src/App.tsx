import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { PrivateRoute } from "./components/PrivateRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Productoras from "./pages/Productoras";
import Recepcion from "./pages/Recepcion";
import Faenamiento from "./pages/Faenamiento";
import Despacho from "./pages/Despacho";
import QRPublico from "./pages/QRPublico";
import Reportes from "./pages/Reportes";
import Administracion from "./pages/Administracion";
import Sesiones from "./pages/Sesiones";
import Vinculaciones from "./pages/Vinculaciones";
import RecuperarPassword from "./pages/RecuperarPassword";
import CambiarPassword from "./pages/CambiarPassword";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            {/* Rutas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/qr/:codigoLote" element={<QRPublico />} />
            <Route path="/recuperar-password" element={<RecuperarPassword />} />

            {/* Rutas privadas */}
            <Route path="/dashboard" element={
              <PrivateRoute rolesPermitidos={[
                "AdminCooperativa", "OperadorCAT", "OperadorFaenamiento"
              ]}>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/cambiar-password" element={
              <PrivateRoute><CambiarPassword /></PrivateRoute>
            } />
            <Route path="/productoras" element={
              <PrivateRoute rolesPermitidos={[
                "AdminCooperativa", "OperadorCAT"
              ]}>
                <Productoras />
              </PrivateRoute>
            } />
            <Route path="/recepcion" element={
              <PrivateRoute disponibleOffline rolesPermitidos={[
                "OperadorCAT", "AdminCooperativa"
              ]}>
                <Recepcion />
              </PrivateRoute>
            } />
            <Route path="/faenamiento" element={
              <PrivateRoute rolesPermitidos={[
                "OperadorFaenamiento", "AdminCooperativa"
              ]}>
                <Faenamiento />
              </PrivateRoute>
            } />
            <Route path="/despacho" element={
              <PrivateRoute rolesPermitidos={[
                "OperadorFaenamiento", "AdminCooperativa"
              ]}>
                <Despacho />
              </PrivateRoute>
            } />

            <Route path="/reportes" element={
              <PrivateRoute rolesPermitidos={[
                "AdminCooperativa", "AdminTecnico", "OperadorFaenamiento"
              ]}>
                <Reportes />
              </PrivateRoute>
            } />

            {/* Gestión de usuarios y catálogos — RF-504 / RF-506 */}
            <Route path="/administracion" element={
              <PrivateRoute rolesPermitidos={["AdminCooperativa", "AdminTecnico"]}>
                <Administracion />
              </PrivateRoute>
            } />

            {/* Sesiones activas y bandeja de vinculación (solo administración) */}
            {/* Sesiones activas: solo el administrador técnico. Revocar
                sesiones es soporte, no gestión. */}
            <Route path="/sesiones" element={
              <PrivateRoute rolesPermitidos={["AdminTecnico"]}>
                <Sesiones />
              </PrivateRoute>
            } />
            <Route path="/vinculaciones" element={
              <PrivateRoute rolesPermitidos={["AdminCooperativa", "AdminTecnico"]}>
                <Vinculaciones />
              </PrivateRoute>
            } />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}