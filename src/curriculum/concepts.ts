import type { Concept } from './types';

export const foundationConcepts: Concept[] = [
  {
    id: 'concept.process',
    title: 'Processes',
    summary: 'A process is the operating system\'s isolation boundary: its own address space, identity, and fate.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.thread',
    title: 'Threads',
    summary: 'Threads are execution streams that share a process\'s memory. Shared writes need an owner, an atomic, or a lock.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.memory',
    title: 'Memory',
    summary: 'Resident memory is what fills RAM. Unbounded caches and native buffers grow until the kernel kills the process.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.cpu',
    title: 'CPU and scheduling',
    summary: 'A saturated thread waits for a core. Host-average CPU can hide that wait, and the user experiences it as latency.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.linux',
    title: 'Linux service model',
    summary: 'A service is a process with files, credentials, and signals. SIGTERM can drain. SIGKILL cannot.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.network',
    title: 'Networks and sockets',
    summary: 'A connection is a pair of sockets. Refused, reset, and timeout are different answers from the path.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.dns',
    title: 'DNS',
    summary: 'Names resolve to cached addresses. A TTL bounds polite caches. It does not update clients that already looked up.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.tcp',
    title: 'TCP',
    summary: 'TCP retransmits an ordered byte stream. It does not know whether the application committed the operation.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.tls',
    title: 'TLS',
    summary: 'TLS authenticates the server and protects bytes on one connection. Expiry fails the handshake before the handler runs.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.http',
    title: 'HTTP',
    summary: 'Methods and status codes are the retry contract. A missing response is not proof that a POST did nothing.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.latency',
    title: 'Latency',
    summary: 'Latency is the wait a caller feels. Percentiles describe the tail. Averages hide it.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.throughput',
    title: 'Throughput',
    summary: 'Throughput is completed work per second. It falls when a saturated resource starts queueing.',
    phaseId: 'foundations',
  },
  {
    id: 'concept.queueing',
    title: 'Queueing',
    summary: 'Waiting work piles up as utilization nears the limit. Little\'s law connects concurrency, arrival, and time in system.',
    phaseId: 'foundations',
  },
];
