import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Resumes } from './pages/Resumes';
import { JdParser } from './pages/JdParser';
import { ResumeRewrite } from './pages/ResumeRewrite';
import { InterviewKit } from './pages/InterviewKit';
import { Pipeline } from './pages/Pipeline';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout><Outlet /></Layout>}>
        <Route index element={<Dashboard />} />
        <Route path="/resumes" element={<Resumes />} />
        <Route path="/jd-parser" element={<JdParser />} />
        <Route path="/rewrite" element={<ResumeRewrite />} />
        <Route path="/interview" element={<InterviewKit />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
