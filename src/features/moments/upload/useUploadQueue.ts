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
    /** Frames of photos taken but not yet registered: they still count against the guest's quota (a collage holds one per shot). */
    pending: jobs.filter((j) => j.status !== 'done' && j.status !== 'rejected').reduce((n, j) => n + (j.frames || 1), 0),
    retry: retryNow,
    discard,
  };
}
