import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Meetings from './pages/Meetings';
import Tasks from './pages/Tasks';
import Pipeline from './pages/Pipeline';
import Integrations from './pages/Integrations';
import Settings from './pages/Settings';
import Approvals from './pages/Approvals';
import KnowledgeBase from './pages/KnowledgeBase';
import Employees from './pages/Employees';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="meetings" element={<Meetings />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="employees" element={<Employees />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
