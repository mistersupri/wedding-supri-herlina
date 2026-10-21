import { useEffect, useState } from 'react';
import { discard, onUploaded, retryNow, startQueue, subscribe, type JobState } from './queue.js';

/** Live view of the upload queue; `onDone` runs after each photo lands in the feed. */
export function useUploadQueue(onDone?: () => void) {
  const [jobs, setJobs] = useState<JobState[]>([]);
  useEffect(() => {
    startQueue();
    return subscribe(setJobs);
  }, []);
  useEffect(() => (onDone ? onUploaded(onDone) : undefined), [onDone]);
  return {
    jobs,
    /** Photos taken but not yet registered: they still count against the guest's frames. */
    pending: jobs.filter((j) => j.status !== 'done' && j.status !== 'rejected').length,
    retry: retryNow,
    discard,
  };
}
