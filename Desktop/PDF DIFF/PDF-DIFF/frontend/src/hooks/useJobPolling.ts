import { useContext } from 'react';
import { JobContext } from '../context/JobContext';
export function useJobPolling() {
  const context = useContext(JobContext);
  if (!context) throw new Error('useJobPolling must be used within JobProvider');
  return context;
}
