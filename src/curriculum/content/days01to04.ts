import { buildFullDay } from '../author';
import type { CurriculumDay } from '../types';

export const days01to04: CurriculumDay[] = [
  buildFullDay({
    day: 1,
    phaseId: 'foundations',
    title: 'Processes and isolation',
    morning: {
      title: 'What a process actually isolates',
      conceptIds: ['concept.process'],
      objectives: [
        'Describe a process as an isolation and resource boundary, not as a synonym for a program.',
        'Explain which state dies with a process and which state survives it.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      resourceIds: ['resource.gfs'],
      whyItMatters:
        'Every service you deploy is one or more processes. Crash recovery, deploys, memory limits, and multi-tenant safety are all decisions about where that boundary sits.',
      explanation:
        'A program is a file of instructions. A process is a running instance of a program, created by the operating system. On Linux it has a process id, its own virtual address space, a table of open files, credentials, environment, signal handlers, and at least one thread of execution.\n\nThe address space is the important boundary. One process cannot read or write another process\'s memory unless the kernel sets up an explicit sharing mechanism. A null-pointer crash, a stack overflow, or a corrupted heap dies with that process. The kernel reclaims its memory and closes its file descriptors. Other processes keep running.\n\nNot everything dies with the process. Data it already wrote to disk, rows it committed to a database, and messages it already handed to another process all survive. A restart brings back the code, not the in-memory work that was unfinished.\n\nA backend service is usually a long-lived process, or several of them. The operating system is the thing that starts it, limits its CPU and memory, and notices when it exits. If two unrelated jobs share a process, they also share its fate: one bug can take both down, and one memory leak can starve both.',
      question:
        'A worker process terminates with a segmentation fault while handling one request. Other requests were in flight in that same process. What is lost, what should still be running, and why is restarting the process not the same as finishing the failed request?',
      hints: [
        'Separate the process\'s memory from durable state it may already have written.',
        'Other processes on the machine are outside this address space. Threads inside the dead process are not.',
      ],
      expectedOutline: [
        'The dead process loses its address space, stacks, heap, and open connections.',
        'In-flight work that existed only in that memory is gone.',
        'Committed database writes and fully sent messages remain.',
        'Other processes continue because they have separate address spaces.',
        'A restart creates a new process. It does not resume the crashed instruction or automatically retry the request.',
      ],
      referenceSolution:
        'The segmentation fault ends that process. Its virtual memory, thread stacks, and uncommitted in-memory work disappear. The kernel reclaims those resources. Any request whose only copy lived in that process is unfinished, and any client still waiting on its socket will see a dropped connection rather than a completed response.\n\nOther processes are unaffected because they do not share the address space. A database process, a neighboring API process, and the operating system keep running. Durable effects that were already committed, such as a database transaction that committed before the crash, remain. Effects that were only planned in memory do not.\n\nRestarting the worker creates a new process with a new address space and loads the program again. It does not continue from the crashed instruction, and it does not know which request was in flight unless the system recorded that elsewhere. Retry belongs to a client, queue, or supervisor with an idempotent operation, not to the act of process start itself.',
      rubric: [
        { id: 'boundary', description: 'The address space is the crash boundary, and other processes survive.', conceptId: 'concept.process' },
        { id: 'memory', description: 'In-memory in-flight work is lost. Already committed durable state is not.', conceptId: 'concept.process' },
        { id: 'restart', description: 'A restart creates a fresh process and does not resume the failed request.', conceptId: 'concept.process' },
      ],
      misconceptions: [
        { id: 'restart-resumes', statement: 'Restarting a process continues the request that crashed.', correction: 'A new process starts the program again. The old stack and heap are gone.' },
        { id: 'one-fate', statement: 'A process crash takes down every program on the machine.', correction: 'The kernel isolates address spaces. The machine stays up unless the kernel itself fails or a supervisor stops the other processes.' },
      ],
      engineeringContext:
        'Process-per-request servers, such as older PHP or a preforking server, buy isolation at the cost of memory. A threaded server puts many requests in one process and one crash domain. Containers and orchestrators restart processes. They do not recover the request that was in flight.',
      extensionQuestions: [
        'What would you put in a separate process from the API: the metrics scraper, the plugin runtime, or the TLS terminator? Why?',
      ],
      acceptableAlternatives: [
        'Discussing a supervisor that restarts the process is valid if it still separates restart from request completion.',
      ],
      tradeoffs: [
        'More processes give stronger isolation and use more memory. Fewer processes share caches and make one bug more expensive.',
      ],
      commonMistakes: [
        'Treating a process and a thread as the same boundary.',
        'Assuming the database rolled back because the application crashed, even after a commit.',
      ],
      followUps: [
        'Which parts of a request are safe to retry after the socket disappears?',
      ],
    },
    evening: {
      title: 'Choose a crash boundary',
      conceptIds: ['concept.process'],
      objectives: [
        'Place a fault-isolation boundary on purpose instead of inheriting whatever shared a process.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      resourceIds: ['resource.gfs'],
      whyItMatters:
        'Production incidents often come from two responsibilities sharing a fate they should not have shared. The fix is a boundary, not a tighter try/catch inside the same address space.',
      explanation:
        'A try/catch handles an error the runtime can still unwind. It does not contain a segmentation fault, an out-of-memory kill, or a deadlock that freezes every thread in the process. Those failures require a boundary the kernel enforces.\n\nWhen you decide what shares a process, you are deciding what is allowed to die together. A billing API and an untrusted report renderer should not share that fate. A metrics agent that only reads host stats often should be separate so a bug in collection cannot stop billing, and a bug in billing cannot stop collection.\n\nThe cost of a boundary is real. Separate processes cannot share a heap, so they copy data through sockets, pipes, or files. They start more slowly and use more baseline memory. That cost is why not every function becomes a process. The decision is which failures you refuse to couple.',
      question:
        'A billing API and a user-supplied PDF renderer currently run in one process because that made the first version easy. The renderer has crashed the API twice. Propose a boundary. What state moves across it, and what do you deliberately not try to share?',
      hints: [
        'A library call is not a boundary. A separate process, with the kernel between them, is.',
        'The renderer needs the document inputs and a place to put the PDF. It does not need the billing process\'s database credentials in its memory.',
      ],
      expectedOutline: [
        'Run the renderer in a separate process with a tight resource limit.',
        'Pass document inputs over a socket or job record, not by sharing the heap.',
        'Keep database credentials and the request\'s authority in the API process.',
        'Define what the API does when the renderer crashes or times out.',
        'Accept the copy and operational cost in exchange for isolating crashes.',
      ],
      referenceSolution:
        'Move the renderer into its own process, ideally one the API starts per job or reuses from a small pool, with a memory and CPU limit. The API sends the render inputs and a deadline. The renderer returns a PDF or an error. If the renderer process dies, the API still has its address space, its database connections, and the ability to fail that one request.\n\nDo not share the heap, and do not put the API\'s database credentials or user tokens in the renderer\'s environment. The renderer should be able to do nothing except turn the inputs it was given into a file. The API decides whether to retry, and only if rendering is safe to repeat.\n\nThe trade is extra latency from copying bytes and an extra process to supervise. That is cheaper than coupling payment availability to a parser of untrusted files.',
      rubric: [
        { id: 'boundary', description: 'The renderer is a separate process, not merely a caught exception.', conceptId: 'concept.process' },
        { id: 'data', description: 'Inputs and outputs cross the boundary explicitly. Credentials and the heap do not.', conceptId: 'concept.process' },
        { id: 'failure', description: 'The API can fail or retry the one job after the renderer dies.', conceptId: 'concept.process' },
      ],
      misconceptions: [
        { id: 'try-catch', statement: 'A try/catch around the renderer contains every crash.', correction: 'It contains exceptions the runtime raises. It does not contain a fatal signal or an out-of-memory kill of the process.' },
      ],
      engineeringContext:
        'Browsers, document converters, and plugin hosts use process sandboxes for this reason. The pattern shows up again in sidecars and worker pools. The mechanism is the same: a kernel-enforced address space around the risky code.',
      extensionQuestions: [
        'What limit would you set so a runaway renderer cannot consume the host before the API notices?',
      ],
      acceptableAlternatives: [
        'A pool of renderer processes is as valid as one process per job if a crash in the pool is still contained.',
      ],
      tradeoffs: [
        'A pool reuses warm processes but a crash drops every job that pool process held. One process per job isolates more and costs more.',
      ],
      commonMistakes: [
        'Leaving the API\'s secrets in the renderer because both started from the same environment.',
      ],
      followUps: [
        'How would you know the renderer is wedged rather than merely slow?',
      ],
    },
  }),
  buildFullDay({
    day: 2,
    phaseId: 'foundations',
    title: 'Threads and shared memory',
    morning: {
      title: 'Threads share a fate and a heap',
      conceptIds: ['concept.thread', 'concept.process'],
      objectives: [
        'Explain what threads share and what they do not.',
        'Recognize a race as lost updates, not as a mysterious slowdown.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      extraPrerequisiteSessionIds: ['day.001.morning'],
      whyItMatters:
        'Most request-serving processes handle concurrency with threads or async tasks on top of shared memory. The bugs look like lost updates, not like crashes.',
      explanation:
        'A thread is a stream of execution inside a process. Threads in the same process share the address space, open files, and heap. Each has its own stack and instruction pointer. Creating a thread is cheaper than creating a process because there is no new address space to set up. The cost is that they can interfere.\n\nIf two threads increment the same counter by reading it, adding one, and writing it back, both can read the same value and both can write the same result. One increment disappears. No exception is thrown. The program is simply wrong under concurrency and fine in a single-threaded test.\n\nA lock, an atomic operation, or a design that gives the counter to one thread can close the race. A lock has its own failure mode: if the critical section is large, threads wait, and if two locks are acquired in different orders, threads can deadlock. Async runtimes avoid some thread costs but do not remove races on shared objects. A promise that mutates a shared map still races if two tasks interleave at an await.',
      question:
        'A request counter is a plain integer in a web server process. Under a load test it reports fewer requests than the access log. There is no error in the logs. What happened, and what are two correct ways to fix the count without moving each request into its own process?',
      hints: [
        'The log has one line per request because appending a line is ordered by the logger. The counter update may not be.',
        'Sharing the heap is the point of threads. Isolation would require a process, which the question asks you not to use as the fix.',
      ],
      expectedOutline: [
        'Threads shared the counter and lost updates in a read-modify-write race.',
        'The absence of errors is expected. Races are silent.',
        'An atomic increment or a single thread that owns the counter fixes it.',
        'A lock around the increment also works if the critical section stays tiny.',
      ],
      referenceSolution:
        'The counter is shared mutable state. Two threads read the same value, increment their private copies, and write back. One update overwrites the other. The access log can still show both requests because writing a log line was serialized elsewhere. Nothing crashes, so there is no error to grep for.\n\nFix it with an atomic increment, which makes the read-modify-write one hardware operation, or with a mutex held only around the increment. A third sound design is to send each completion to a single owner thread that updates the counter, so the shared object is no longer written by the request threads.\n\nA process per request would also avoid the race and would spend an address space on a counter. That is the wrong cost for this bug.',
      rubric: [
        { id: 'share', description: 'Threads in one process share the heap and can race on it.', conceptId: 'concept.thread' },
        { id: 'silent', description: 'A lost update needs no exception to be wrong.', conceptId: 'concept.thread' },
        { id: 'fix', description: 'The fix serializes the update with an atomic, a small lock, or a single owner.', conceptId: 'concept.thread' },
      ],
      misconceptions: [
        { id: 'thread-isolates', statement: 'Threads give the same isolation as processes.', correction: 'Threads share the address space. A bad write in one thread can corrupt memory other threads use.' },
        { id: 'race-throws', statement: 'A data race raises an exception the server will log.', correction: 'Many races just drop updates or tear values. Tests that run single-threaded will not see them.' },
      ],
      engineeringContext:
        'Request metrics, connection pools, and in-process caches are the usual scene of this bug. The same reasoning applies to a shared map in a Node.js process if two async tasks interleave, even without operating-system threads.',
      extensionQuestions: [
        'Why can a lock around the whole request handler make throughput worse even though it removes the race?',
      ],
      acceptableAlternatives: [
        'A concurrent hash map or an atomic long is a valid fix if you say which operation becomes atomic.',
      ],
      tradeoffs: [
        'Locks are simple and can serialize too much. Atomics are narrow and easy to misuse for compound updates such as "insert if absent".',
      ],
      commonMistakes: [
        'Adding a lock around the entire handler when only the increment needed it.',
      ],
      followUps: [
        'How would you test that the counter matches the log under concurrency?',
      ],
    },
    evening: {
      title: 'A counter that lies under load',
      conceptIds: ['concept.thread'],
      objectives: [
        'Decide whether a shared structure needs a lock, an atomic, or a single owner.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      whyItMatters:
        'The evening exercise is the morning bug in a structure people actually ship: a map of in-flight requests, not a textbook integer.',
      explanation:
        'A map of in-flight requests is updated on the way in and on the way out. The interesting race is not only the integer size. Two threads can resize or rehash a plain map at the same time and corrupt it, or one thread can delete an entry another thread is reading.\n\nThe right tool depends on the operation. "Add one" can be atomic. "Insert this request and, if the key was already there, reject the duplicate" is a compound operation. It needs a structure that makes that compound step atomic, or one thread that owns the map and receives operations as messages. Locking every read of a huge map will cap throughput. Not locking it will eventually corrupt it.',
      question:
        'An API keeps a plain hash map from request id to start time so it can log requests that run longer than two seconds. After a traffic spike the process sometimes crashes inside the map, and the slow-request log misses calls the access log shows. What is wrong, and what design would you use instead?',
      hints: [
        'A hash map\'s internal buckets are shared mutable memory.',
        'You need the insert and the later delete to be safe, not just the size of the map.',
      ],
      expectedOutline: [
        'Concurrent mutation of a non-thread-safe map can corrupt it and crash the process.',
        'Lost inserts explain missing slow-request lines.',
        'Use a concurrent map, a mutex around map operations, or a single owner thread.',
        'Keep the critical section to the map update, not the whole request.',
      ],
      referenceSolution:
        'The map is shared by request threads and is not safe for concurrent writes. One thread can rehash while another inserts, which can crash the process. Even without a crash, an insert can be lost, so the completion path never sees the start time and never logs the slow request.\n\nReplace it with a concurrent map whose insert and delete are safe, or protect every map operation with one mutex. If the only goal is a slow-request log, a single maintenance thread can own the map and the request threads can send start and finish events to it. That last design makes the ordering obvious and keeps request threads from waiting on each other.\n\nDo not hold a lock while doing the request\'s database work. The shared state is the map, and the protected region should be the map update only.',
      rubric: [
        { id: 'cause', description: 'The crash and the missing logs come from unsynchronized map updates.', conceptId: 'concept.thread' },
        { id: 'design', description: 'The replacement makes insert and delete safe without serializing the whole request.', conceptId: 'concept.thread' },
      ],
      misconceptions: [
        { id: 'immutable', statement: 'A hash map is safe to share if you only add and remove keys.', correction: 'Add and remove are mutations. Without a concurrency contract, they are races, and some of them crash.' },
      ],
      engineeringContext:
        'This shows up in homemade caches, in-flight request maps, and rate-limit counters. Libraries that say "thread-safe" are specific about which compound operations are atomic. "The methods have locks" does not mean "check-then-act is atomic".',
      extensionQuestions: [
        'Check-then-insert is how duplicate requests slip through a map that locks only the insert. Where would you close that gap?',
      ],
      acceptableAlternatives: [
        'A channel to one owner goroutine or actor is a valid design even if you do not name a concurrent hash map.',
      ],
      tradeoffs: [
        'One owner thread is easy to reason about and becomes a bottleneck if every request waits for it synchronously.',
      ],
      commonMistakes: [
        'Locking only the insert and leaving the delete unsynchronized.',
      ],
      followUps: [
        'What metric would tell you the lock, rather than the database, is the bottleneck?',
      ],
    },
  }),
  buildFullDay({
    day: 3,
    phaseId: 'foundations',
    title: 'Memory',
    morning: {
      title: 'Virtual memory, heap, and the OOM kill',
      conceptIds: ['concept.memory'],
      objectives: [
        'Separate virtual address space, resident memory, and the heap your runtime allocates.',
        'Explain why a process can be killed for memory without a NullPointerException.',
      ],
      durationMinutes: 18,
      difficulty: 'foundational',
      whyItMatters:
        'Memory incidents are how services die in production when the bug is a retained collection, not an exception. You cannot reason about limits until you know what the kernel is counting.',
      explanation:
        'Each process has a virtual address space. Virtual addresses are not physical RAM. The kernel and the MMU map the pages the process touches onto physical frames, and they can park cold pages on disk. The number that predicts an out-of-memory kill is closer to resident memory: pages currently in RAM.\n\nInside that space, the stack holds call frames and is usually small. The heap holds objects whose size is not known when the function is compiled: request bodies, caches, parsed documents. A runtime allocator asks the kernel for more pages when the heap grows. Freeing an object in the language does not always return those pages to the kernel immediately.\n\nA memory leak in a long-lived process is often logical, not a forgotten malloc. A map from user id to session grows because nothing removes entries. The process stays "correct" and gets slower, then the kernel\'s OOM killer sends SIGKILL. There is no stack trace from the killer. The process is simply gone.\n\nLimits exist so one process cannot take the whole machine. A cgroup or container limit makes the kill happen earlier and localizes it. A limit set below the real working set kills a healthy process. A limit set far above it is not a limit.',
      question:
        'A service\'s memory graph climbs for six hours and then the process disappears. The application log\'s last line is an ordinary request. There is no exception. What are the two different places the memory may have gone, and what would you measure to tell them apart?',
      hints: [
        'The language heap and the process RSS are related and are not the same number.',
        'SIGKILL from the OOM killer does not unwind the stack through your logger.',
      ],
      expectedOutline: [
        'Retained heap objects versus memory the runtime or allocator holds outside the language heap.',
        'RSS or cgroup usage compared with the runtime\'s heap estimate.',
        'A growing map, cache, or buffer is the usual application cause.',
        'The silent exit matches an OOM kill, not a caught exception.',
      ],
      referenceSolution:
        'The silent disappearance matches a SIGKILL, commonly from the OOM killer or a cgroup limit. The last application log line is ordinary because the kernel did not give the process a chance to log the kill.\n\nThe memory is in one of two places. It may be live objects on the language heap: a cache, a map of sessions, or request bodies retained by a forgotten reference. It may also be memory the process holds that a heap snapshot undercounts: allocator arenas that were not returned to the kernel, memory-mapped files, thread stacks, or native buffers used by a compression or TLS library.\n\nCompare resident set size, or the cgroup\'s current memory, with the runtime\'s heap-in-use figure. If they climb together, take a heap profile and look for retained collections. If RSS climbs while the language heap stays flat, look at native allocations and arenas. In both cases the fix is to bound the collection or buffer and to set a limit that kills this process before it takes the host.',
      rubric: [
        { id: 'oom', description: 'A silent exit is consistent with an OOM kill rather than a language exception.', conceptId: 'concept.memory' },
        { id: 'two-places', description: 'Heap objects and memory outside the language heap are distinguished.', conceptId: 'concept.memory' },
        { id: 'measure', description: 'RSS or cgroup memory is compared with the runtime heap figure.', conceptId: 'concept.memory' },
      ],
      misconceptions: [
        { id: 'gc-returns', statement: 'When the garbage collector runs, the process RSS drops immediately.', correction: 'The collector reclaims objects. The runtime may keep the pages for future allocations, so RSS can stay high.' },
        { id: 'virtual-is-ram', statement: 'Virtual memory size is how much RAM the process is using.', correction: 'Virtual size includes mapped address space that may not be resident. RSS or cgroup usage is the number that fills RAM.' },
      ],
      engineeringContext:
        'Container memory limits are cgroup limits. "The pod was OOMKilled" means the kernel enforced that limit. It does not say whether the leak was a hashmap or a native buffer. The next step is still a comparison of heap and RSS.',
      extensionQuestions: [
        'Why can raising the limit without a bound on the cache only move the incident later?',
      ],
      acceptableAlternatives: [
        'Naming a specific profiler for your runtime is fine if the comparison of heap versus resident memory is still there.',
      ],
      tradeoffs: [
        'A tight limit fails fast and can kill a legitimate traffic spike. A loose limit protects the node less.',
      ],
      commonMistakes: [
        'Restarting on a timer and calling the leak fixed because the graph sawtooths.',
      ],
      followUps: [
        'What bound would you put on an in-process cache so its worst case fits the limit?',
      ],
    },
    evening: {
      title: 'A cache that eats the box',
      conceptIds: ['concept.memory'],
      objectives: [
        'Put a bound on retained memory using the failure you can actually observe.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      whyItMatters:
        'Unbounded caches are the most common "it worked in the small test" memory incident. The evening session turns the mechanism into a limit you would ship.',
      explanation:
        'An in-process cache feels free until the key space is user-controlled or the value is a parsed document. Without a maximum number of entries, a maximum weight in bytes, and an eviction rule, the cache is a leak with a polite name.\n\nEviction by time alone is not a bound. A burst can fill the cache faster than entries expire. Eviction by count is a bound only if values have a similar size. A count of 10,000 is enormous if each value is a 2 MB image and modest if each value is a 200 byte flag.\n\nThe container limit is the backstop, not the design. You want the cache to evict while the process is still healthy, and you want a metric of cache size so the climb is visible before the kill.',
      question:
        'A handler caches rendered pages in a process-local map keyed by URL, with a one-hour expiry and no maximum size. Memory climbs during a crawl that requests millions of distinct URLs. Design a bound that survives that crawl, and say what the handler should do on a cache miss after the bound is reached.',
      hints: [
        'Expiry limits how long an entry lives. It does not limit how many distinct keys arrive in that hour.',
        'A miss after eviction is supposed to happen. The origin render is the fallback.',
      ],
      expectedOutline: [
        'A byte or weight limit, not only a TTL.',
        'Eviction of existing entries when the limit is reached.',
        'A miss recomputes the page. It does not bypass the limit by inserting anyway.',
        'A metric for current weight and eviction rate.',
      ],
      referenceSolution:
        'Give the cache a maximum weight in bytes and an eviction policy such as least recently used. Estimate or measure the rendered page size and refuse to insert a single page larger than the budget. When the crawl introduces new URLs, old entries are evicted. The one-hour TTL can stay as a freshness rule, but it is not the safety bound.\n\nOn a miss, render the page, return it, and insert it only if it fits after eviction. Do not grow past the budget because the request was a miss. The crawl will have a poor hit rate. That is acceptable. The process stays inside its memory limit, and the origin work is the same work the cache was saving.\n\nExpose the current weight, the hit rate, and the eviction count. A hit rate near zero during the crawl is information. A climbing RSS is a failure of the bound.',
      rubric: [
        { id: 'bound', description: 'The cache has a size bound that a TTL alone does not provide.', conceptId: 'concept.memory' },
        { id: 'miss', description: 'A miss recomputes and does not grow the cache without limit.', conceptId: 'concept.memory' },
      ],
      misconceptions: [
        { id: 'ttl-bounds', statement: 'A TTL is a memory bound.', correction: 'A TTL bounds age. Distinct keys that all arrive inside the TTL window are all resident together.' },
      ],
      engineeringContext:
        'This is the same failure mode as an unbounded memoization table in a web handler. Shared caches such as Redis move the bound to another process. They do not remove the need for a max memory policy.',
      extensionQuestions: [
        'How would you keep one hot page from being evicted by a flood of cold URLs?',
      ],
      acceptableAlternatives: [
        'A small fixed entry count is acceptable if you also cap the size of each value.',
      ],
      tradeoffs: [
        'LRU protects hot keys and can still be fooled by a scan that touches everything once. A crawl is that scan.',
      ],
      commonMistakes: [
        'Inserting on every miss before checking the budget, then evicting too late.',
      ],
      followUps: [
        'What happens to latency when the hit rate collapses but the process survives?',
      ],
    },
  }),
  buildFullDay({
    day: 4,
    phaseId: 'foundations',
    title: 'CPU and scheduling',
    morning: {
      title: 'CPU, cores, and context switches',
      conceptIds: ['concept.cpu'],
      objectives: [
        'Distinguish CPU time from wall-clock time.',
        'Explain why a busy CPU stretches latency before it shows up as errors.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      whyItMatters:
        'Latency incidents are often a scheduling problem. The request is runnable and nobody is crashing. It is waiting for a core.',
      explanation:
        'A core runs one thread at a time. The scheduler gives runnable threads turns. Wall-clock time is what the user waits. CPU time is the time a core actually executed the thread. A request can take 200 ms of wall clock and 5 ms of CPU if it waited on a database, a lock, or the scheduler.\n\nWhen runnable threads exceed cores, each request waits longer for a turn. That wait is latency. Throughput may still look fine until the run queue is deep enough that deadlines expire. Utilization near 100% on the relevant cores leaves no slack for a spike, for garbage collection, or for the operating system.\n\nA context switch saves and restores a thread so another can run. Some switching is necessary. A flood of switches means the process is spending its budget on scheduling rather than on the request. CPU-bound work wants enough cores and long enough turns. I/O-bound work spends most of its life waiting, so adding threads can help until those threads all wake up and contend.\n\n"The CPU is at 30%" can still hide one saturated core if the work is single-threaded. Average utilization across 16 cores will look calm while the one core that runs the event loop is pegged.',
      question:
        'An API\'s median latency doubles during a sale. Error rate stays near zero. Average CPU across the host is 40%. The runtime has one event loop, and that loop\'s thread is near 100% of one core. What is the bottleneck, and why did the average CPU figure mislead you?',
      hints: [
        'A host average divides one busy core by the number of idle cores.',
        'The requests are completing, so this is delay, not failure detection.',
      ],
      expectedOutline: [
        'The event loop thread is saturated. Work is waiting to run on that one core.',
        'Host-average CPU hides a single hot thread.',
        'Errors stay low because requests finish, just later.',
        'The useful next measurement is per-thread or per-core CPU, plus run-queue or event-loop delay.',
      ],
      referenceSolution:
        'The bottleneck is the single event-loop thread. It is runnable whenever there is a request to process, and one core can give it at most one core\'s worth of CPU. Requests queue on that loop, so median latency rises. They still complete, which is why the error rate stays quiet.\n\nAverage CPU is 40% because the other cores are idle. Dividing one busy core by a large core count produces a comforting average that does not describe the thread doing the work. Per-core or per-thread CPU, and a measure of event-loop delay, would have shown the saturation directly.\n\nMore host cores do nothing for a single-threaded loop. The useful moves are to reduce work on that loop, to shard requests across several processes or loops, or to move CPU-heavy work off the loop. Adding threads inside the same loop does not help if the loop itself is the serial section.',
      rubric: [
        { id: 'bottleneck', description: 'The saturated event-loop thread, not the idle cores, is the bottleneck.', conceptId: 'concept.cpu' },
        { id: 'average', description: 'Host-average CPU hides one hot core.', conceptId: 'concept.cpu' },
        { id: 'latency', description: 'Queueing on the loop explains higher latency with few errors.', conceptId: 'concept.cpu' },
      ],
      misconceptions: [
        { id: 'average-cpu', statement: 'Low average CPU means the service has CPU headroom.', correction: 'Average across cores hides a single saturated thread. Headroom that the bottleneck cannot use is not headroom.' },
      ],
      engineeringContext:
        'Node.js, Redis, and many proxies have a main thread that can saturate one core while the machine looks idle. The same chart-reading error appears with a global lock: the CPU is busy waiting, or one thread holds the lock, and the average looks fine.',
      extensionQuestions: [
        'What would change if the hot thread were a garbage collector rather than the event loop?',
      ],
      acceptableAlternatives: [
        'Describing a GIL or a single-threaded runtime by name is fine when the saturation argument is the same.',
      ],
      tradeoffs: [
        'Several processes use the other cores and duplicate memory. One process with a shared heap uses memory better and cannot use those cores for the serial loop.',
      ],
      commonMistakes: [
        'Adding cores to the virtual machine and expecting a single-threaded loop to speed up.',
      ],
      followUps: [
        'How would you tell event-loop delay apart from downstream database delay?',
      ],
    },
    evening: {
      title: 'Latency from a busy core',
      conceptIds: ['concept.cpu'],
      objectives: [
        'Connect a saturated core to a latency budget with a concrete split of the request.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      whyItMatters:
        'A latency budget is how you decide whether a core is late or a dependency is late. The evening session makes that split numeric.',
      explanation:
        'Suppose a handler has a 100 ms budget. The database accounts for 20 ms, TLS and proxy overhead for 10 ms, and the handler\'s own CPU for 8 ms when the core is free. The remaining 62 ms is slack. If the event loop is late by 80 ms, the budget is already gone before the database returns.\n\nThat late time will not appear in a database span. It appears as time the request spent runnable, or queued, before the handler ran. A trace that starts when the handler starts has already hidden the queue.',
      question:
        'A handler\'s budget is 100 ms. Traces that start inside the handler show 30 ms of work, mostly a database call. Clients observe about 120 ms. Where is the missing time, and what would you change in the trace or the metric so the next incident shows it?',
      hints: [
        'The clock the client starts is not the clock the handler starts.',
        'Queueing before the handler runs is invisible to a span that begins on the first line of the handler.',
      ],
      expectedOutline: [
        'About 90 ms is outside the handler span. Some of that can be network and proxy time. A large gap that grows with CPU is queueing before the handler.',
        'Start the trace at accept, or measure event-loop delay and run-queue time.',
        'Do not blame the database for time that is not inside its span.',
      ],
      referenceSolution:
        'The client\'s 120 ms includes everything from send to response. The handler span covers 30 ms. The missing 90 ms is in the path before or around that span: the proxy, the kernel, TLS, and time the accepted connection waited before the handler thread ran it. When a core or event loop is saturated, that wait grows and the database span stays at 30 ms. Blaming the database repeats the chart error from the morning.\n\nInstrument the request from accept, or from the proxy\'s receipt, and record event-loop delay or the delay between accept and handler start. Then the next incident shows queueing as its own number. The change to make if that number is the problem is to get work off the saturated thread, not to tune a database that is inside its budget.',
      rubric: [
        { id: 'gap', description: 'The missing time is outside the handler span, and the database is not assumed guilty.', conceptId: 'concept.cpu' },
        { id: 'instrument', description: 'The next measurement includes queueing or event-loop delay before the handler.', conceptId: 'concept.cpu' },
      ],
      misconceptions: [
        { id: 'span-is-request', statement: 'The handler span is the request latency.', correction: 'A span measures the clocks it was given. Time before the span starts is invisible to it.' },
      ],
      engineeringContext:
        'This is why proxy logs and application logs disagree during CPU saturation. The proxy saw the request earlier. The application saw it after the queue.',
      extensionQuestions: [
        'If the gap is stable at 15 ms even when CPU is idle, where would you look instead?',
      ],
      acceptableAlternatives: [
        'A proxy timing breakdown is a valid measurement if it isolates time before the application starts work.',
      ],
      tradeoffs: [
        'Tracing every request from accept has a cost. A cheap delay histogram often finds the queue with less overhead.',
      ],
      commonMistakes: [
        'Adding a database index for latency that never entered the database span.',
      ],
      followUps: [
        'What slack would you leave in the 100 ms budget for a GC pause or a core stall?',
      ],
    },
  }),
];
