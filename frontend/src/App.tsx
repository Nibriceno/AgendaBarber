import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { BarberDashboardPage } from './pages/BarberDashboardPage';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage';
import { AdminAppointmentsPage } from './pages/admin/AdminAppointmentsPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminServicesPage } from './pages/admin/AdminServicesPage';
import { AdminBarbersPage } from './pages/admin/AdminBarbersPage';
import { AdminSchedulesPage } from './pages/admin/AdminSchedulesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
                'RECEPTIONIST',
              ]}
            >
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/barber"
          element={
            <ProtectedRoute
              allowedRoles={['BARBER']}
            >
              <BarberDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-appointments"
          element={
            <ProtectedRoute
              allowedRoles={['CLIENT']}
            >
              <MyAppointmentsPage />
            </ProtectedRoute>
          }

        />

        <Route
        path="/admin/appointments"
        element={
          <ProtectedRoute
            allowedRoles={[
              'ADMIN',
              'RECEPTIONIST',
            ]}
          >
            <AdminAppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/services"
        element={
          <ProtectedRoute
            allowedRoles={[
              'ADMIN',
              'RECEPTIONIST',
            ]}
          >
            <AdminServicesPage />
          </ProtectedRoute>
        }
      />
      <Route
      path="/admin/barbers"
      element={
        <ProtectedRoute
          allowedRoles={[
            'ADMIN',
            'RECEPTIONIST',
          ]}
        >
          <AdminBarbersPage />
        </ProtectedRoute>
      }
    />
    <Route
    path="/admin/schedules"
    element={
      <ProtectedRoute
        allowedRoles={[
          'ADMIN',
          'RECEPTIONIST',
        ]}
      >
        <AdminSchedulesPage />
      </ProtectedRoute>
    }
  />
      </Routes>
    </BrowserRouter>
  );
}

export default App;