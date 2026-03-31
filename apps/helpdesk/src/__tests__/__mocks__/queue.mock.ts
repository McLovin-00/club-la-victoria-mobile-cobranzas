/**
 * BullMQ Queue Mock for Unit Tests
 * Provides mock implementations of BullMQ queue and job methods
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MockJob<T = any> {
  id: string;
  name: string;
  data: T;
  opts: Record<string, any>;
  state: any;
  progress: any;
  returnvalue: any;
  stacktrace: string[];
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  attemptsMade: number;
  
  update: any;
  remove: any;
  retry: any;
  discard: any;
  promote: any;
  getState: any;
  isCompleted: any;
  isFailed: any;
  isDelayed: any;
  isActive: any;
  isWaiting: any;
}

export interface MockQueue<T = any> {
  name: string;
  add: any;
  addBulk: any;
  getJob: any;
  getJobs: any;
  getCompleted: any;
  getFailed: any;
  getWaiting: any;
  getActive: any;
  getDelayed: any;
  pause: any;
  resume: any;
  isPaused: any;
  close: any;
  empty: any;
  clean: any;
  obliterate: any;
  getJobCounts: any;
  getWaitingCount: any;
  getActiveCount: any;
  getCompletedCount: any;
  getFailedCount: any;
  getDelayedCount: any;
  on: any;
  once: any;
}

let jobIdCounter = 0;

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  jobIdCounter += 1;
  return `job-${Date.now()}-${jobIdCounter}`;
}

/**
 * Create a mock job instance
 */
export function createMockJob<T = any>(data: T, name: string = 'default', opts: Record<string, any> = {}): MockJob<T> {
  const mockFn = (): any => jest.fn();
  
  return {
    id: generateJobId(),
    name,
    data,
    opts,
    state: 'waiting',
    progress: null,
    returnvalue: null,
    stacktrace: [],
    timestamp: Date.now(),
    processedOn: undefined,
    finishedOn: undefined,
    failedReason: undefined,
    attemptsMade: 0,
    
    update: mockFn().mockResolvedValue(undefined),
    remove: mockFn().mockResolvedValue(undefined),
    retry: mockFn().mockResolvedValue(undefined),
    discard: mockFn().mockResolvedValue(undefined),
    promote: mockFn().mockResolvedValue(undefined),
    getState: mockFn().mockResolvedValue('waiting'),
    isCompleted: mockFn().mockResolvedValue(false),
    isFailed: mockFn().mockResolvedValue(false),
    isDelayed: mockFn().mockResolvedValue(false),
    isActive: mockFn().mockResolvedValue(false),
    isWaiting: mockFn().mockResolvedValue(true),
  };
}

/**
 * Create a mock queue instance
 */
export function createQueueMock<T = any>(name: string = 'test-queue'): MockQueue<T> {
  const mockFn = (): any => jest.fn();
  const jobs: MockJob<T>[] = [];
  const completedJobs: MockJob<T>[] = [];
  const failedJobs: MockJob<T>[] = [];
  
  return {
    name,
    
    add: mockFn().mockImplementation((jobName: string, data: T, opts?: Record<string, any>) => {
      const job = createMockJob(data, jobName, opts);
      jobs.push(job);
      return Promise.resolve(job);
    }),
    
    addBulk: mockFn().mockImplementation((jobList: Array<{ name: string; data: T; opts?: Record<string, any> }>) => {
      const addedJobs = jobList.map(j => {
        const job = createMockJob(j.data, j.name, j.opts);
        jobs.push(job);
        return job;
      });
      return Promise.resolve(addedJobs);
    }),
    
    getJob: mockFn().mockImplementation((jobId: string) => {
      const job = jobs.find(j => j.id === jobId) ?? 
                  completedJobs.find(j => j.id === jobId) ?? 
                  failedJobs.find(j => j.id === jobId);
      return Promise.resolve(job || null);
    }),
    
    getJobs: mockFn().mockResolvedValue(jobs),
    
    getCompleted: mockFn().mockResolvedValue(completedJobs),
    
    getFailed: mockFn().mockResolvedValue(failedJobs),
    
    getWaiting: mockFn().mockResolvedValue(jobs.filter(j => j.state === 'waiting')),
    
    getActive: mockFn().mockResolvedValue(jobs.filter(j => j.state === 'active')),
    
    getDelayed: mockFn().mockResolvedValue(jobs.filter(j => j.state === 'delayed')),
    
    pause: mockFn().mockResolvedValue(undefined),
    
    resume: mockFn().mockResolvedValue(undefined),
    
    isPaused: mockFn().mockResolvedValue(false),
    
    close: mockFn().mockResolvedValue(undefined),
    
    empty: mockFn().mockImplementation(() => {
      jobs.length = 0;
      completedJobs.length = 0;
      failedJobs.length = 0;
      return Promise.resolve(undefined);
    }),
    
    clean: mockFn().mockResolvedValue(0),
    
    obliterate: mockFn().mockResolvedValue(undefined),
    
    getJobCounts: mockFn().mockResolvedValue({
      waiting: jobs.filter(j => j.state === 'waiting').length,
      active: jobs.filter(j => j.state === 'active').length,
      completed: completedJobs.length,
      failed: failedJobs.length,
      delayed: jobs.filter(j => j.state === 'delayed').length,
    }),
    
    getWaitingCount: mockFn().mockResolvedValue(jobs.filter(j => j.state === 'waiting').length),
    
    getActiveCount: mockFn().mockResolvedValue(jobs.filter(j => j.state === 'active').length),
    
    getCompletedCount: mockFn().mockResolvedValue(completedJobs.length),
    
    getFailedCount: mockFn().mockResolvedValue(failedJobs.length),
    
    getDelayedCount: mockFn().mockResolvedValue(jobs.filter(j => j.state === 'delayed').length),
    
    on: mockFn().mockReturnThis(),
    
    once: mockFn().mockReturnThis(),
  };
}

/**
 * Mock for BullMQ errors
 */
export class MockQueueError extends Error {
  public code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'QueueError';
    this.code = code;
  }
}

/**
 * Common queue error factories
 */
export const QueueErrors = {
  ConnectionError: () => 
    new MockQueueError('Could not connect to Redis', 'E_CONNECTION'),
  
  JobNotFoundError: (jobId: string) => 
    new MockQueueError(`Job ${jobId} not found`, 'E_JOB_NOT_FOUND'),
  
  RateLimitError: () => 
    new MockQueueError('Rate limit exceeded', 'E_RATE_LIMIT'),
  
  StalledError: () => 
    new MockQueueError('Job stalled', 'E_STALLED'),
};

/**
 * Helper to simulate job processing completion
 */
export function simulateJobCompletion(job: MockJob, result?: any): void {
  job.state = 'completed';
  job.returnvalue = result;
  job.finishedOn = Date.now();
  job.isCompleted = jest.fn().mockResolvedValue(true);
  job.getState = jest.fn().mockResolvedValue('completed');
}

/**
 * Helper to simulate job failure
 */
export function simulateJobFailure(job: MockJob, reason: string): void {
  job.state = 'failed';
  job.failedReason = reason;
  job.finishedOn = Date.now();
  job.isFailed = jest.fn().mockResolvedValue(true);
  job.getState = jest.fn().mockResolvedValue('failed');
}
