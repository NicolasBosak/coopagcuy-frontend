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

            {/* Rutas privadas */}
            <Route path="/dashboard" element={
              <PrivateRoute><Dashboard /></PrivateRoute>
            } />
            <Route path="/productoras" element={
              <PrivateRoute rolesPermitidos={[
                "AdminCooperativa", "AdminTecnico", "OperadorCAT"
              ]}>
                <Productoras />
              </PrivateRoute>
            } />
            <Route path="/recepcion" element={
              <PrivateRoute rolesPermitidos={[
                "OperadorCAT", "AdminCooperativa", "AdminTecnico"
              ]}>
                <Recepcion />
              </PrivateRoute>
            } />
            <Route path="/faenamiento" element={
              <PrivateRoute rolesPermitidos={[
                "OperadorFaenamiento", "AdminCooperativa", "AdminTecnico"
              ]}>
                <Faenamiento />
              </PrivateRoute>
            } />
            <Route path="/despacho" element={
              <PrivateRoute rolesPermitidos={[
                "OperadorFaenamiento", "AdminCooperativa", "AdminTecnico"
              ]}>
                <Despacho />
              </PrivateRoute>
            } />

            <Route path="/reportes" element={
              <PrivateRoute rolesPermitidos={["AdminCooperativa", "AdminTecnico"]}>
                <Reportes />
              </PrivateRoute>
            } />

            {/* Gestión de usuarios y catálogos — RF-504 / RF-506 */}
            <Route path="/administracion" element={
              <PrivateRoute rolesPermitidos={["AdminCooperativa", "AdminTecnico"]}>
                <Administracion />
              </PrivateRoute>
            } />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}