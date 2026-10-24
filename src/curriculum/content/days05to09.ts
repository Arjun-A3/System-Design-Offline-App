import { buildFullDay } from '../author';
import type { CurriculumDay } from '../types';

export const days05to09: CurriculumDay[] = [
  buildFullDay({
    day: 5,
    phaseId: 'foundations',
    title: 'Linux for a running service',
    morning: {
      title: 'Processes, files, and signals',
      conceptIds: ['concept.linux', 'concept.process'],
      objectives: [
        'Use the Linux process and file model to explain what a service is doing.',
        'Choose a signal that matches the shutdown behavior you want.',
      ],
      durationMinutes: 16,
      difficulty: 'foundational',
      whyItMatters:
        'When a deploy fails, the useful facts are on the machine: is the process alive, what is it waiting on, and did the shutdown signal ask it to finish or kill it mid-request.',
      explanation:
        'On Linux, a service is a process tree. The parent you start from a supervisor may fork workers. Looking only at the parent can miss the process that is actually using CPU. Each process has a state: running, sleeping on I/O, stopped, or zombie. A zombie is an exited child whose parent has not collected its status. It is not using CPU. A process stuck in uninterruptible sleep is waiting on the kernel, often storage, and will not handle your signal until that wait ends.\n\nFiles are the other half of the model. Sockets, pipes, and ordinary files are all file descriptors. A leaked descriptor eventually hits the process limit and new connections fail with an error that looks like a network problem. The working directory, environment, and user id are part of how the process was started. A deploy that changes the user without changing file permissions fails before the first request.\n\nSignals are how the kernel and supervisors ask a process to do something. SIGTERM asks it to shut down. A careful server stops accepting, finishes or times out in-flight requests, and exits. SIGKILL cannot be handled. The process ends immediately, which is the same class of failure as the OOM kill: no cleanup, no final log from the application. SIGQUIT or a user-defined dump can be useful in development and dangerous on a live box if it pauses the process.\n\nLogs are files or a socket to a collector. If the disk is full, the logger can block the request thread. The service is then "up" and unable to finish work.',
      question:
        'A deploy script sends SIGKILL ten seconds after SIGTERM because the old process "takes too long". In-flight checkout requests fail during every deploy. What is the script destroying, and what shutdown contract would you replace it with?',
      hints: [
        'SIGTERM can be handled. SIGKILL cannot.',
        'Ten seconds may be less than a legitimate downstream timeout the process is still waiting on.',
      ],
      expectedOutline: [
        'SIGKILL drops in-flight requests and skips cleanup.',
        'The process was probably draining, not stuck, if the only symptom is failed checkouts during deploys.',
        'Stop accepting, drain for a budget aligned with request timeouts, then escalate to KILL only for a stuck process.',
        'Readiness should fail before the drain so new traffic goes elsewhere.',
      ],
      referenceSolution:
        'SIGTERM asked the process to shut down. A correct handler stops accepting new connections and finishes requests already in flight, up to a deadline. SIGKILL ends the process immediately. Those checkout requests were still running, and the script treated a drain as a hang. Clients see broken connections. Transactions that had not committed roll back or, worse, a call that committed and then died before the response looks like a failure and gets retried.\n\nReplace the contract. Mark the instance not ready so the load balancer stops sending new work. Send SIGTERM. Wait for a drain budget that covers the real request deadline, not an arbitrary ten seconds. Only if the process is still alive after that budget, and you have evidence it is stuck rather than draining, send SIGKILL. Log the escalation. A process that always needs KILL has a shutdown bug. A process that needs twenty seconds to finish checkouts does not.',
      rubric: [
        { id: 'signals', description: 'SIGTERM is a request to drain. SIGKILL drops in-flight work.', conceptId: 'concept.linux' },
        { id: 'contract', description: 'Readiness fails first, the drain matches the request budget, and KILL is the last resort.', conceptId: 'concept.linux' },
      ],
      misconceptions: [
        { id: 'kill-is-polite', statement: 'SIGKILL is just a faster graceful shutdown.', correction: 'SIGKILL cannot be caught. The process does not flush, acknowledge, or finish the request.' },
      ],
      engineeringContext:
        'Orchestrators send SIGTERM and then SIGKILL after terminationGracePeriodSeconds. Setting that period below your longest honest request recreates this script inside the cluster. Readiness probes are how you stop new work before the signal.',
      extensionQuestions: [
        'What would you inspect if the process ignored SIGTERM entirely?',
      ],
      acceptableAlternatives: [
        'A pre-stop hook that fails readiness and waits is a valid expression of the same contract.',
      ],
      tradeoffs: [
        'A long grace period slows deploys and protects in-flight work. A short one does the opposite.',
      ],
      commonMistakes: [
        'Equating "the process has not exited" with "the process is wedged" during a drain.',
      ],
      followUps: [
        'How do you tell a draining process from one blocked on a full disk?',
      ],
    },
    evening: {
      title: 'A service that will not start',
      conceptIds: ['concept.linux'],
      objectives: [
        'Separate a process that never started from a process that started and immediately exited.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      whyItMatters:
        'The evening case is the deploy you will actually debug. The useful habit is a short, ordered check rather than a restart loop.',
      explanation:
        'A supervisor reports "restarting" when the process exits. Exit code 127 often means the executable was not found. Exit code 1 is the application\'s own failure. A permission error on a config file, a missing environment variable, and a port already in use are different failures with different owners.\n\nIf the process never appears, the supervisor did not start it or could not exec it. If it appears and exits, the application ran far enough to fail. If it stays up and fails readiness, it is running and unwilling to receive traffic. Those three states suggest three different next commands. Restarting blindly destroys the evidence in the exit code and the first log lines.',
      question:
        'After a deploy, the supervisor shows the new process exiting every few seconds. The previous version is still serving. You can read logs and the exit status. List the checks in the order you would run them, and name one check that is a waste of time until those pass.',
      hints: [
        'The exit status is the process telling you why it left.',
        'A load test of the old version does not explain the new process exiting.',
      ],
      expectedOutline: [
        'Read the exit code and the logs written before the exit.',
        'Confirm the binary, user, working directory, and config path the supervisor used.',
        'Check the specific resource named in the error: port, file permission, missing variable, or database connectivity.',
        'Do not tune autoscaling or the old version\'s CPU until the new process can stay up.',
      ],
      referenceSolution:
        'Start with the exit code and the last lines the process wrote. Those distinguish "executable not found", "config unreadable", "address already in use", and "application refused to boot". Then confirm the supervisor\'s command, user, and working directory match the artifact you built. A path that worked in a shell and fails under the service user is a permission or environment bug.\n\nOnly after the error names a resource do you inspect that resource. A port conflict means finding the process that holds it. A missing variable means fixing the unit file, not the code. A database error means the network path from this host, which may differ from your laptop.\n\nA waste of time at this stage is profiling the healthy old version or changing instance size. The new process is not serving. Capacity is not the question until a process stays up and fails under load.',
      rubric: [
        { id: 'order', description: 'Exit status and early logs come before capacity theories.', conceptId: 'concept.linux' },
        { id: 'states', description: 'The answer distinguishes exec failure, application exit, and a running process that is not ready.', conceptId: 'concept.linux' },
      ],
      misconceptions: [
        { id: 'restart-loop', statement: 'If the supervisor is restarting it, the fix is to restart the supervisor.', correction: 'The supervisor is already doing the only thing a restart does. The exit reason is the evidence.' },
      ],
      engineeringContext:
        'This is the same discipline as a crash loop in an orchestrator. The pod status and the previous container logs are the exit code and the last lines. Describing the cluster product is optional. The order of checks is not.',
      extensionQuestions: [
        'The process stays up, passes a TCP check, and fails a HTTP readiness check. What changed about your theory?',
      ],
      acceptableAlternatives: [
        'Naming specific Linux commands is fine if the order of evidence stays the same.',
      ],
      tradeoffs: [
        'Capturing a core dump on every boot failure can fill a disk. Capturing the exit code and logs is the cheaper default.',
      ],
      commonMistakes: [
        'Debugging the healthy version because it is the one you can call.',
      ],
      followUps: [
        'What would you preserve before the next restart so the failure is still explainable?',
      ],
    },
  }),
  buildFullDay({
    day: 6,
    phaseId: 'foundations',
    title: 'Networks, ports, and sockets',
    morning: {
      title: 'Packets, ports, and sockets',
      conceptIds: ['concept.network'],
      objectives: [
        'Describe a connection as a pair of sockets, not as "the network" in the abstract.',
        'Predict which failures a client can see when a packet is dropped or a port is closed.',
      ],
      durationMinutes: 16,
      difficulty: 'foundational',
      resourceIds: ['resource.rfc9293'],
      whyItMatters:
        'Timeouts, "connection refused", and "connection reset" are different faults. Treating them as one "network error" leads to retries that make the real fault worse.',
      explanation:
        'IP moves packets between hosts. A packet can be dropped, delayed, duplicated, or reordered. The network does not promise that a packet arrives. TCP, which you will study next, is what adds a reliable byte stream on top of that unreliable delivery.\n\nA port is a number on a host that lets many programs share one address. A socket is one end of a communication. A TCP connection is a pair of sockets: source address, source port, destination address, destination port. Two connections to the same service port are distinct because the client ports differ.\n\nThe server listens on a socket. The listen backlog is a queue of connections the kernel has accepted at the TCP level and the application has not yet taken. When that queue is full, new clients fail or time out even though the process is "running".\n\nNames you will see in errors are precise. Connection refused means the host was reached and nothing was listening, or a firewall rejected it with a reset. A timeout means packets were sent and no acceptable answer came back. Those are different places to look. Refused is often the wrong port, a crashed process, or a security group. Timeout is often a drop, a route, or a server that is too busy to answer.',
      question:
        'Clients of a payments service report two errors at once. Some see "connection refused" immediately. Others wait three seconds and time out. The process is running on some hosts and absent on others. Explain both errors without calling them the same failure.',
      hints: [
        'Refused is an answer. A timeout is the absence of an answer.',
        'A load balancer can send different clients to different hosts.',
      ],
      expectedOutline: [
        'Refused: a host was reachable and nothing accepted the port, or it actively rejected the packet.',
        'Timeout: packets did not produce a response before the client gave up. The process may be wedged, the path may drop packets, or a firewall may discard them.',
        'Both can happen together if clients land on different hosts.',
        'Retries are not equally safe, and they are not the diagnosis.',
      ],
      referenceSolution:
        'Connection refused is a fast negative answer. The packet reached a host that sent a reset, typically because no process was listening on that port. Hosts where the process is absent explain that group. A firewall that rejects, rather than drops, can look similar.\n\nA timeout is not an answer. The client sent packets and waited. That fits a host where the process is wedged and not accepting, a full listen backlog, a path that drops packets, or a firewall that discards them. The three seconds is the client\'s deadline, not the network\'s diagnosis.\n\nSeeing both errors means clients are not all talking to the same state. A load balancer, DNS with more than one address, or a client-side list of hosts will do that. The fix starts by splitting the errors by destination address. Restarting every host because "the network is flaky" hides which hosts refused and which hosts never answered.',
      rubric: [
        { id: 'refused', description: 'Connection refused is an active rejection from a reached host.', conceptId: 'concept.network' },
        { id: 'timeout', description: 'A timeout is a missed deadline, not a positive error from the server.', conceptId: 'concept.network' },
        { id: 'split', description: 'Both errors can be true if clients reach different hosts.', conceptId: 'concept.network' },
      ],
      misconceptions: [
        { id: 'same-error', statement: 'Connection refused and timeout are two wordings of a down network.', correction: 'Refused is a response. Timeout is silence. They point at different hops.' },
      ],
      engineeringContext:
        'Client libraries often wrap both in one exception type. The text or the error code underneath still matters. A retry budget spent on "refused" during a bad deploy hammers the hosts that are down and does nothing for a black-holed route.',
      extensionQuestions: [
        'What does a full listen backlog look like to the client, and how is that different from a crashed process?',
      ],
      acceptableAlternatives: [
        'Mentioning ICMP or a firewall drop is valid if refused and timeout stay distinct.',
      ],
      tradeoffs: [
        'A short connect timeout detects a black hole faster and gives up on a slow-but-alive path. A long one hides outages.',
      ],
      commonMistakes: [
        'Retrying both errors with the same policy because the library used one type.',
      ],
      followUps: [
        'Which error should remove a host from a client pool immediately?',
      ],
    },
    evening: {
      title: 'Refused, reset, and timeout',
      conceptIds: ['concept.network'],
      objectives: [
        'Pick an operator action that matches the socket error rather than the symptom "users cannot pay".',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      resourceIds: ['resource.rfc9293'],
      whyItMatters:
        'The on-call move is different for each error. This session makes you commit to one first check per error.',
      explanation:
        'Connection reset means a peer or a middlebox aborted an existing connection. The TCP session was established, then someone sent a reset or a local write failed because the peer had gone. That is different from never connecting.\n\nA practical triage is a table. Refused: check the process and the port on the destination. Reset: check a crash, a proxy idle timeout, or a protocol mismatch after connect. Timeout: check drops, routes, security groups that discard, and a server that is not reading its socket.',
      question:
        'Write the first check you would run for each of these three client errors, and say which one is a reason to fail the instance out of the load balancer immediately: connection refused, connection reset during a request, and a connect timeout.',
      hints: [
        'Immediate removal is for a destination that is positively not serving, when you can see that.',
        'A single reset can be a client that went away. A wave of resets is a server or a proxy.',
      ],
      expectedOutline: [
        'Refused: confirm a listener on that host and port. This is the strongest reason to stop sending traffic there.',
        'Reset mid-request: look for a crashing worker, a proxy timeout, or a protocol error. Do not equate one reset with a dead host.',
        'Connect timeout: check the path and whether packets are discarded. Do not assume the process is down.',
      ],
      referenceSolution:
        'For connection refused, check that the process is listening on the expected address and port. If it is not, remove that instance. Sending more clients there will fail fast and waste a retry budget.\n\nFor a reset during a request, the connection existed. Look at worker crashes, a proxy or load balancer idle timeout shorter than the request, and a server that closed because it could not parse the request. One reset from a client that hung up is normal. A surge correlated with deploys is a drain bug or a crash. Failing the instance out is justified when the resets come from the server dying, not as a reflex to the word "reset".\n\nFor a connect timeout, the destination did not answer. Check routes, security rules that drop packets, and whether the host is so overloaded it cannot complete the handshake. Removing the instance helps only if you have another path. If every instance times out, the fault is shared: a route, a firewall, or a full fleet. Failing them all out leaves you with nothing.',
      rubric: [
        { id: 'three-checks', description: 'Each error has a distinct first check.', conceptId: 'concept.network' },
        { id: 'removal', description: 'Immediate removal is tied to a host that is positively not listening, not to every error.', conceptId: 'concept.network' },
      ],
      misconceptions: [
        { id: 'reset-means-down', statement: 'Any connection reset means the server process is down.', correction: 'A reset aborts one connection. The listener may still be up. Crashes, proxies, and clients all send resets.' },
      ],
      engineeringContext:
        'Health checks should use the same distinction. A TCP check only proves a listener. It stays green through an application that resets every HTTP request. An application check that times out should have a different consecutive-failure count than a refused connection, because one is silence and the other is a no.',
      extensionQuestions: [
        'Why can a security group that drops packets look healthier in one metric and worse in another than a security group that rejects them?',
      ],
      acceptableAlternatives: [
        'A different first command is fine if it still targets the listener, the abort, or the path respectively.',
      ],
      tradeoffs: [
        'Failing out quickly on refused errors limits damage. Failing out on the first timeout can eject every host during a brief network blip.',
      ],
      commonMistakes: [
        'Using one retry policy and one health-check threshold for all three errors.',
      ],
      followUps: [
        'What evidence would make you put a timed-out host back in rotation?',
      ],
    },
  }),
  buildFullDay({
    day: 7,
    phaseId: 'foundations',
    title: 'DNS',
    morning: {
      title: 'Name resolution and TTL',
      conceptIds: ['concept.dns'],
      objectives: [
        'Trace a lookup from a process to an answer it will cache.',
        'Explain why a DNS change is not an instant cutover.',
      ],
      durationMinutes: 16,
      difficulty: 'foundational',
      resourceIds: ['resource.rfc1035'],
      whyItMatters:
        'Deploys, failovers, and "it works on my machine" outages often sit in a cache of a name, not in the process you restarted.',
      explanation:
        'Applications rarely talk to a name. They talk to an address. DNS is the lookup that turns a name into addresses, plus a time to live that says how long a resolver may remember the answer.\n\nA typical lookup does not go from your process to the authoritative server. The process asks a stub resolver, which asks a recursive resolver, which may answer from its cache. Only a miss or an expiry walks the hierarchy: root, TLD, then the authoritative server for the zone. Negative answers are cached too. A name that failed to resolve can keep failing until the negative TTL expires.\n\nTTL is an upper bound on how long a well-behaved cache may keep an answer, not a promise that every cache will refresh on that second. Some resolvers ignore low TTLs. Clients also cache. A Java virtual machine or a long-lived HTTP client may keep an address for the life of the process. Changing the authoritative record does not reach them until they look up again.\n\nMultiple addresses are normal. The client picks one, often the first, and may or may not try the next if the connection fails. Publishing two addresses is not the same as a health-checked load balancer.',
      question:
        'You change an authoritative DNS record so a hostname points at a new load balancer, with a TTL of 60 seconds. An hour later a fraction of clients still reach the old balancer, and a few fail because the old balancer is gone. Why is that possible, and what would you have done before deleting the old balancer?',
      hints: [
        'Sixty seconds binds caches that honor the TTL. It does not bind a process that resolved the name once at startup.',
        'The old address has to keep working through the longest cache you do not control.',
      ],
      expectedOutline: [
        'Recursive resolvers, OS caches, and application caches can hold the old address.',
        'Some caches outlive the published TTL.',
        'Deleting the old balancer before those caches expire strands clients that still have the old address.',
        'Overlap: keep the old target healthy until observed traffic to it drains.',
      ],
      referenceSolution:
        'The TTL limits well-behaved resolvers. It does not flush every cache on the internet, and it does not restart a process that looked up the name at boot and stored the address. An hour later, a client can still be connecting to the old address because a resolver ignored the TTL, a corporate resolver caches longer, or the application never re-resolved.\n\nThose clients fail when the old balancer is gone because the name they already resolved no longer has a machine behind it. DNS cannot push an update to them.\n\nBefore deleting the old balancer, lower the TTL ahead of the change and wait out the previous TTL, keep the old target accepting traffic, and watch connections to the old address rather than the clock. Remove it when that traffic is gone, or when you have decided the remaining clients are an accepted loss. A 60-second TTL set at the moment of the change does not speed up caches that already stored the previous, longer TTL.',
      rubric: [
        { id: 'caches', description: 'More than one cache can outlive the new TTL, including the application itself.', conceptId: 'concept.dns' },
        { id: 'overlap', description: 'The old target stays up until traffic that still has the old address drains.', conceptId: 'concept.dns' },
      ],
      misconceptions: [
        { id: 'ttl-flush', statement: 'Setting a TTL of 60 seconds updates every client within a minute.', correction: 'TTL bounds the next refresh of caches that honor it. Existing answers and stubborn caches remain.' },
      ],
      engineeringContext:
        'Failover that depends on DNS inherits this lag. Health-checked load balancers move traffic faster because they do not wait for the world to forget an address. DNS still decides which balancer a client found in the first place.',
      extensionQuestions: [
        'Why can a failed lookup keep failing after you have created the record?',
      ],
      acceptableAlternatives: [
        'Discussing a specific runtime DNS cache is valid if the overlap conclusion stays.',
      ],
      tradeoffs: [
        'A low TTL fails over faster and increases lookup traffic and dependence on the resolvers. A high TTL is robust and slow to change.',
      ],
      commonMistakes: [
        'Lowering the TTL at the moment of the cut instead of one previous-TTL earlier.',
      ],
      followUps: [
        'How would you observe that clients still use the old address?',
      ],
    },
    evening: {
      title: 'A bad record and a long cache',
      conceptIds: ['concept.dns'],
      objectives: [
        'Plan a rollback that respects caches instead of only the authoritative zone.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      resourceIds: ['resource.rfc1035'],
      whyItMatters:
        'Rollback is not "change the record back" if half the clients have not observed the bad record and half have cached it.',
      explanation:
        'A bad DNS change splits the world into clients that cached the old answer, clients that cached the new bad answer, and clients that have not looked up yet. Reverting the authoritative record starts a new TTL clock. It does not erase the bad answer from caches that already took it.\n\nIf the bad target is broken, clients with that cache fail until expiry. If you can make the bad target forward to the healthy one, those clients recover without waiting for DNS. That is often the faster rollback.',
      question:
        'A DNS change sends a hostname to a new cluster that fails every health check. Some clients still use the old cluster and are healthy. You can edit DNS, and you can still change the new cluster. What do you do in the first few minutes, and why is "revert DNS and restart clients" incomplete?',
      hints: [
        'Clients you cannot restart are the ones holding the bad address.',
        'The new cluster\'s address is already cached by someone. Make that address useful, or accept their TTL.',
      ],
      expectedOutline: [
        'Stop the bleeding for clients that already cached the bad address by making that target respond or proxy to the healthy cluster.',
        'Revert the authoritative record so new lookups go to the old cluster.',
        'Restarting clients you do not control is not a plan.',
        'Watch traffic on both addresses.',
      ],
      referenceSolution:
        'Clients with the old cache are fine. Leave them. Clients with the bad cache will not notice a DNS revert until their cache expires, and you cannot restart them. In the first minutes, make the new cluster\'s address safe: point its load balancer at the healthy service, or publish a proxy that forwards to the old cluster. Then revert the authoritative record and, if you had not already, set a low TTL so the bad answer does not live longer than necessary in caches that have not fetched it yet.\n\n"Revert and restart clients" fixes the clients you operate. Phones, partner servers, and recursive resolvers will not restart on your schedule. The recoverable move is to make both addresses reach a working system until you can see the bad address go quiet.',
      rubric: [
        { id: 'cached-bad', description: 'Clients that cached the bad address are handled without assuming they will refresh immediately.', conceptId: 'concept.dns' },
        { id: 'revert', description: 'The authoritative record is corrected so new lookups stop receiving the bad target.', conceptId: 'concept.dns' },
      ],
      misconceptions: [
        { id: 'revert-is-instant', statement: 'Reverting the zone file rolls every client back.', correction: 'It changes the next answer. Cached bad answers remain until they expire or the cached address starts working.' },
      ],
      engineeringContext:
        'This is why risky DNS changes are made when the old and new targets can both serve, and why anycast or a stable load-balancer address is easier to operate than a record you must chase.',
      extensionQuestions: [
        'What if the bad change replaced the address with one you do not control?',
      ],
      acceptableAlternatives: [
        'If you cannot make the bad target healthy, waiting out the TTL is the honest fallback, and you should say who is impaired until then.',
      ],
      tradeoffs: [
        'Proxying the bad target recovers clients and adds a hop you must remember to remove. Leaving it broken is simpler and punishes anyone who cached it.',
      ],
      commonMistakes: [
        'Restarting only the application servers, which are not the clients holding the cache.',
      ],
      followUps: [
        'How long would you keep the temporary proxy, and what metric lets you remove it?',
      ],
    },
  }),
  buildFullDay({
    day: 8,
    phaseId: 'foundations',
    title: 'TCP',
    morning: {
      title: 'A reliable stream on an unreliable network',
      conceptIds: ['concept.tcp', 'concept.network'],
      objectives: [
        'Explain what TCP guarantees and what it deliberately does not.',
        'Connect retransmission and congestion control to tail latency.',
      ],
      durationMinutes: 18,
      difficulty: 'foundational',
      resourceIds: ['resource.rfc9293'],
      whyItMatters:
        'Retries at the application layer sit on top of retries TCP is already doing. Two layers of retry, with no deadline, are how a small loss becomes an outage.',
      explanation:
        'TCP gives a process an ordered byte stream. It detects loss with acknowledgements and retransmits. It does not give you message boundaries. Two writes can arrive as one read, and one write can arrive as two reads. Framing is the application\'s job. HTTP is a framing protocol on top of this stream.\n\nThe handshake takes a round trip before the client can send data, unless a later optimization applies. A failed handshake is the connect timeout you saw earlier. After the connection exists, loss does not fail the socket immediately. TCP retransmits, backing off. The application blocks or waits. Tail latency moves before the error rate does.\n\nCongestion control slows a sender when the path is full. That is the network protecting itself. A sender that ignored loss would make the loss worse. The practical effect is that a busy link shows up as lower throughput and higher delay, not as a clean error.\n\nTCP is not end-to-end application reliability. A connection can succeed and the process behind it can still fail after reading the bytes. The client knows the server\'s kernel accepted the bytes, not that the business operation committed. And a connection reset aborts the stream. Bytes the application had not finished handling are not "safely delivered" in any product sense.\n\nHead-of-line blocking follows from the ordered stream. If byte 10 is lost, bytes 11 through 100 wait even if they arrived. One lost packet stalls every request sharing that connection.',
      question:
        'A client sends one HTTP request on a long-lived TCP connection. A packet is lost in the response. The client library has a retry that fires at 200 ms. Explain what TCP is already doing at that moment, and why the retry can make this request worse.',
      hints: [
        'Loss on an established connection is retransmission, not a new handshake.',
        'The first request may still be running on the server when the retry creates a second one.',
      ],
      expectedOutline: [
        'TCP retransmits the missing bytes and holds later bytes so the stream stays ordered.',
        'The application sees delay, not an immediate error.',
        'A retry at 200 ms can duplicate the request while the first is still in flight.',
        'Duplicate work is safe only if the operation is idempotent, which TCP does not know.',
      ],
      referenceSolution:
        'TCP has already detected or is about to detect the hole in the stream. It retransmits the missing segment and will not deliver later bytes to the application out of order. The request is delayed by at least one round trip plus the retransmission timer, which may be longer than 200 ms. From the client library\'s view, the response has not completed. From TCP\'s view, the connection is still healthy and recovering.\n\nFiring a second request at 200 ms does not cancel the first. The server may be executing both. TCP will not merge them or know they are the same payment, the same email, or the same insert. If the operation is not idempotent, the retry creates a second side effect. If the loss was caused by congestion, the extra request adds load to a path that was already dropping packets.\n\nThe sound pattern is a deadline longer than a reasonable retransmission, cancellation or deduplication on the server, and a retry only when the client knows the first attempt will not commit twice. TCP already retried the bytes. The application should not blindly retry the business operation on the same short fuse.',
      rubric: [
        { id: 'retransmit', description: 'TCP retransmits and preserves order. The socket is not instantly dead.', conceptId: 'concept.tcp' },
        { id: 'duplicate', description: 'The application retry can run concurrently with the original and is not TCP\'s job to prevent.', conceptId: 'concept.tcp' },
      ],
      misconceptions: [
        { id: 'tcp-messages', statement: 'TCP delivers the write as one message.', correction: 'TCP delivers an ordered byte stream. Message boundaries belong to the application.' },
        { id: 'tcp-exactly-once', statement: 'TCP provides exactly-once request handling.', correction: 'TCP retransmits bytes. It does not know whether the application committed the operation before a crash or a retry.' },
      ],
      engineeringContext:
        'HTTP/2 multiplexes requests on one TCP connection, so a loss stalls every stream on that connection. That is head-of-line blocking in production clothes. Timeouts that are shorter than TCP recovery turn ordinary loss into application errors and then into extra load.',
      extensionQuestions: [
        'Why can a single slow or lossy connection stall many HTTP/2 requests that would have been independent on separate connections?',
      ],
      acceptableAlternatives: [
        'Discussing QUIC or HTTP/3 is a valid contrast if you still describe TCP\'s ordered retransmission correctly.',
      ],
      tradeoffs: [
        'One long-lived connection avoids handshakes and couples requests together under loss. Many short connections isolate loss and spend round trips on setup.',
      ],
      commonMistakes: [
        'Setting a client timeout below the path\'s retransmission behavior and calling the resulting errors "random network flakes".',
      ],
      followUps: [
        'What server-side token would make the retry safe if the client cannot avoid it?',
      ],
    },
    evening: {
      title: 'A retry on top of a retransmission',
      conceptIds: ['concept.tcp'],
      objectives: [
        'Choose a timeout and a retry policy that respects TCP recovery and duplicate work.',
      ],
      durationMinutes: 16,
      difficulty: 'foundational',
      resourceIds: ['resource.rfc9293', 'resource.aws-timeouts'],
      whyItMatters:
        'The morning mechanism becomes a policy: when to wait, when to retry, and when a second request is a second charge.',
      explanation:
        'A connect timeout bounds the handshake. A request timeout bounds the whole operation. They should not be the same number copied into every client. A read timeout that resets on each received byte can wait forever on a trickle. A deadline measured from the start of the call cannot.\n\nIf you retry, budget the retries. Three retries at the same timeout can hold a user for four times the deadline and send four times the load. A jittered backoff spreads retries. It does not make a non-idempotent POST safe.',
      question:
        'Checkout submits a payment. The client times out at 200 ms and retries up to three times with no backoff. P99 of the payment service is 400 ms, and packet loss in the region is non-zero. Customers are charged twice. Explain the mechanism and replace the policy.',
      hints: [
        'P99 of 400 ms means a 200 ms timeout fails a large fraction of healthy requests.',
        'The first payment may commit after the client has given up.',
      ],
      expectedOutline: [
        'The timeout is below normal tail latency, so healthy calls look failed.',
        'TCP may still be recovering, and the server may still commit.',
        'The retry is a second payment because nothing deduplicates it.',
        'Use a deadline above the real tail, an idempotency key, and a capped retry budget with backoff.',
      ],
      referenceSolution:
        'A 200 ms timeout abandons calls that would have succeeded at the observed 400 ms tail, and it abandons calls whose TCP retransmission simply needed another round trip. The server does not know the client gave up. It can commit the charge and then fail to deliver the response. The client\'s retry creates a second charge because the request has no idempotency key and the server treats it as new work. Three immediate retries multiply load during the loss event that made things slow.\n\nReplace it with a deadline set from the latency you are willing to hide, above the normal tail and above one retransmission, not copied from a default of 200 ms. Send an idempotency key so a retry returns the original charge instead of creating one. Cap attempts, back off with jitter, and stop when the user\'s overall deadline is spent. Do not retry a connect refusal to a host you already know is down as aggressively as you wait on a slow but open connection.\n\nMeasure duplicate charges and timeout rate together. A falling timeout rate that coincides with rising double charges is this bug.',
      rubric: [
        { id: 'timeout', description: 'The timeout is inside normal tail latency and TCP recovery, so it creates false failures.', conceptId: 'concept.tcp' },
        { id: 'idempotency', description: 'The replacement deduplicates the payment and caps retry load.', conceptId: 'concept.tcp' },
      ],
      misconceptions: [
        { id: 'timeout-cancels', statement: 'A client timeout cancels the server\'s work.', correction: 'The timeout stops the client waiting. The server keeps going unless a cancellation signal reaches it and it honors that signal.' },
      ],
      engineeringContext:
        'Payment, order creation, and email sends are where this bug becomes money or spam. Idempotency keys are the application-level answer TCP cannot provide. You will use them again on every unsafe retry.',
      extensionQuestions: [
        'What should the server return if it sees the same idempotency key while the first charge is still in progress?',
      ],
      acceptableAlternatives: [
        'A queue that accepts the checkout once and lets the client poll is a valid replacement for inline retries.',
      ],
      tradeoffs: [
        'A longer client deadline holds connections and threads. A shorter one fails healthy slow calls and invites duplicate retries.',
      ],
      commonMistakes: [
        'Adding retries without changing the timeout that caused the false failure.',
      ],
      followUps: [
        'How would you test the double-charge case without waiting for packet loss in production?',
      ],
    },
  }),
  buildFullDay({
    day: 9,
    phaseId: 'foundations',
    title: 'TLS',
    morning: {
      title: 'What TLS provides',
      conceptIds: ['concept.tls', 'concept.tcp'],
      objectives: [
        'State the guarantees TLS gives a connection and the guarantees it does not give a business operation.',
        'Account for handshake cost and certificate expiry as production failures.',
      ],
      durationMinutes: 16,
      difficulty: 'foundational',
      resourceIds: ['resource.rfc8446'],
      whyItMatters:
        'TLS is why clients trust the server they reached. It is also a handshake, a certificate clock, and a CPU cost that show up in incidents that have nothing to do with "hacking".',
      explanation:
        'TLS runs over a transport, usually TCP. After the handshake, application bytes are encrypted and authenticated. An observer on the path can see that traffic exists, and can often see the name of the server through DNS or, historically, the certificate, but cannot read or quietly alter the HTTP body. That is confidentiality and integrity of the bytes on that connection.\n\nThe handshake authenticates the server by a certificate chain the client already trusts. The client checks the name, the dates, and the chain. If the certificate expired at midnight, every client that checks dates fails at once. That is a correlated outage caused by a clock, not by load.\n\nThe handshake costs round trips and CPU. Session resumption and tickets exist so a returning client can skip part of that work. A fleet that disables resumption, or a load balancer that breaks it, spends CPU on every new connection. Terminating TLS at a proxy moves that CPU to the proxy and means the hop behind the proxy is a different trust decision. Encryption to the proxy is not encryption to the application unless the second hop is also authenticated.\n\nTLS does not mean the client is a particular user, and it does not mean the request is authorized. It does not make a payment idempotent. It does not hide the size and timing of requests completely. Those are application problems wearing a padlock icon.',
      question:
        'Certificates on a public API expire at 00:00 UTC. What fails, what still runs, and why does adding more application servers not help? Include the handshake, not just the word "security".',
      hints: [
        'The application process can be healthy and still be unreachable to any client that validates certificates.',
        'Clients fail before they send the HTTP request if the handshake rejects the certificate.',
      ],
      expectedOutline: [
        'Clients reject the certificate during the handshake. The HTTP handler may see no request at all.',
        'Servers keep running. Their health checks may still pass if they do not validate as a public client would.',
        'More servers with the same expired certificate add capacity nobody can use.',
        'The fix is a valid certificate, ideally installed before expiry, with a clock and a monitor on the not-after date.',
      ],
      referenceSolution:
        'A client that validates certificates aborts the TLS handshake when the certificate\'s not-after time has passed. The TCP connection may exist, and then TLS fails. The application never sees an HTTP request from that client. Users see an SSL or certificate error, which is immediate and correlated across every client that reaches the expired certificate.\n\nThe process can be up, the port open, and a health check that only dials TCP still green. A health check that does not validate the public certificate will lie. Adding servers does nothing if they present the same expired chain. The scarce resource is a certificate clients will accept, not CPU.\n\nThe operational fix is to renew and install the certificate before expiry, and to alert on the not-after date with enough lead time to survive a long weekend and a broken renewal job. After expiry, installing a valid certificate restores handshakes without a code deploy. Clients do not need to wait for a DNS TTL if the name did not change.',
      rubric: [
        { id: 'handshake', description: 'Failure happens in certificate validation during the handshake, before the handler.', conceptId: 'concept.tls' },
        { id: 'capacity', description: 'More servers with the same certificate do not restore trust.', conceptId: 'concept.tls' },
        { id: 'detect', description: 'TCP health checks can stay green, so the expiry itself has to be monitored.', conceptId: 'concept.tls' },
      ],
      misconceptions: [
        { id: 'tls-is-login', statement: 'TLS proves which user is calling.', correction: 'A normal server certificate proves the server\'s name to the client. User identity is a separate application or mutual-TLS concern.' },
      ],
      engineeringContext:
        'Certificate expiry is one of the few outages with a known timestamp. It still happens because renewal is a side system: a cron job, a DNS challenge, a secret that was not reloaded by the proxy. The process that needs the new certificate is often not the process that requested it.',
      extensionQuestions: [
        'Where can a certificate be valid on the application and expired on the load balancer in front of it?',
      ],
      acceptableAlternatives: [
        'Describing mutual TLS for service-to-service auth is a useful extension if you still answer the public expiry case.',
      ],
      tradeoffs: [
        'Short-lived certificates limit the damage of a leaked key and require automation that must not fail quietly. Long-lived certificates fail less often and fail bigger.',
      ],
      commonMistakes: [
        'Reloading the application and not the proxy that actually terminates TLS.',
      ],
      followUps: [
        'What alert threshold would have fired before midnight rather than at midnight?',
      ],
    },
    evening: {
      title: 'Certificate expiry on a Friday',
      conceptIds: ['concept.tls'],
      objectives: [
        'Order the response to an expiry incident and the prevention that should have existed.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      resourceIds: ['resource.rfc8446'],
      whyItMatters:
        'The useful skill is knowing which knob restores traffic. Restart, scale, and rollback do not, if the certificate is the fault.',
      explanation:
        'During an expiry, clocks and copies matter. The proxy has a certificate. The application might have another. A mobile client may pin a specific certificate or public key and reject the renewed one. A health check from inside the cluster may trust a private CA the public client does not.\n\nThe first restoration is to present a chain the failing clients trust, on the machine that terminates their handshake. Everything else is secondary.',
      question:
        'It is 00:10 UTC and public clients fail certificate validation. Internal health checks are green. You can install files on the proxy, restart processes, or scale the fleet. What do you do first, and what do you check if a new certificate is installed and clients still fail?',
      hints: [
        'Internal checks may not use the public trust store.',
        'A new certificate in the wrong file, or a proxy that has not reloaded, still presents the old one.',
      ],
      expectedOutline: [
        'Install a currently valid chain on the TLS terminator and reload it.',
        'Confirm with a client that uses public trust, not only the internal probe.',
        'If clients still fail, check the name, the chain order, the proxy reload, and pinning.',
        'Scaling and restarting the application are not the first move.',
      ],
      referenceSolution:
        'First, put a valid certificate and chain on the proxy that terminates public TLS and reload that process so new handshakes present it. Confirm from outside, with a client that validates against the public trust store and the public hostname. The internal green check is not that client.\n\nIf clients still fail, the new file is not the chain being served, the proxy did not reload, the certificate name does not match the host, an intermediate is missing, or the client pins the old certificate. A restart of the application behind the proxy does nothing if the proxy still offers the expired certificate. Scaling does nothing for the same reason.\n\nAfter traffic recovers, fix the renewal job and add an alert on the not-after date of the certificate that is actually served, checked from outside. An alert on the file on disk misses a proxy that kept the old chain in memory.',
      rubric: [
        { id: 'first-move', description: 'The first move is to serve a valid chain on the public terminator and prove it from outside.', conceptId: 'concept.tls' },
        { id: 'still-failing', description: 'A continued failure is traced to the served chain, the name, the reload, or pinning.', conceptId: 'concept.tls' },
      ],
      misconceptions: [
        { id: 'restart-refreshes-trust', statement: 'Restarting clients\' trust is done by restarting your servers.', correction: 'Clients evaluate the certificate you present. A restart helps only if it causes a different certificate to be presented.' },
      ],
      engineeringContext:
        'Pinning, private CAs, and split horizons are why "it works in staging" is weak evidence. Staging may trust a CA production clients do not. The check that matters uses the same trust store as the failing client.',
      extensionQuestions: [
        'A mobile app pins the old leaf certificate. How does the recovery differ?',
      ],
      acceptableAlternatives: [
        'If the application terminates TLS itself, installing the chain there is the same first move. Say which process presents it.',
      ],
      tradeoffs: [
        'Reloading a proxy can drop handshakes in flight. Waiting for a rolling restart of every node is slower and safer for long connections. An expiry incident usually favors the reload.',
      ],
      commonMistakes: [
        'Trusting an internal probe that skips hostname or date checks.',
      ],
      followUps: [
        'How would you rehearse renewal without waiting for the real expiry?',
      ],
    },
  }),
];
