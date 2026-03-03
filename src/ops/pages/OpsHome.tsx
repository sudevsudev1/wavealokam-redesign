import { useOpsAuth } from '../contexts/OpsAuthContext';
import ManagerHome from './ManagerHome';
import AdminHome from './AdminHome';

export default function OpsHome() {
  const { isAdmin } = useOpsAuth();
  return isAdmin ? <AdminHome /> : <ManagerHome />;
}
