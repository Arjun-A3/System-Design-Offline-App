import type { LessonPair } from './publish';

export const webLessons: Record<string, LessonPair> = {
  'request-lifecycle': {
    morning: {
      title: 'From accept to the handler',
      why: 'A client timeout is not a handler exception. The failure can sit in the accept queue, the proxy, the application, or the write back, and each one looks different in the logs.',
      explain: `A request becomes real when the kernel finishes the TCP handshake and the process accepts the socket. Bytes are then read, often by a reverse proxy that parses the request line and headers and may buffer the body. Only then does application code run. The handler's return value is still not the response the client has. Something has to serialize the status and body and write them to the socket. The client is done when it has read that response, or when its own deadline fires.

Between those steps the request can die without a stack trace in the handler. The accept queue can fill. The proxy can time out while the handler is still working. The handler can finish and the write can fail because the client already left. A log line that says the handler returned 200 does not prove the client saw 200.`,
      question:
        'A checkout handler logs "charged" and returns 201. Some users report timeouts, and a subset of those users were charged. The application error rate is flat. Where on the path can that happen, and which log would show it?',
      hints: [
        'The handler returning is not the same event as the client finishing the read.',
        'Compare the proxy timeout with the handler duration before you look at application exceptions.',
      ],
      outline: [
        'The charge commits inside the handler, before the response is fully written.',
        'The client or the proxy can time out while the handler still finishes.',
        'The application error rate stays flat because the handler did not throw.',
        'The proxy access log is the evidence. The handler log alone is not.',
      ],
      solution: `The handler did its work and logged success. That only means the process reached the return. If the proxy's upstream timeout is shorter than the handler, the proxy gives the client a 504 and the handler still commits the charge and logs 201. Nothing threw, so the application error graph does not move. The user sees a failure and retries, which becomes a second charge if the operation is not idempotent.

The evidence is on the proxy: an upstream timeout, or a client disconnect, next to a handler 201 with the same request id. Fix the deadline so the handler stops when the caller has given up, and make the charge idempotent so the retry is the same charge.`,
      rubric: [
        'The timeout is placed outside the handler, so an application 201 can coexist with a client failure.',
        'The evidence named is the proxy or the client, not the application error rate.',
      ],
      myth: [
        'If the handler logged success, the client received success.',
        'The handler and the proxy observe different ends of the write. One can finish after the other has already given up.',
      ],
      context:
        'This is the same gap as a committed POST that never produces a status line, moved one hop earlier. Gateway logs and application logs disagree because they do not share a definition of done.',
      tradeoff: 'Short proxy timeouts free worker slots and create more client-visible failures. Long ones hide a stuck handler until the client has left.',
      mistake: 'Adding a client retry because the application error rate looked healthy.',
      followUp: 'What should the handler do with the charge if it learns the client disconnected before the commit?',
      extension: 'Which of accept-queue overflow, proxy timeout, and a handler exception shows up in the application error log?',
      alternative: 'Waiting to log success until the proxy flush returns still does not prove the client read the bytes. It does stop you from logging success before the write was attempted.',
    },
    evening: {
      title: 'Which failure the client can see',
      why: 'Incident reviews go wrong when every failure is described as "the API was down." The client can see only the failures that reach its socket.',
      explain: `Walk the same path from the outside. The client can see a DNS failure, a refused or reset connection, a TLS error, a timeout, or an HTTP status. It cannot see an exception that the process caught and turned into a 200. It cannot see a log line. It cannot see a database error that the handler translated into a generic 500, except as that 500.

Some failures are invisible in the opposite direction. The server can accept, do work, and never learn that the client stopped reading. The useful question in a review is not "did it fail?" It is "which side observed the failure, and which side kept going?"`,
      question:
        'During a deploy, the accept queue fills and the kernel drops new SYNs. In-flight requests finish 200. Users say the site is down. Support says the error rate is fine because finished requests succeeded. What is each side actually seeing?',
      hints: [
        'A dropped SYN never becomes a request the application can log.',
        'Error rate is usually counted over requests that were accepted, not over attempts that never arrived.',
      ],
      outline: [
        'New clients see a timeout or connection refused. They never get a status code.',
        'Requests already accepted can still return 200.',
        'The application error rate ignores attempts that were never accepted.',
        'The accept queue, listen overflows, or the proxy connect errors are the signal.',
      ],
      solution: `Users are failing before a request exists inside the process. The kernel did not complete the handshake, so there is no access log line and no status code to graph. The clients wait and then time out. Requests that were already in the worker keep running and return 200, which is why a graph of completed responses looks calm.

Support is reading the wrong denominator. Count connection failures at the proxy or listen overflows on the host, not only HTTP 5xx. The site is down for new arrivals even while in-flight work looks healthy. Drain and capacity belong in that story. The 200s do not refute the users.`,
      rubric: [
        'New clients fail without an application status code, while in-flight requests can still succeed.',
        'The chosen signal counts attempts that never became requests.',
      ],
      myth: [
        'A low HTTP error rate means users are succeeding.',
        'HTTP error rate is computed from requests the server accepted. Connections that never completed are missing from that fraction.',
      ],
      context:
        'Load balancers often have a separate counter for failed connects. That counter is the user-visible outage when the application looks bored.',
      tradeoff: 'Alerting on connect failures pages you during deploys that are actually draining. Not alerting hides a full accept queue behind a pretty success rate.',
      mistake: 'Telling users the graphs are green because 5xx did not move.',
      followUp: 'How would a client distinguish a dropped SYN from a proxy that accepted and then stalled?',
      extension: 'Name one failure the server logs that the client cannot see, and one the client sees that the server does not log.',
      alternative: 'A client-side success probe, such as a real checkout canary, observes the path the access log misses. It is slower and narrower than a connect-error counter.',
    },
  },
  'name-to-connection': {
    morning: {
      title: 'DNS, then TCP, then TLS',
      why: 'A new connection is three different questions. Mixing them up makes people restart a healthy process when the failure is a name, a route, or a certificate.',
      explain: `The client starts with a name. DNS returns one or more addresses, and that answer may come from a cache whose TTL has not expired. The client then opens a TCP connection to one address. Only after the handshake does TLS run, checking the certificate name and the chain. HTTP is later still.

Each step fails differently. A DNS failure means no address. A TCP refusal means something answered and rejected the port, or nothing is listening. A timeout means no useful answer arrived. A TLS failure means the TCP connection existed and the certificate check did not pass. The application behind that connection can be healthy the whole time, because none of these steps are the handler.`,
      question:
        'A mobile client cannot open https://api.example.com. The API process is up and local curls to 127.0.0.1 return 200. DNS for the name returns the expected address from your laptop. What do you check next, and what would you stop blaming?',
      hints: [
        'Your laptop and the phone do not share a DNS cache or a network path.',
        'Separate "the process listens" from "this client can complete TCP and TLS to the public address."',
      ],
      outline: [
        'The process being healthy rules out the handler, not the path.',
        'Compare the phone DNS answer, the TCP handshake, and the TLS handshake as separate tests.',
        'A stale resolver, a blocked port, or a certificate name mismatch can each fail the phone alone.',
        'Stop restarting the API until one of those steps fails in a way a restart would change.',
      ],
      solution: `Stop blaming the handler. Local 200s show the process accepts on loopback. The phone has not proved it can resolve, connect, and negotiate TLS to the address it will actually use.

Check them in order from the phone's network, not from your laptop. Confirm the address the phone received. Then see whether TCP to port 443 completes, and only then whether the certificate matches the name the phone requested. A stale DNS cache, a security group that allows the office and not the carrier, or a certificate that does not include the name the app uses will all fail here while the process stays healthy. Restarting the API does not change any of those.`,
      rubric: [
        'The process health is separated from DNS, TCP, and TLS on the client path.',
        'The next check is one of those three steps, measured from the failing network.',
      ],
      myth: [
        'If DNS works on my laptop and the process is up, the client should connect.',
        'The laptop used a different cache and a different route. The phone still has to finish its own lookup, handshake, and certificate check.',
      ],
      context:
        'Certificate expiry is a TLS failure on an otherwise perfect path. It shows up before the handler, which is why the error rate inside the app stays quiet.',
      tradeoff: 'Short DNS TTLs speed failover and increase lookup traffic and the chance of a stale negative cache. Long TTLs hide address changes from clients that already looked up.',
      mistake: 'Restarting the API because a phone in another network cannot complete TLS.',
      followUp: 'A client cached the old address before the TTL. What recovers it, and what does not?',
      extension: 'Order the user-visible error for a NXDOMAIN, a refused TCP port, and an expired certificate.',
      alternative: 'Connecting by a pinned IP skips DNS and then breaks as soon as the address changes. It is a debug trick, not a design.',
    },
    evening: {
      title: 'A healthy process and a failing client',
      why: 'On-call time gets wasted on the service that is up. The failing client is often stuck on a step that never reaches that service.',
      explain: `When the process is healthy, the remaining causes are outside it: the name the client used, the address it cached, the network between it and the listener, and the certificate it was willing to trust. Health checks from inside the cluster use a different name and a different network. They can stay green while a public client fails.

Write down the client's next observable. If it never sends ClientHello, you are still on DNS or TCP. If the handshake fails with a certificate error, the TCP path worked. If the HTTP status is 401, the connection worked and you are finally looking at the application.`,
      question:
        'A partner says your API is down. Your cluster health checks pass. Their error is "certificate has expired" from a single region. What failed, what did not, and what do you tell them to retry?',
      hints: [
        'A certificate error happens after TCP is up.',
        'A health check that dials an internal name does not present the public certificate.',
      ],
      outline: [
        'DNS and TCP succeeded far enough for TLS to run.',
        'The public certificate presented to that region is expired or otherwise rejected.',
        'Internal health checks can still pass.',
        'Retrying the request will not help until the certificate they see is replaced.',
      ],
      solution: `The partner completed enough of the connection to inspect a certificate, so the process is reachable from that region. The failure is the certificate presented on that path, not a down handler and not a DNS outage. Internal checks never saw that certificate, which is why they stayed green.

Tell them a retry will fail the same way until the edge certificate is renewed and their client sees the new chain. Do not ask them to retry harder. If only one region sees the old certificate, the edge there is serving a stale cert. That is the change to make. The API process does not need a restart unless it is the process terminating TLS.`,
      rubric: [
        'The certificate error is placed after a successful TCP connection, with health checks on a different path.',
        'A retry is rejected until the certificate the client sees is replaced.',
      ],
      myth: [
        'A passing health check means every client can complete TLS.',
        'Health checks use their own name, network, and often their own certificate. Public clients do not inherit that result.',
      ],
      context:
        'Expiry fails the handshake before the request is read. The handler log stays empty, which is the clue that you are still outside the application.',
      tradeoff: 'Terminating TLS at the edge makes certificate rotation one place, and it makes an edge mistake look like an API outage.',
      mistake: 'Scaling the API because a partner reported that it was down.',
      followUp: 'How would you confirm which certificate a client in that region actually received?',
      extension: 'What changes if their error had been a TCP timeout instead of a certificate error?',
      alternative: 'A client that pins the old certificate will keep failing after you rotate. That is a client release, not another server retry.',
    },
  },
  'reverse-proxy': {
    morning: {
      title: 'What the proxy terminates',
      why: 'The proxy is a client to your service and a server to the user. Retries, headers, and identity all change meaning at that boundary.',
      explain: `A reverse proxy accepts the public connection, often terminates TLS, and opens a different connection upstream. It can retry that upstream connection, buffer a request, add headers, and hide the client address unless it forwards it. The application sees the proxy's connection, not the user's socket.

That is useful and dangerous. The proxy can retry a request the application already started. It can forward X-Forwarded-For, which any client can also send if they reach the application directly. It can time out and return 502 while the upstream keeps working. Treat the proxy as a hop with its own policy, not as a transparent pipe.`,
      question:
        'Your proxy retries GET and POST once on upstream 502. TLS ends at the proxy. A POST /transfers handler sometimes commits and then crashes before writing the status. What can the proxy cause, and which part of that policy has to change?',
      hints: [
        'A 502 means the proxy lacked a valid upstream response. It does not mean the handler rolled back.',
        'POST is not safe to retry unless this route has an idempotency contract.',
      ],
      outline: [
        'The proxy may retry a POST that already committed.',
        'The user can see one failure and still be charged twice, or see the retry succeed.',
        'GET retries can stay. POST retries must stop, or the route must become idempotent.',
        'The application must not assume the TCP peer is the user.',
      ],
      solution: `The crash happens after the commit and before the status line. The proxy sees a broken upstream response, calls it 502, and sends the POST again. The second attempt is a new request to the handler unless the body carries an idempotency key the handler honors. The user can end up with two transfers while their first screen said failure.

Keep the GET retry. Remove the POST retry until POST /transfers is idempotent. Terminating TLS at the proxy is fine. It does not make the retry safe. The application should also ignore forwarded identity headers unless the proxy is the only path that can reach it, and the proxy strips any client-supplied copy of those headers.`,
      rubric: [
        'The duplicate transfer is traced to a POST retry after a commit-then-crash, not to TLS.',
        'The policy change is specific: stop retrying this POST, or require an idempotency key.',
      ],
      myth: [
        'A reverse proxy retry is safe because the proxy is part of our system.',
        'The proxy cannot see whether the handler committed. Retrying a non-idempotent POST duplicates the side effect.',
      ],
      context:
        'Proxies hide the client address, the certificate, and the original connection lifetime. Anything you need from that connection has to be an explicit header with a trusted writer.',
      tradeoff: 'Buffering the whole body lets the proxy retry a complete request, and it delays the upstream start and uses proxy memory.',
      mistake: 'Marking every route retryable because the proxy and the app share an owner.',
      followUp: 'Which header carries the client address, and what strips a forged one?',
      extension: 'What does the application see as the peer address if it is reachable past the proxy?',
      alternative: 'Retrying only idempotent methods, and only when no upstream bytes were received, avoids the committed-then-crashed POST. You still need an idempotency key if the proxy cannot tell that no bytes means no commit.',
    },
    evening: {
      title: 'The header you must not trust',
      why: 'Forwarded headers are how the application learns the client. They are also how a client lies if it can reach the application without the proxy.',
      explain: `X-Forwarded-For, X-Forwarded-Proto, and X-Real-IP are claims. They are true only if the peer that wrote them is the proxy you trust, and that proxy overwrote any value the client sent. If the application is also exposed on a port the client can hit, the client writes the header and the application believes it.

The same rule covers auth headers the proxy injects. A header that means "the gateway already authenticated this user" is a capability. Anything that can connect upstream can mint it, unless the network makes that impossible.`,
      question:
        'The app trusts X-Forwarded-For for rate limits and audit logs. A debugger documents that the pod port is reachable inside the cluster. What header must the application stop trusting as client identity, and what has to be true before it can trust it again?',
      hints: [
        'The header is only as trustworthy as the last hop that was allowed to set it.',
        'Reachability inside the cluster is enough for another pod to spoof the client address.',
      ],
      outline: [
        'X-Forwarded-For is the header that must not be trusted from an arbitrary caller.',
        'A pod that can dial the app directly can put any address in that header.',
        'Trust returns only if the proxy overwrites the header and is the only caller that can reach the app.',
        'Until then, rate limits and audit logs based on that header are forgeable.',
      ],
      solution: `Stop trusting X-Forwarded-For, and any sibling forwarded header, as the client identity. Another workload in the cluster can connect to the pod and send X-Forwarded-For: 1.2.3.4. Your rate limit then buckets an attacker as someone else, and the audit log records a client that was never there.

Trust it again only after two conditions hold. The proxy must replace the header, not append a client-supplied value blindly, or it must append and the app must use only the hop it added. And the application port must reject everyone except that proxy. A network policy is part of the header's meaning. Without it, the header is user input.`,
      rubric: [
        'X-Forwarded-For is named as untrusted while the app is reachable past the proxy.',
        'Trust is restored only with a proxy that overwrites the header and is the only allowed caller.',
      ],
      myth: [
        'X-Forwarded-For is the client IP because the standard says so.',
        'It is the client IP only when a trusted proxy wrote it and untrusted callers cannot. Otherwise it is just a header.',
      ],
      context:
        'The same mistake shows up as X-User-Id set by a gateway. If the app can be called around the gateway, that header is a login bypass.',
      tradeoff: 'Closing the direct port makes the proxy a hard dependency. Leaving it open makes every forwarded header a forgery channel.',
      mistake: 'Appending the real client to a client-supplied X-Forwarded-For and then reading the first value.',
      followUp: 'How do you test that a direct call with a forged header is rejected?',
      extension: 'Which value do you keep if the proxy appends, the left-most or the right-most?',
      alternative: 'The PROXY protocol passes the address outside HTTP headers. It is still a claim, and it still requires that only the proxy can speak it.',
    },
  },
  'load-balancing': {
    morning: {
      title: 'Three ways to spread a connection',
      why: 'The balancer chooses which replica does the work. A reasonable algorithm on the wrong workload creates a hot replica while the others idle.',
      explain: `Round-robin gives each new connection to the next healthy target. It is fair when requests cost about the same and connections are short. Least-connections sends the next request to the target with the fewest open connections. It tracks pileups better when some requests are slow, and it is still blind to CPU if connections are cheap. Consistent hashing sends the same key, often a header or a cookie, to the same target. That helps a local cache, and it hurts when one key is popular.

None of these know your business cost. A replica holding one long export looks idle to round-robin and busy to least-connections. A celebrity user hashed to one replica is a hotspot the algorithm will not correct.`,
      question:
        'You balance upload requests with round-robin. Most uploads are 100 KB. A few are 2 GB and hold a worker for minutes. What goes wrong, and which of least-connections or consistent hashing is the better change?',
      hints: [
        'Round-robin counts assignments, not work in flight.',
        'Hashing on user id does not make a large upload cheaper. It sticks that user to one machine.',
      ],
      outline: [
        'Round-robin can hand a fresh large upload to a worker that is already stuck on one.',
        'Connections or in-flight work, not assignment count, is the load.',
        'Least-connections prefers a worker that is not already occupied.',
        'Consistent hashing does not spread the large uploads. It can pin them.',
      ],
      solution: `Round-robin will keep assigning new uploads, including another 2 GB one, to a worker that already has a large upload in progress. That worker's queue grows while others sit idle, because the algorithm never looked at in-flight work. Users on the busy worker see timeouts. The average CPU of the fleet still looks fine.

Prefer least-connections, or a weight based on in-flight bytes, so a worker holding a large upload stops receiving new ones. Consistent hashing is the wrong change. It sends the same user to the same replica, which makes a heavy user a permanent hotspot and does nothing for two heavy users who hash apart while one replica still gets both large files by bad luck of round-robin. Hashing helps cache locality, not uneven request cost.`,
      rubric: [
        'The failure is uneven in-flight work, not an unfair count of assignments over a long window.',
        'Least-connections is chosen, and consistent hashing is rejected for this workload.',
      ],
      myth: [
        'Round-robin keeps replicas equally loaded.',
        'It equalizes the count of placements. Slow requests make the replica that received them busier than the count suggests.',
      ],
      context:
        'Least-connections is a guess based on the balancer's sockets. A replica can be overloaded on disk or a lock while its connection count looks small.',
      tradeoff: 'Least-connections reacts to slow requests and can stampede onto a replica that just restarted and has zero connections.',
      mistake: 'Hashing on user id to "be fair" when the problem is request size, not cache hits.',
      followUp: 'What extra signal would you add if connections are cheap and CPU is the real cost?',
      extension: 'How does a brand-new replica with zero connections behave under least-connections?',
      alternative: 'A queue in front of the workers, with a fixed number of uploads in flight per worker, spreads bytes more honestly than a connection count. It adds a hop and a place for work to wait.',
    },
    evening: {
      title: 'A balancer decision that creates a hotspot',
      why: 'Hotspots are often an addressing choice. The balancer did what you asked, and one key received a disproportionate share.',
      explain: `Consistent hashing looks balanced in a diagram of keys and lopsided in a diagram of traffic. If the hash input is tenant id, your largest tenant is one replica's whole evening. If the input is a resource id that everyone polls, every poll lands together. Adding replicas does not split a single key.

The fix is to change the key or to stop sending that traffic through affinity. Split the hot key, poll a shared cache, or balance that route with least-connections while leaving affinity on the route that needed it.`,
      question:
        'You hash the WebSocket for /feed on the user id so a replica can keep that user's connection state. One account has 200,000 concurrent viewers because it is a live event. What hotspot did the balancer create, and what do you change without dropping affinity for ordinary users?',
      hints: [
        'All of that account\'s sockets hash to one replica.',
        'Ordinary users are fine. The exception is a key with huge fan-in.',
      ],
      outline: [
        'The event account is pinned to a single replica by the hash.',
        'That replica runs out of sockets or CPU while the rest of the fleet is quiet.',
        'Keep hashing for normal users.',
        'Give the hot account a different scheme: shard by connection, or a dedicated pool.',
      ],
      solution: `Every viewer of that account hashes to the same replica, so one process holds 200,000 sockets and the fan-out. The other replicas never see the event. Adding replicas does not help until the hash input changes, because the key is still one user id.

Keep consistent hashing for ordinary accounts so their connection state stays local. Special-case the hot account: shard its sockets by connection id across a pool, and keep the event state in a store those replicas share, or send that account to a dedicated set of replicas that balance least-connections. Affinity was a cache optimization. It is the wrong constraint for a key that is bigger than one machine.`,
      rubric: [
        'The hotspot is one hash key with massive fan-in, not a broken round-robin.',
        'Ordinary users keep affinity, and the hot account is sharded or isolated.',
      ],
      myth: [
        'Adding replicas splits a hashed key evenly.',
        'A single key still maps to one replica. More replicas change the ring, not the fact that one key has one home.',
      ],
      context:
        'This is the same shape as a shard key that is a celebrity id. The balancer and the database are making the same mistake with different words.',
      tradeoff: 'Sharding the hot account adds a shared store and loses the simple "all my sockets are here" assumption. Leaving it pinned is simpler until the day of the event.',
      mistake: 'Rebalancing the whole ring during the event and disconnecting healthy users to chase one key.',
      followUp: 'What happens to those sockets if their home replica dies mid-event?',
      extension: 'Which hash input would have spread the viewers, and what state would you then have to move?',
      alternative: 'A pub/sub tier in front of the sockets lets every replica hold some viewers and receive the event once. You operate that tier instead of a sticky hash.',
    },
  },
  'health-checks': {
    morning: {
      title: 'Liveness is not readiness',
      why: 'A liveness failure restarts a process. A readiness failure stops new traffic. Using one check for both either kills a busy process or keeps sending users to a process that cannot serve them.',
      explain: `Liveness answers "should this process be replaced?" The check should fail when the process is stuck in a way a restart would fix, such as a deadlock. It should not fail because a dependency is down. Restarting will not bring the database back, and restarting every replica will make the outage worse.

Readiness answers "should the balancer send this replica a new request?" It should fail when the replica cannot do the work, including when a required dependency is down or the process is still starting. A failed readiness check leaves the process running and removes it from rotation.`,
      question:
        'Your only check hits the database. When the database blips, every replica fails the check and the orchestrator restarts them all. What should have been liveness, what should have been readiness, and what do users see during the restart storm?',
      hints: [
        'A database blip is not evidence the process is wedged.',
        'Restarting the API does not restore the database, and it drops in-flight work.',
      ],
      outline: [
        'The database check is a readiness signal, not a liveness signal.',
        'Liveness should be a local "event loop is making progress" check.',
        'On a database blip, replicas should leave rotation and stay up.',
        'The restart storm drops healthy processes and adds cold starts on top of the outage.',
      ],
      solution: `Split the checks. Liveness should only decide that this process is stuck: a local endpoint that fails if the event loop is wedged. The database ping belongs in readiness. When the database blips, readiness goes red, the balancer stops sending new work, and the processes stay alive to recover when the database returns.

What users see in the current design is worse than the blip. Every replica is killed, in-flight requests die, and then every replica cold-starts and hammers the database again. The orchestrator turned a dependency failure into a full API restart. Readiness would have made the API look unavailable without destroying the processes that could have served the next successful ping.`,
      rubric: [
        'The database check is classified as readiness, and liveness is a local stuck-process check.',
        'The restart storm is described as extra harm: dropped work and a thundering herd back to the database.',
      ],
      myth: [
        'If a dependency is down, the safe move is to restart the app until the check passes.',
        'A restart helps a wedged process. It does not heal a down dependency, and doing it to every replica removes the fleet.',
      ],
      context:
        'Kubernetes liveness and readiness exist because these are different actuators. The same HTTP path plugged into both is how a database failover becomes an API rollout.',
      tradeoff: 'A strict readiness check empties the balancer during a partial dependency failure. A loose one keeps sending work that will fail in the handler.',
      mistake: 'Putting the database query in the liveness probe because it was the only probe you had.',
      followUp: 'What should readiness do if the database is up but migrations are still running?',
      extension: 'Name a failure that should fail liveness and must not fail only readiness.',
      alternative: 'A circuit breaker in the handler can fail fast without leaving the load-balancer rotation. Users still get errors, and you do not get a restart storm. You also keep sending connections to a replica that cannot succeed.',
    },
    evening: {
      title: 'A check that stays red for the real dependency',
      why: 'A readiness check that always returns 200 keeps a replica in rotation after it can no longer do the job users are sending.',
      explain: `Readiness should reflect the dependencies the handler will touch on the path you are balancing. If the handler cannot respond without the primary database, the check has to fail when that primary is unusable. Checking only that the process is listening reports a narrow truth and lets the balancer deliver work that will 500.

Do not check every optional dependency. A down analytics host should not remove the API. The check is a product decision about which failures make this replica unfit for new requests.`,
      question:
        'POST /orders writes to the primary and then publishes to a queue. The queue is down. Orders cannot be completed, but a readiness check that only pings the database stays green. Design the check you want, and say what you deliberately do not include.',
      hints: [
        'The user-visible promise is a completed order, not an open socket.',
        'A dependency the handler can skip should not take the replica out of rotation.',
      ],
      outline: [
        'Readiness goes red when the primary cannot accept the order write.',
        'It also goes red when the queue cannot accept the publish, if the order is not complete without it.',
        'A purely optional side effect stays out of the check.',
        'The replica stays running. Only new traffic is removed.',
      ],
      solution: `The check should fail when the replica cannot finish POST /orders. That means the primary must accept a cheap readiness query, and the queue must be reachable if a missing publish means the order is not actually done. Returning 200 because the database ping worked is how the balancer keeps filling a replica that will fail every checkout.

Leave out dependencies the handler can degrade past. A metrics pipeline or a recommendation cache is not part of completing an order. Putting them in the check turns an analytics outage into a total removal from the load balancer. Keep this as readiness, not liveness, so a down queue does not restart the fleet. If you later make the queue asynchronous with an outbox, you can take the queue back out of the check, because the handler can commit the order without it.`,
      rubric: [
        'The check fails when the primary or the required queue cannot complete an order.',
        'An optional dependency is excluded, and the failure mode is readiness rather than a restart.',
      ],
      myth: [
        'Readiness should return 200 if the process is up.',
        'Listening is liveness territory. Readiness is whether this replica should receive the next user request.',
      ],
      context:
        'A check that opens a real transaction on the primary can become the outage. Use a cheap query, and do not let the probe hold locks.',
      tradeoff: 'Including the queue removes replicas during a broker blip even if you could have queued in process for a moment. Excluding it serves errors to every user instead.',
      mistake: 'Checking a downstream the handler only uses for a best-effort email, and draining the API when email is down.',
      followUp: 'How often can this check run before it is itself a client of the database?',
      extension: 'What do you change in the check on the day the publish moves to an outbox in the same transaction?',
      alternative: 'Failing the request in the handler and staying in rotation surfaces a 503 per request. The balancer will not shift traffic to a replica that still has a healthy queue connection.',
    },
  },
  'connection-draining': {
    morning: {
      title: 'Finish the requests you already took',
      why: 'A deploy that closes sockets at the start looks like a short outage even when the new version is healthy. Drain is how old processes finish work they already accepted.',
      explain: `Draining starts by failing readiness so the balancer stops sending new requests. The process then waits for in-flight requests to finish, up to a deadline, and only then exits. Connections the balancer already handed off are allowed to complete. New ones are refused or never assigned.

The deadline is the whole design. If it is longer than the balancer's view, the balancer may already have given up. If it is shorter than the slowest request you are willing to serve, that request is cut. Signals matter too: a SIGTERM can be caught and used to drain. A SIGKILL cannot.`,
      question:
        'A rolling deploy sends SIGTERM and gives the process 20 seconds, then SIGKILL. Some report exports run for two minutes. What should the drain sequence do, and what does a client with an export in flight see today?',
      hints: [
        'Readiness has to go false before the process stops accepting, and before the kill.',
        'A 20 second grace period does not finish a two minute export.',
      ],
      outline: [
        'Fail readiness first so new exports land on other replicas.',
        'Keep the process alive until in-flight exports finish or hit a deliberate limit.',
        'Today those exports are killed at 20 seconds and the client sees a reset or a 502.',
        'Either extend the grace period for this workload or stop doing multi-minute work inside the request.',
      ],
      solution: `The sequence should mark the replica unready, wait for the balancer to observe that, and then wait for in-flight exports to finish. Twenty seconds does none of the long work. At SIGKILL the kernel drops the socket. The client sees a reset or a proxy 502, and the export is half done. A retry starts it over on another replica, or nowhere if the client gives up.

Pick one honest design. Raise the termination grace above the longest export you still want to run inside the request, and make sure the balancer's deregistration delay fits inside it. Or stop holding the request open for two minutes: accept the export, return a job id, and let a worker finish after the process could have been replaced. Draining cannot invent time the platform will not give you.`,
      rubric: [
        'Readiness flips before exit, and the grace period is compared with the longest in-flight request.',
        'The client-visible failure is a killed socket, with a concrete change to the deadline or the work.',
      ],
      myth: [
        'SIGTERM means in-flight requests are finished.',
        'SIGTERM is a request to start shutting down. The platform will SIGKILL when the grace period ends, finished or not.',
      ],
      context:
        'Load balancers also cache health. Failing readiness and exiting in the same second still delivers new requests to a dying process.',
      tradeoff: 'A long grace period slows deploys and holds old code in the fleet. A short one makes every deploy a source of 502s for slow routes.',
      mistake: 'Treating the termination grace period as a deploy setting with no relationship to request duration.',
      followUp: 'What does the balancer do with a keep-alive connection that was idle when readiness failed?',
      extension: 'Why is SIGKILL unable to drain even if the process wanted to?',
      alternative: 'Connection draining at the proxy, with the upstream removed from the pool but existing streams left open, can outlive a process only if the process is still there to finish them.',
    },
    evening: {
      title: 'When the drain is shorter than the work',
      why: 'The failure mode of a short drain is specific. Clients with slow requests see resets, and clients with fast requests see nothing. Averages hide it.',
      explain: `If the drain window is shorter than a request, that request does not get a clean status. The proxy may notice the upstream vanish and return 502. The client may see a TCP reset. The handler may have committed the side effect and then died during the write, which is the duplicate-on-retry bug again.

Fast health checks and short requests succeed throughout the deploy. The incident report that says "a few random 502s during release" is often the slow tail being killed on purpose by the grace period.`,
      question:
        'P99 of POST /search is 30 seconds. Termination grace is 10 seconds. After each deploy, a handful of clients get 502 and retry. Most requests are fine. Explain the client-visible failure and the smallest change that removes it.',
      hints: [
        'The handful is the set of requests still running at SIGKILL.',
        'You do not have to speed up search to stop killing it. You have to stop killing it.',
      ],
      outline: [
        'Requests shorter than the remaining grace period finish. The long tail does not.',
        'Those clients see 502 or a reset, not an application error body.',
        'A retry may repeat a non-idempotent POST.',
        'The smallest fix is a grace period above 30 seconds, after readiness has failed.',
      ],
      solution: `The balancer stops sending new search requests once readiness fails, but anything already running is still inside the old process. At 10 seconds the platform kills it. A search that needed 30 seconds loses its socket. The proxy has no upstream status to forward, so the client gets a 502 or a reset. Short searches that finished inside the window look like a clean deploy, which is why the failure is a handful rather than everything.

The smallest change is to raise the grace period past the requests you are willing to let finish, including time for the balancer to notice readiness, and to keep SIGKILL after that. Do not "fix" it by retrying POST /search at the client unless the search is idempotent. Making search faster is a good project and a larger one. The deploy is failing because it refuses to wait, not because 30 seconds is an illegal duration.`,
      rubric: [
        'The 502s are the in-flight tail killed when grace ends, not a bad new version.',
        'The smallest change is a longer grace period after readiness fails, not a blind retry.',
      ],
      myth: [
        'A few 502s during deploy means the new version is unhealthy.',
        'They can mean the old version was killed on time. The new version may be fine, and the short requests prove it.',
      ],
      context:
        'This is why deploys should watch the error rate by route. A global success rate will not move if only the slow route is long enough to be killed.',
      tradeoff: 'Waiting 30 seconds per replica makes a rolling restart slow. Killing at 10 seconds makes the slow route unreliable exactly when you ship.',
      mistake: 'Retrying the 502 from the client and doubling the search load during the deploy.',
      followUp: 'How long does the balancer take to stop sending after readiness fails, and is that delay inside the grace period?',
      extension: 'What changes if search is a GET that never writes?',
      alternative: 'Moving the slow search to a job id returns in milliseconds, so the drain window is easy. The client has to poll, and you now operate a job table.',
    },
  },
  'api-gateway': {
    morning: {
      title: 'What belongs at the gateway',
      why: 'A gateway is a convenient place to put policy. Policy that only the gateway knows becomes invisible, untestable, and a dependency every caller must pass.',
      explain: `Authentication of the external token, TLS, request size limits, and coarse rate limits belong at the edge because every service would otherwise reimplement them, and because they should reject work before it spends a service's CPU. Business rules do not belong there. Whether this order may be refunded, which warehouse to pick, or a price calculation are domain decisions. If they live only in gateway configuration, the service can be called by a job or a future client and will not enforce them.

A gateway feature also fails as a feature. If the gateway is down, the policy is down. If the gateway time out is short, the policy's latency is on the user path. Treat anything you add there as a new production dependency.`,
      question:
        'A team wants the gateway to reject refunds over $100 unless the caller is in the "supervisor" group, because every client goes through the gateway today. What belongs in the gateway, and what becomes a hidden dependency if the rule lives only there?',
      hints: [
        'The gateway can authenticate the token. The refund limit is a business rule.',
        'Jobs, replays, and a second client will not necessarily pass the gateway.',
      ],
      outline: [
        'Token authentication and a coarse limit can stay at the gateway.',
        'The refund amount rule is domain policy and must be enforced by the service that performs the refund.',
        'Gateway-only enforcement is skipped by any caller that reaches the service directly.',
        'The gateway check, if kept, is a convenience, not the control.',
      ],
      solution: `Leave authentication of the external credential at the gateway, and keep a coarse abuse limit there if you want cheap rejection. The $100 supervisor rule is business policy. It has to run in the refund service, where the refund is actually created, using the authenticated identity the gateway forwarded. Then a backfill job and an internal admin tool obey the same rule.

If the rule lives only in the gateway, the gateway becomes a hidden dependency of refund correctness. Anyone who can reach the service, including a future mesh client, bypasses it. The rule is also stuck in a config language the service tests do not run. A duplicated check at the gateway is optional defense in depth. It is not the place the rule is allowed to exist alone.`,
      rubric: [
        'Authentication may stay at the edge, and the refund rule is placed in the service that writes the refund.',
        'Gateway-only policy is identified as skipped by any non-gateway caller.',
      ],
      myth: [
        'If all traffic goes through the gateway, gateway config is as good as service code.',
        'All traffic goes through the gateway until the day it does not. The service is the only place that still runs.',
      ],
      context:
        'Gateways also hide latency. A policy call from the gateway to a distant auth service adds a hop the service owners do not see in their own traces unless the gateway span is there.',
      tradeoff: 'Enforcing at both layers catches a bypass and can disagree when one copy is updated first. Enforcing only in the service means the gateway spends CPU on requests the service will reject.',
      mistake: 'Encoding pricing in gateway routes because the routing config was the fastest file to edit.',
      followUp: 'How does an internal job present the supervisor identity if it never hits the gateway?',
      extension: 'Name one more rule that feels like routing and is actually a domain decision.',
      alternative: 'A shared library inside every service avoids the gateway and still drifts if a service forgets to call it. The owning service remains the better single place.',
    },
    evening: {
      title: 'Policy that should not live only in the gateway',
      why: 'The failure you are looking for is a rule that can be skipped, not a rule that is merely located at the edge.',
      explain: `Look for decisions that change stored data or money, and for decisions that must hold for every caller. Those have to be true in the writer. The gateway can repeat them. It cannot be their only home.

Also look for policy that needs data the gateway should not have. If the rule requires the order total, the customer's history, or a lock in the database, the gateway is about to grow a private copy of the domain or a synchronous call into it on every request.`,
      question:
        'Refunds are rejected over $100 by a gateway rule. A support tool calls the refund service on the cluster network and refunds $400. Find the policy that should not have lived only in the gateway, and say where it has to move.',
      hints: [
        'The support tool is a caller the gateway never saw.',
        'The service accepted the write because it did not know about the rule.',
      ],
      outline: [
        'The $100 supervisor rule is the policy that was skippable.',
        'The support tool reached the writer directly and stayed under no such limit.',
        'The refund service has to enforce the rule on every create.',
        'The gateway copy can remain as an early reject, not as the authority.',
      ],
      solution: `The refund limit is the rule that should not have lived only in the gateway. The support tool was an ordinary client of the refund service. It never presented the request to the gateway, so the gateway rule did not run, and the service had no rule of its own. The $400 refund committed.

Move the check into the refund service and test it there with a direct call, not only through the gateway. The gateway may keep rejecting obvious cases early so the service does not spend work on them. After the move, the support tool and the public API fail the same way. If supervisors are allowed over $100, that exception is also part of the service, based on a verified identity, not on which front door was used.`,
      rubric: [
        'The refund limit is the skipped policy, and the support tool is the path that skipped it.',
        'Enforcement moves to the refund service, with the gateway reduced to an optional early check.',
      ],
      myth: [
        'Internal tools can skip gateway rules because the callers are employees.',
        'Employees are still callers. A rule about money has to hold wherever the write is issued.',
      ],
      context:
        'This is the same shape as trusting X-User-Id. The front door added a guarantee the back door did not.',
      tradeoff: 'A service-side check adds a database read to every refund. A gateway-only check is faster and wrong for any other caller.',
      mistake: 'Fixing the incident by blocking the support tool's network path and leaving the service unprotected.',
      followUp: 'What test would have failed in CI if the rule had lived in the service?',
      extension: 'Which of request size, refund ceiling, and TLS version is a gateway concern?',
      alternative: 'A service-mesh policy can enforce the same rule on every client, including the support tool. You then operate the mesh as the authority, and a missing sidecar is the new bypass.',
    },
  },
  'service-boundaries': {
    morning: {
      title: 'A boundary is data and failure',
      why: 'A folder or a repository is not a service boundary. The boundary is the data one team can change without the other, and the failure the caller must survive.',
      explain: `Two pieces of code are across a boundary when one can be down, slow, or deployed without the other, and when they do not share tables. If they share a database and a process, a function call is not a distributed system. If you split them into services but they still cannot complete a user action unless both are up, you paid for a boundary and kept a single failure domain.

Draw the line where the data owner is clear. Orders owns orders. Inventory owns stock. A call across that line can fail partially. The caller needs a timeout, a retry policy, and a story for "I do not know if they did it."`,
      question:
        'The catalog and the cart live in one database and one process, in different folders. Someone proposes two services because the folders look like teams. What is the boundary today, and what failure appears the moment you split them into synchronous calls?',
      hints: [
        'A folder does not fail independently. A process and a database do.',
        'A synchronous call on the user path makes their outage your outage.',
      ],
      outline: [
        'Today there is one failure domain and one data store, despite two folders.',
        'A boundary would require each side to own its data and tolerate the other being down.',
        'A synchronous split makes cart latency and availability depend on catalog for every request.',
        'Partial failure appears: cart can fail after catalog succeeded, or time out without knowing.',
      ],
      solution: `Today the boundary is fictional. One process dies as a unit, and one database commits both sides. Different folders are a code organization, which may be worth keeping. They are not a service boundary, because neither side can fail alone and neither owns its data separately.

If you split them and cart calls catalog synchronously on every view, catalog's latency and downtime become cart's. You also invent partial failure you did not have: catalog can return a price, cart can crash before saving, and a retry can observe a price that moved. Do not split until cart can own the data it must save and can degrade when catalog is slow. A boundary drawn to match a diagram adds an outage mode and a deploy, and it does not create team independence if the tables are still shared.`,
      rubric: [
        'The current system is described as one failure domain, with folders dismissed as the boundary.',
        'The synchronous split is tied to a new shared outage and a partial-failure case.',
      ],
      myth: [
        'Separate folders mean we already have service boundaries.',
        'A boundary you cannot deploy, crash, or migrate independently is a directory. Failure is what makes it a service.',
      ],
      context:
        'Shared tables are a back door. Two services that write each other's rows are one system with a network in the middle.',
      tradeoff: 'Keeping one process avoids partial failure and couples deploys and scaling. Splitting isolates failure only if the caller can proceed or fail honestly when the callee is gone.',
      mistake: 'Splitting first and discovering the user action needed a distributed transaction.',
      followUp: 'What data would cart have to copy so it can render when catalog is down?',
      extension: 'Name an operation that is still one failure domain even after the split.',
      alternative: 'A modular monolith with an explicit interface and a banned cross-table query gives you the code boundary without the network failure. You can split later if a team or a scale need appears.',
    },
    evening: {
      title: 'Two operations that must not be split',
      why: 'Some pairs of writes are one fact. Putting a synchronous network call between them asks you to be correct about partial failure on every request.',
      explain: `Do not split two operations that must commit together and that you cannot compensate. Charging a card and recording the order in two services without an idempotency and reconciliation story will lose one of them. Decrementing stock and creating the order across a synchronous call has the same shape.

A split is tolerable when one side can be pending, retried, or undone, and when the user can be told the truth. If you cannot name the compensation, keep the two writes in one transaction in one database.`,
      question:
        'Create-order writes the order row and decrements inventory in one transaction today. A proposal puts inventory behind a synchronous HTTP call from the order service. Why must these two not be split that way, and what failure appears on a timeout?',
      hints: [
        'A timeout does not say whether the decrement happened.',
        'You would need a compensation or a single atomic commit. The HTTP call gives you neither.',
      ],
      outline: [
        'The order and the stock change are one user-visible fact today.',
        'A synchronous split can commit one side and fail the other.',
        'On timeout the caller does not know whether stock moved.',
        'Keep one transaction, or add an explicit reservation and reconciliation before splitting.',
      ],
      solution: `They must not be split into a synchronous call because the user action is "this order has this stock," and today one commit makes that true or not true. After the split, the inventory service can decrement and the order service can crash before inserting the order. The opposite order loses stock that was never reserved, or creates an order for stock that was not taken. A timeout is worse: the order service does not know which of those happened, and a retry can decrement twice.

Leave them in one transaction until you have a real protocol. That protocol is a reservation with an id, an idempotent decrement, and a reconciliation job for reservations that time out. It is not a POST that hopes both sides succeed. Partial failure is the new behavior the proposal adds, and there is no compensation in the design.`,
      rubric: [
        'The two writes are kept together because they are one fact, not because HTTP is slow.',
        'The timeout case is uncertainty plus a duplicate decrement on retry.',
      ],
      myth: [
        'A synchronous call is fine if we check the status code and retry.',
        'A missing status code is not a no. Retrying an uncertain decrement double-spends stock.',
      ],
      context:
        'This is the local-transaction case from the foundations lessons, with a network inserted in the middle. The network does not preserve the commit boundary.',
      tradeoff: 'One database keeps the atomic write and couples the two teams to one schema and one failure domain. A reservation protocol lets them split and makes timeout a product state.',
      mistake: 'Retrying the inventory call because the order insert failed, without an idempotency key on the decrement.',
      followUp: 'What would a compensating increment have to know to be safe?',
      extension: 'Name a pair of operations that can be split because one of them is allowed to lag.',
      alternative: 'An outbox in the order transaction, with inventory applied by a consumer, removes the synchronous call. Stock is briefly stale, and the consumer must be idempotent.',
    },
  },
  sessions: {
    morning: {
      title: 'Server sessions and signed cookies',
      why: 'Where the session lives decides what a restart does, what a second data center can see, and what an attacker can forge.',
      explain: `A server-side session stores the payload in a database or cache and sends the client an opaque id. Revocation is a delete. A second data center can read the session only if it can read that store. A restart of the app does nothing if the store survives, and it logs everyone out if the session lived in process memory.

A signed cookie stores the payload in the cookie and the signature proves your key wrote it. Any data center can verify it without a lookup. You cannot forget one cookie until it expires unless you keep a denylist, which is a server-side session by another name. The cookie must not contain secrets you would not hand the user, because the user can read it. Signing is not encryption.`,
      question:
        'You keep session maps in process memory because lookups are free. What does a restart do, and what does a second replica do to a user whose cookie was issued by the first?',
      hints: [
        'The cookie is an id. The payload is only in the process that created it.',
        'A second replica is a restart you did not intend, from that user's point of view.',
      ],
      outline: [
        'A restart drops every in-memory session. Users are logged out.',
        'Another replica does not have the map, so the same cookie fails or misses.',
        'Sticky sessions hide this only until a replica dies or a balancer moves the user.',
        'A shared store or a signed cookie is required before you can add replicas.',
      ],
      solution: `A restart empties the map. Every cookie still in browsers now points at nothing, so the next request is unauthenticated. You have coupled login state to process lifetime.

A second replica is the same bug without a restart. The balancer sends the user to a process that never saw the login. The cookie is valid-looking and useless. Sticky sessions paper over it by pinning the user to the process that logged them in, and then a deploy or a crash logs them out anyway. Move the map to a shared store if you need revocation and server-side data, or switch to a signed cookie if every replica can verify the signature and you accept that logout waits for expiry unless you add a denylist.`,
      rubric: [
        'Restart and a second replica are both described as losing an in-memory session.',
        'The replacement is a shared store or a signed cookie, with stickiness rejected as the design.',
      ],
      myth: [
        'A cookie means the session is stateless.',
        'An opaque session id is a pointer. It is stateless only if the payload and a signature travel in the cookie and any replica can check them.',
      ],
      context:
        'This is the state that has to leave the process before horizontal scaling works. The balancer cannot invent a session the replica does not have.',
      tradeoff: 'A shared session store adds a dependency to every authenticated request. In-memory sessions are fast and make every deploy a logout.',
      mistake: 'Turning on a second replica and calling the resulting logouts a balancer bug.',
      followUp: 'What does a rolling restart do to in-memory sessions even with stickiness?',
      extension: 'What does a restart change if the cookie is signed and the key is still the same?',
      alternative: 'Storing sessions in a local file on the instance survives a process restart and still fails on a second instance or a rescheduled pod.',
    },
    evening: {
      title: 'Restart and a second data center',
      why: 'The session design you picked in one region becomes a product bug the day you fail over or add a region.',
      explain: `A shared store in one region survives an app restart and does not survive a region the store is not in. Users pinned to the second region miss their sessions and look logged out. A signed cookie survives both, as long as both regions have the verification key and you can tolerate the revocation delay.

Write the failure down before you pick. "Restart the app" and "serve this user from the other region" are different tests. Passing one does not pass the other.`,
      question:
        'Sessions live in a Redis in region A. You add region B for app servers and route some users there. Explain what a restart of an app server does, and what region B does, for both a server-side session and a signed cookie.',
      hints: [
        'App server restart is not Redis restart.',
        'Region B cannot read region A Redis unless you built that path.',
      ],
      outline: [
        'Restarting an app server drops nothing if Redis still has the session.',
        'Region B cannot see server-side sessions stored only in region A, so those users look logged out.',
        'A signed cookie survives the app restart and is valid in region B if the key is there.',
        'Revocation of a signed cookie is the part that still needs shared state.',
      ],
      solution: `Server-side sessions: restarting one app server does nothing to login state, because the payload is in Redis. Sending the user to region B fails the lookup unless B can read that Redis. The user is logged out or you pay cross-region latency on every request and you inherit region A's outage. A restart of Redis itself logs everyone out. That is a different restart than the app.

Signed cookies: an app restart does nothing, and region B can verify the cookie with the same key without a read. Users stay logged in across the failover. You cannot instantly revoke one stolen cookie in both regions unless you add a denylist both regions see, or you rotate the key and log everyone out. Pick the server-side session if revocation and small cookies matter more than regional independence. Pick the signed cookie if failover must not depend on Redis. Do not pick the in-memory map. It fails both tests.`,
      rubric: [
        'App restart is separated from region failover for the server-side session.',
        'The signed cookie works in both cases, with revocation named as the remaining shared state.',
      ],
      myth: [
        'A session store in the primary region is available to every region because the network exists.',
        'It is available only if you accept the latency, the partition, and the primary's outage as your session outage.',
      ],
      context:
        'Multi-region sessions are a consistency choice. Read-your-writes for login means the region that serves the next click must see the login.',
      tradeoff: 'Replicating Redis to region B shortens the miss and creates a lag window where a new login is invisible in B. Signed cookies remove that window and weaken instant logout.',
      mistake: 'Testing failover with a user who already had a sticky session on a single node and calling it multi-region.',
      followUp: 'What does the user see if region B verifies the cookie but the session version inside it is from a schema region B does not understand yet?',
      extension: 'Which design lets you force-logout one stolen device tonight?',
      alternative: 'A short-lived access token plus a refresh token stored server-side splits the difference. Region B can accept the access token until it expires, and refresh still needs the store.',
    },
  },
  'authn-authz': {
    morning: {
      title: 'Who is calling, and what they may do',
      why: 'Login proves an identity. It does not prove this identity may touch this object. The missing check is usually on the write, in the handler that already trusts the session.',
      explain: `Authentication answers who the caller is. A session, a token, or a mutual TLS identity is that answer. Authorization answers whether that identity may perform this action on this object. It needs the object, so it usually cannot be finished at the login endpoint.

The common hole is a route that checks "is there a session?" and then loads an object by an id from the request. Any logged-in user can pass any id. The check that was missing is "does this session own this object, or hold this permission on it?" That check has to run on the write, not only on the page that links to it.`,
      question:
        'POST /invoices/{id}/pay checks that a session exists and then pays the invoice id in the path. Login works. What check is missing, and what can a logged-in user do?',
      hints: [
        'The session proves the caller is some user. The path supplies the object.',
        'Hiding the button in the UI is not the check. The handler is.',
      ],
      outline: [
        'Authentication succeeds for any logged-in user.',
        'Nothing compares that user to the invoice.',
        'Any logged-in user can pay, or trigger payment of, someone else's invoice id.',
        'The handler must load the invoice and authorize this subject for this action.',
      ],
      solution: `The missing check is authorization on the invoice. The handler proved someone is logged in and then trusted the id. A logged-in user can pay an invoice they do not own by posting an id they guessed or copied. Login is working. That is why the report sounds confusing. The bug is not the session. It is the missing relationship between the session and the row.

Load the invoice and decide whether this subject may pay it. Owners may. Other roles may if you have them. Everyone else gets a 404 or a 403 you have thought about, and no payment is created. Do the same on read routes. A UI that only shows your invoices is not the control, because the route is reachable without the UI.`,
      rubric: [
        'Authentication is treated as present, and the missing piece is the subject-to-invoice check.',
        'The abuse is a logged-in user acting on an id they do not own.',
      ],
      myth: [
        'If login works and the UI hides other users\' invoices, the write is safe.',
        'The UI is not on the request path. The handler must authorize the object every time.',
      ],
      context:
        'This is often called an insecure direct object reference. The system-design name is an authorization check that never saw the object.',
      tradeoff: 'Returning 404 hides whether the id exists and can complicate clients. Returning 403 confirms the id and leaks less about the payment. Pick one and test it.',
      mistake: 'Adding a second login factor and leaving the object check absent.',
      followUp: 'Where does a support agent who may pay any invoice get that permission recorded?',
      extension: 'What is the equivalent missing check on GET /invoices/{id}?',
      alternative: 'Un-guessable ids slow enumeration and do nothing for an id leaked in a referrer, a log, or a forwarded email. They are not authorization.',
    },
    evening: {
      title: 'The check missing on the write',
      why: 'Reads get the careful checks because they are on the page you tested. Writes get added later and copy the authentication line without the authorization line.',
      explain: `Compare two handlers that share a session middleware. The bug is the handler that uses an id from the body or the path after that middleware and never loads an authorization decision. Middleware cannot see the object unless you taught it the object. Most object checks are local to the handler on purpose.

Also compare the verb. A user allowed to read a document is not allowed to delete it. A scope on a token is a list of actions, not a boolean called logged-in.`,
      question:
        'GET /files/{id} checks that the session user is on the file's ACL. DELETE /files/{id} checks only that the session exists, because the same middleware already ran. What can a user who can log in, and who was granted read on one file, do?',
      hints: [
        'The GET check does not run on DELETE.',
        'Read permission is not delete permission, and a missing check is even wider than that.',
      ],
      outline: [
        'DELETE does not consult the ACL.',
        'Any logged-in user can delete any file id, not only files they can read.',
        'A user with read on one file is enough of an authenticated caller to hit the route.',
        'DELETE must check an explicit delete permission on that file.',
      ],
      solution: `They can delete files they should not. DELETE never looks at the ACL. Any logged-in user, including one who was only granted read on a single file, can send a file id and remove it. The GET check does not travel with the middleware. Middleware only proved the session.

The write has to authorize the action. Load the file, require a delete permission for this user, and ignore the fact that GET was written carefully. A user who can read is still not a user who can delete, so copying the GET check verbatim would also be wrong, but it would at least stop strangers. The current code stops nobody who can log in. Add a test that logs in as a reader of file A and deletes file B, and one that logs in as a reader and deletes file A. Both should fail until delete is granted.`,
      rubric: [
        'The hole is on DELETE, and it allows any authenticated user, not only the file reader.',
        'The fix is an object-level delete check, not another login check.',
      ],
      myth: [
        'Session middleware authorized the request because it ran before the handler.',
        'It authenticated the request. Authorization that depends on the file has to see the file.',
      ],
      context:
        'Incident reviews call this "the write path." The pattern is a new verb added beside a checked verb, with the check not copied and not adapted.',
      tradeoff: 'Sharing an authorize(user, file, action) helper avoids drift and can hide a call that hits the database twice. Duplicated checks drift, which is this bug.',
      mistake: 'Fixing DELETE by checking that the user can read the file, and accidentally granting delete to every reader.',
      followUp: 'What should a token scoped to files:read receive on this route?',
      extension: 'Name a middleware that could authorize this delete without the handler forgetting.',
      alternative: 'A gateway rule on the DELETE method still cannot see the ACL unless it calls the service. The service check remains the one that has the data.',
    },
  },
  'token-storage': {
    morning: {
      title: 'Where a credential is allowed to sit',
      why: 'A token is a bearer secret. The storage you pick is the list of people who can become the user.',
      explain: `A browser should keep a high-value session in an HttpOnly, Secure, SameSite cookie so page scripts cannot read it. Local storage is readable by any script on the origin, which means any XSS becomes a stolen session. A phone should keep a refresh token in the platform keystore, not in a plain file and not in a log. A service should keep a credential in a secret store or an injected file with restricted permissions, not in the image, the repo, or the command line that shows up in process listings.

The token's lifetime is part of the storage decision. A stolen long-lived token is a stolen account until you notice. A stolen short-lived access token is a smaller window, and the refresh token is the one worth protecting.`,
      question:
        'A single-page app stores the access token and the refresh token in local storage so the JavaScript can attach them. What is the storage choice, and what theft does it accept that an HttpOnly cookie would not?',
      hints: [
        'Any script running on the origin can read local storage.',
        'HttpOnly cookies are sent by the browser and are not readable from document.cookie.',
      ],
      outline: [
        'Local storage is readable by JavaScript on the page.',
        'An XSS payload can copy both tokens and use them from somewhere else.',
        'An HttpOnly cookie cannot be read by that script.',
        'The refresh token in local storage is the long-lived theft. XSS is the path.',
      ],
      solution: `The choice accepts theft by any script that runs on the origin. A cross-site scripting bug, a malicious dependency, or an injected extension-equivalent on the page can read local storage and exfiltrate both tokens. The attacker then calls your API from their own machine until the refresh token dies or you revoke it. They do not need the user's browser anymore.

An HttpOnly Secure cookie is not readable by that script. XSS can still make the browser send the cookie while the page is open, which is bad and is a smaller window than a copied refresh token. Prefer the cookie for the browser session, keep the access token short, and do not put the refresh token where JavaScript can read it. If a non-browser client needs a refresh token, it is not this page. It is the phone keystore or a service secret, where script injection is not the threat.`,
      rubric: [
        'Local storage is described as exposed to script on the origin, with XSS as the theft.',
        'The refresh token is the durable secret, and an HttpOnly cookie removes script read access.',
      ],
      myth: [
        'Local storage is safe because it is not sent automatically like a cookie.',
        'Not sending it automatically avoids some CSRF. It does not stop a script from reading it and sending it anywhere.',
      ],
      context:
        'Cookie sessions reintroduce CSRF, which SameSite and anti-CSRF tokens address. That is a different attack from copying a bearer token out of the page.',
      tradeoff: 'HttpOnly cookies need CSRF defenses. Local storage needs you to never have an XSS bug, which is not a plan.',
      mistake: 'Putting the refresh token in local storage and calling the access token short-lived as if that bounded the theft.',
      followUp: 'What do you revoke when you discover the XSS, the access token or the refresh token?',
      extension: 'Where should a background worker keep the client-credentials secret it uses?',
      alternative: 'A memory-only access token in the page, with the refresh token in an HttpOnly cookie, limits what one XSS read can steal. The XSS can still refresh while the user is on the site.',
    },
    evening: {
      title: 'The storage choice you would reject',
      why: 'The evening question is the theft story. A storage choice is wrong when you can name who ends up holding a usable credential.',
      explain: `Reject storage that multiplies copies you do not control: source control, container images, chat logs, analytics, and crash reports. Reject storage that the wrong principal can read: world-readable files, local storage, a mobile backup, a log line that includes the Authorization header.

For each choice, name the attacker. "A person with the repo." "A script on the page." "Someone who images the lost phone." If you cannot live with that person being the user, pick another store.`,
      question:
        'A phone app stores the refresh token in a file in app storage so a webview can read it, and the crash reporter uploads app storage on failure. Which choice do you reject, and what is the theft scenario?',
      hints: [
        'The crash report leaves the device and is readable by whoever can open the bucket.',
        'A webview file is also readable by script inside the webview.',
      ],
      outline: [
        'Reject the file that the webview and the crash reporter can both read.',
        'A crash uploads the refresh token to the reporting vendor or your bucket.',
        'Anyone with that report can refresh and become the user.',
        'Keep the token in the platform keystore and keep it out of reports and webview JS.',
      ],
      solution: `Reject the plain file. It exists so a webview script can read the token, which means any script injected into that webview can read it too. The crash reporter then copies app storage off the phone. A crash during login ships the refresh token to a system your on-call and your vendor can open, and possibly to a ticket that gets forwarded. The thief does not need the phone. They need the report.

Store the refresh token in the platform keystore and let the OS gate it. Pass only a short-lived access token into the webview if the page truly needs to call an API, and strip file contents from crash reports. The theft you are refusing is "anyone who can read a crash artifact can mint new access tokens for that user." That is a storage bug, not a crash-reporter feature.`,
      rubric: [
        'The plain file is rejected because both the webview and the crash pipeline can read it.',
        'The scenario is an off-device copy of the refresh token used without the phone.',
      ],
      myth: [
        'App-private storage is safe because other apps cannot read it.',
        'Other apps are not the only readers. Your own webview, your backups, and your crash uploader are readers too.',
      ],
      context:
        'Logs are the server version of this bug. An Authorization header written at debug level is a credential store with a retention policy you forgot to set.',
      tradeoff: 'Keystore access is awkward in a webview and forces a native bridge. A file is easy and leaves the token in every subsystem that snapshots files.',
      mistake: 'Redacting the access token in the crash log and leaving the refresh token in the uploaded file snapshot.',
      followUp: 'What do you do with refresh tokens already sitting in last month\'s crash bucket?',
      extension: 'Where would a backend service\'s credential be equally wrong to store?',
      alternative: 'A device-bound token that the server will not refresh without a hardware signature still hurts when stolen with the device, and it does nothing if the crash report includes the unbound refresh token.',
    },
  },
  'rate-limiting': {
    morning: {
      title: 'A key, a limit, and a response',
      why: 'A limiter that buckets the wrong key punishes a whole office or lets one script through. The response teaches the client whether to back off or to retry immediately.',
      explain: `Pick the key from the abuse you are stopping. Credential stuffing is per account and per source. A noisy script is per token. A public page is per IP only if you accept that a NAT shares one IP across many people. The limit is a count and a window, or a rate, sized from real traffic plus headroom. The response should be 429 with a Retry-After when you want the client to wait, and it should be cheap to produce.

Decide what happens when the limiter itself is down or slow. Failing open serves the abuse you built the limiter to stop. Failing closed takes the feature down with the limiter. There is no universal answer. Login often fails closed. A product read sometimes fails open and relies on a coarser edge limit.`,
      question:
        'Credential stuffing is hitting POST /login. You can key the limit on IP, on account name, or on both. Choose a key, a response, and say who a pure IP limit would lock out unfairly.',
      hints: [
        'Many real users share an IP. One attacker can also use many IPs.',
        'The response should slow the client. A 500 makes them retry as fast as they can.',
      ],
      outline: [
        'Key on the account and on the source, not on IP alone.',
        'A pure IP limit locks out a NAT, a campus, or a mobile carrier.',
        'An attacker with a botnet walks around an IP-only limit, so the account key still matters.',
        'Return 429 with a delay. Do not do the expensive password check after the limit trips.',
      ],
      solution: `Use both keys. Limit attempts per account so one password list cannot grind a single user from a botnet, and limit attempts per IP or per device so one source cannot probe thousands of names. A pure IP limit is the one that punishes unfairly: a university NAT or a carrier-grade NAT will share an address across people who are not attacking, and you will lock the building out of login because one client was noisy.

Respond with 429 and Retry-After, and make that response cheaper than checking the password. A 500 or a timeout invites an immediate retry and spends the database. When the limiter store is down, fail closed on login. Serving unlimited password checks because Redis blinked is the outage the attacker was hoping for. Tell locked legitimate users how long to wait. Do not tell them whether the account exists.`,
      rubric: [
        'The key covers the account and the source, and a pure IP limit is tied to shared NATs.',
        'The response is a cheap 429, and limiter failure does not become unlimited attempts.',
      ],
      myth: [
        'Rate limit by IP. That is the abusive client.',
        'IP is a weak stand-in. NATs share it, and attackers rotate it. The account and the credential are the actual target.',
      ],
      context:
        'The limiter has to sit in front of the expensive work. A limit checked after a full password hash still lets the attacker spend your CPU.',
      tradeoff: 'Failing closed protects credentials and locks everyone out when the limiter is down. Failing open preserves login and preserves the attack.',
      mistake: 'Returning 401 for a limited attempt, which confirms the password was checked and teaches the client to try again immediately.',
      followUp: 'What do you store to enforce the limit without creating a new hot key on a popular account?',
      extension: 'Which key would you use for an authenticated export endpoint instead?',
      alternative: 'A proof-of-work or CAPTCHA after a soft limit slows scripts without a hard lockout. It annoys real users and still needs a key to decide when to show it.',
    },
    evening: {
      title: 'Fail open or fail closed',
      why: 'The limiter is a dependency. Its failure mode is a product decision you should write down before Redis has a bad minute.',
      explain: `A limiter in front of one replica only counts what that replica sees. Attackers and users are spread across replicas, so the effective limit is the configured limit times the replica count, and it moves when you autoscale. A shared limiter counts honestly and becomes a dependency of every request.

When that shared store times out, failing open lets traffic through at the full speed of the fleet. Failing closed rejects everyone the limiter would have covered. Partial failure, such as one replica that cannot see Redis, creates a hole only on that replica if you fail open, or a random fraction of 429s if you fail closed.`,
      question:
        'Each API replica limits logins in local memory at 20 attempts per minute per account. You scale from 2 replicas to 10 during a sale. The limiter process you meant to deploy is not in the path. What limit is actually enforced, and what happens if you later add a shared limiter that fails open when Redis times out?',
      hints: [
        'Local counters are not added together. Each replica starts at zero.',
        'Fail open means a Redis timeout is not a 429.',
      ],
      outline: [
        'The real account limit is about 20 times the replica count, and traffic is not perfectly sticky.',
        'Scaling to 10 replicas raises the ceiling. It does not tighten it.',
        'A shared limiter would count across the fleet.',
        'Failing open on Redis timeout removes the limit exactly when the store is unhealthy.',
      ],
      solution: `Each replica allows 20 attempts for an account it happens to see. With an even balancer, one account can be tried about 20 times on every replica. At 2 replicas that is on the order of 40 attempts a minute. At 10 it is on the order of 200, and a client who sticks to one replica still gets 20. Scaling out made the control weaker. Local memory also resets on deploy, so a restart wipes the count.

A shared limiter fixes the multiplication only while Redis answers. If a timeout fails open, every replica treats the outage as "allow." During the minute Redis is slow you have no login limit at all, on a route where that is the dangerous direction. Fail closed for login: if you cannot read the counter, reject with 429. You will lock out users during a Redis incident. That is the trade you are choosing in exchange for not running unlimited password checks.`,
      rubric: [
        'The effective limit is per replica, so adding replicas raises how many attempts an account can receive.',
        'Fail open on a shared limiter is described as removing the control during the store outage.',
      ],
      myth: [
        'Ten replicas with a 20 per minute limit enforce 20 per minute.',
        'They enforce 20 per replica. The fleet limit is the sum of what each replica allows.',
      ],
      context:
        'Autoscale and local limits pull against each other. The moment you add capacity you add budget for the abuse.',
      tradeoff: 'A shared counter is accurate and adds Redis latency to login. A local counter is fast and wrong by a factor of the fleet.',
      mistake: 'Failing open because "availability matters" on the one route an attacker uses to spend password hashes.',
      followUp: 'What does sticky-by-IP do to a local limiter, and who does it punish?',
      extension: 'How do you keep a shared counter from becoming a hot key on a single popular account name?',
      alternative: 'Enforcing the limit at a single edge tier, in front of the replicas, counts once. The edge is then the dependency, and its fail-open behavior is the same decision.',
    },
  },
  'edge-retries': {
    morning: {
      title: 'What the gateway is allowed to send twice',
      why: 'A gateway retry is a second request the user did not choose. It is safe only when the method and the route make the second request the same operation.',
      explain: `GET, HEAD, and a correctly implemented PUT or DELETE can be retried when the gateway sees a connect failure or a 502 or 503 before it has evidence the upstream started a non-idempotent effect. POST and PATCH are not retryable by default. 400 and 401 and 404 should not be retried. 429 should be retried only if Retry-After is respected, and often not by the gateway at all, because the gateway will retry in a tight loop and deepen the overload.

A retry also needs a budget. One retry on one hop is a policy. The same retry at the client, the gateway, and the mesh is an amplification loop.`,
      question:
        'The gateway retries any method on 502 and 503, up to two times, with no delay. Which status codes and which methods should it actually retry, and which current rule do you delete?',
      hints: [
        'A 502 can mean the upstream committed and died while writing the status.',
        'Two immediate retries on 503 multiply load on a tier that just said it was in trouble.',
      ],
      outline: [
        'Retry idempotent methods on connect failure, 502, and 503.',
        'Do not retry POST or PATCH unless the route has an idempotency contract.',
        'Do not retry 400-class responses.',
        'Delete the any-method immediate double retry. Add a small budget and a delay on 503.',
      ],
      solution: `Retry GET, HEAD, and PUT or DELETE only where the handler is actually idempotent, and only when the failure is a connect error, a 502, or a 503. One retry is enough at this hop. 503 should wait, not hammer. Do not retry 400, 401, 403, 404, or 409. The client has to change something.

Delete the rule that retries any method. POST /charges and PATCH /profile are in that set today. A 502 on those routes can be a commit that never produced a status, and the gateway will do it twice more. If a specific POST must be retried, require an idempotency key and retry only when that key is present. Immediate retries with no delay make a 503 worse. Put the retry at one layer and give it a deadline that fits inside the user's deadline.`,
      rubric: [
        'Retries are limited to idempotent methods and to gateway-class failures, not to every status.',
        'The any-method retry is removed, with POST called out as unsafe without a key.',
      ],
      myth: [
        '502 and 503 mean the upstream did not process the request.',
        'They mean the gateway did not get a clean success. The upstream may have committed and failed while answering.',
      ],
      context:
        'This is the HTTP retry contract from the foundations lessons, written as gateway config. The config is where the duplicate charge is usually introduced.',
      tradeoff: 'Not retrying POST makes real connect failures visible to the user. Retrying it hides the blip and creates duplicate side effects.',
      mistake: 'Retrying 429 instantly so the gateway "helps" a client that was told to slow down.',
      followUp: 'What header would let the gateway safely retry one specific POST?',
      extension: 'Why is a retry at the client and the gateway and the mesh a different problem from one retry here?',
      alternative: 'Never retrying at the gateway, and letting the client decide with the idempotency key, keeps the policy in one place. Connect failures then always surface to the client.',
    },
    evening: {
      title: 'A retry that sends the email twice',
      why: 'The duplicate is the bug. The status code that triggered the retry is only the mechanism.',
      explain: `Pick a side effect the user can observe twice: an email, a charge, a shipment, a push notification. Then find a retry that fires without a key the handler uses to collapse duplicates. The gateway is a common source. A client library with retries: true is another. The handler that commits and then crashes before the response is the reason the retry is not a no-op.

The fix is not "remove all retries." It is "this effect needs an idempotency record, or this hop must not retry it."`,
      question:
        'POST /invites sends an email and then returns 201. The process dies after the email is accepted by the provider and before the 201. The gateway retries 502s once for every method. What does the invited person see, and what single change stops the duplicate?',
      hints: [
        'The provider already accepted the first email. The gateway did not see the 201.',
        'The change can be at the gateway or in the handler. One of them must make the second call the same invite.',
      ],
      outline: [
        'The person receives the first email. The client sees a failure.',
        'The gateway retry sends a second email.',
        'Stop retrying this POST, or store an idempotency key and suppress the second send.',
        'Either change is enough on its own to stop the duplicate.',
      ],
      solution: `The invited person gets two emails. The first send succeeded, the handler died, the gateway recorded 502, and the retry ran the handler again with no memory of the first send. The client may also show an error and offer a button that sends a third.

Either change stops it. Remove POST /invites from the gateway retry policy, and the crash becomes a single email plus a client error, which is imperfect and not a duplicate. Or require an idempotency key, store it in the same transaction as "email accepted for this invite," and make the retry return the original 201 without calling the provider again. Doing both is fine. Doing neither leaves the duplicate in place. Do not "fix" it by catching the crash and returning 201 after the send without a key. You can still crash between the provider accepting and that return, which is the bug you already have.`,
      rubric: [
        'The user-visible duplicate is two emails caused by a retry after a successful send.',
        'One sufficient change is named: stop the POST retry or dedupe with an idempotency key.',
      ],
      myth: [
        'If we return 201 only after the email sends, retries are safe.',
        'The crash window is between the send and the return. The gateway retries whenever that return does not happen.',
      ],
      context:
        'Email is the friendly version of the double charge. The mechanism is identical. Only the user-visible damage changes.',
      tradeoff: 'Disabling the retry exposes connect failures as errors. An idempotency table hides them and has to be retained for as long as clients might retry.',
      mistake: 'Deduping on the recipient address forever, so a later legitimate second invite is swallowed.',
      followUp: 'How long do you keep the idempotency record for an invite?',
      extension: 'What does the client show if the gateway stops retrying and the first request dies before the 201?',
      alternative: 'Writing the invite as a row first and sending from an outbox worker lets the request return without the provider. The worker still needs the dedupe key, or the outbox retry sends two emails.',
    },
  },
  deadlines: {
    morning: {
      title: 'A deadline that shrinks inward',
      why: 'Each hop that uses the original timeout can outlive the user. The deadline has to be the time remaining, not the time each service wishes it had.',
      explain: `A user gives you a budget, often without saying so: the browser will wait about 30 seconds, or your gateway will wait 10. Every downstream call must finish inside what is left, including its own retries. Pass a deadline, not a fresh timeout. If 4 seconds remain, the database call does not get 4 seconds of retries. It gets whatever is left after the work you already did.

When the deadline passes, stop. A handler that keeps computing after the caller disconnected spends a worker on a response nobody will read, and it may still commit a side effect the caller will retry.`,
      question:
        'The gateway allows 10 seconds. The API sets a 10 second timeout on the database, then a 10 second timeout on a downstream scoring call. Where does the budget go, and what deadline should the scoring call see if the database already used 7 seconds?',
      hints: [
        'The two downstream timeouts are sequential. They do not share the 10 seconds. They add.',
        'Time already spent is gone. The next hop gets the remainder, minus a small reserve.',
      ],
      outline: [
        'The gateway will give up at 10 seconds regardless of the API clocks.',
        'A fresh 10 second timeout on each hop can keep the API working past the gateway deadline.',
        'After a 7 second database call, scoring should see the remainder, not another 10 seconds.',
        'If the remainder is too small to be useful, skip the call and fail the request.',
      ],
      solution: `The budget is spent twice. The API is willing to wait 10 seconds for the database and then another 10 for scoring, while the gateway stops at 10 and returns 504. Anything the API does after that is work the user will not see, and a commit in that window is a side effect the user may retry.

If the database used 7 seconds, scoring should see roughly the remainder, under 3 seconds, minus time to serialize the response. Pass a deadline timestamp, not a new 10 second timeout. If what remains is too small for a useful scoring call, do not start the call. Return a 504 or a degraded response before you exceed the gateway. Cancel the database query if you can when the deadline hits, so a slow query does not hold a connection for a client who is already gone.`,
      rubric: [
        'The stacked 10 second timeouts are shown running past the gateway budget.',
        'The scoring deadline is the time remaining after the database, not a fresh 10 seconds.',
      ],
      myth: [
        'Each service should set its own generous timeout so it does not fail early.',
        'A generous local timeout outlives the caller and turns one slow request into occupied workers all the way down.',
      ],
      context:
        'Deadlines are how you stop retry amplification from also being timeout amplification. A retry that does not fit in the remainder is a retry you do not start.',
      tradeoff: 'Tight deadlines fail more requests and free capacity. Loose ones keep hope alive and tie up the database for clients who have timed out.',
      mistake: 'Starting a 10 second retry after 9 seconds have already elapsed on a 10 second gateway timeout.',
      followUp: 'How do you test that a handler stops when the deadline header is already in the past?',
      extension: 'What should a queue consumer use as a deadline if there is no user waiting?',
      alternative: 'A gateway that disconnects and an API that ignores cancellation still wastes the API. Propagation only works if each hop watches the same deadline.',
    },
    evening: {
      title: 'Work that continues after the caller left',
      why: 'The caller giving up does not roll back the handler. It only means the response will be thrown away, unless you notice and stop.',
      explain: `Cancellation is cooperative. Closing the client socket does not abort a database transaction unless the handler is listening for the disconnect or for a deadline. The transaction can commit after the 504 has already been sent upstream. The client retries. You now have two commits and one user who saw a failure.

The handler should check the deadline before the side effect, not only before the expensive read. "We already did the work" is the wrong reason to commit after the caller is gone, if the caller is about to do the work again.`,
      question:
        'The gateway returns 504 at 8 seconds and closes the upstream connection. The handler does not watch for cancellation. It commits the booking at 9 seconds and then fails to write the response. What did the user decide to do, and what is in the database?',
      hints: [
        'The 504 is already on the user's screen before the commit.',
        'The handler's commit does not know the gateway gave up.',
      ],
      outline: [
        'The user sees failure and is likely to retry or to think they have no booking.',
        'The database has the booking from the late commit.',
        'A naive retry creates a second booking.',
        'The handler must abort when the deadline passes, before the commit, or the commit must be idempotent.',
      ],
      solution: `The user thinks the booking failed. They will retry, or they will leave and be charged for a booking they cannot see. The database has the first booking, committed at 9 seconds, after the gateway already told the user it was over. The response write fails because the connection is gone, so the handler may even log an error after a successful commit. That log is not a rollback.

Watch the deadline and the disconnect, and do not start the commit if the caller has already been answered with a failure. If the commit cannot be avoided in time, it has to be idempotent so the retry finds the original booking and returns it instead of inserting another. Letting the handler run to completion because "the work was almost done" is how the 504 and the row disagree. The user already made their decision. The database should not make a different one a second later.`,
      rubric: [
        'The user observes failure while the database records success a second later.',
        'The handler is required to stop before commit or to make the retry find the same booking.',
      ],
      myth: [
        'If the client disconnects, the server stops the transaction.',
        'Disconnect is visible only if the handler checks. The database will commit a transaction nobody is waiting for.',
      ],
      context:
        'This is the drain problem and the proxy-timeout problem again. The caller left. The side effect did not.',
      tradeoff: 'Aborting a commit that is milliseconds from finishing wastes the work and avoids the duplicate. Finishing it requires an idempotency key the retry can find.',
      mistake: 'Logging the late commit as a server error and leaving the booking in place with no id the client can retrieve.',
      followUp: 'How does the client retrieve the booking if it never received the id?',
      extension: 'What should a worker do with a message whose deadline expired before the handler took it?',
      alternative: 'Committing first under an idempotency key and returning that key even on a later retry accepts the late commit and makes it visible. The user can still see a 504 on the first attempt.',
    },
  },
  'idempotency-keys': {
    morning: {
      title: 'Store the key with the outcome',
      why: 'An idempotency key lets a retry return the first result instead of doing the work again. The storage and the response are the design. The header name is not.',
      explain: `The client sends a unique key for one logical operation. The server stores the key, the request fingerprint, and the outcome in the same transaction as the side effect. A repeat with the same key and the same body returns the stored outcome and does not send a second email or create a second charge. A repeat with the same key and a different body is a conflict, not a replay.

Retention has to cover the longest retry you invited, including a client that retries for a day. After you delete the record, a late retry is a new operation. The key is not a lock on the resource forever. It is the memory of one attempt.`,
      question:
        'Design the storage and the response for POST /charges with an Idempotency-Key. The client retries after a timeout. What do you store, what do you return the second time, and what do you return if the body changed?',
      hints: [
        'The key and the charge insert have to commit together. Otherwise you can store one without the other.',
        'The second response should be the first outcome, including a failure you already decided.',
      ],
      outline: [
        'Store the key, a hash of the body, and the response, in the same transaction as the charge.',
        'The same key and body return the stored response and do not create a charge.',
        'The same key and a different body return a conflict and do not create a charge.',
        'A missing record means you may create the charge, and then you must persist the record before you answer.',
      ],
      solution: `Store one row: the key, a hash of the request body, the status you returned, and the charge id, written in the same transaction as the charge. If the charge insert commits and the key row does not, a retry will not find the memory and will charge again. One transaction removes that window.

On a retry with the same key and the same body, return the stored status and the same charge id. Do not call the card network again. On the same key with a different body, return 409 and do nothing. The client reused a key for a new operation, and guessing which body they meant is how you charge the wrong amount. If no row exists, create the charge and the row together, then return 201. If two requests race and both see no row, the unique constraint on the key makes one of them lose. The loser reads the winner's row and returns that outcome.`,
      rubric: [
        'The key, the body fingerprint, and the charge commit together.',
        'A matching retry replays the response, and a mismatched body is a conflict.',
      ],
      myth: [
        'An idempotency key means the database ignores duplicate inserts.',
        'Only if you stored the key and consult it. The header does nothing by itself.',
      ],
      context:
        'The unique constraint is the lock. A check-then-insert without it is a race between two retries that both saw an empty table.',
      tradeoff: 'Keeping records for days makes late retries safe and stores every attempt. Keeping them for minutes makes the table small and turns a stuck client into a duplicate charge.',
      mistake: 'Storing the key only after a successful response, so a crash between commit and that insert forgets the charge.',
      followUp: 'What do you return if the stored outcome was a 400 validation error?',
      extension: 'Why store a hash of the body instead of trusting the key alone?',
      alternative: 'A client-generated charge id used as the primary key is the same design with the key in the URL. PUT /charges/{id} then replaces this POST contract.',
    },
    evening: {
      title: 'The first attempt is still in progress',
      why: 'A retry often arrives while the first request is still waiting on the card network. "No row yet" is the wrong signal to start a second charge.',
      explain: `You need a state for in progress, not only a state for done. The first request inserts the key as started, in the same transaction that claims the key, before the slow external call. A retry that finds started does not start a second call. It returns 409 or 425 and tells the client to wait, or it waits briefly and returns the outcome if the first request finishes.

If you insert the row only after success, two concurrent retries both see nothing and both charge. The in-progress row is what makes the unique key do its job during the slow part.`,
      question:
        'Two POSTs with the same Idempotency-Key arrive together. The card network takes 4 seconds. Decide what the second request returns while the first is still in progress, and what it returns after the first commits.',
      hints: [
        'Insert the key before the external call, with a status of started.',
        'The second request must not call the card network.',
      ],
      outline: [
        'The first request claims the key as in progress before the external call.',
        'The second request sees that state and does not create a charge.',
        'While in progress, return a conflict or a retry-later, not a second 201.',
        'After commit, the second request returns the stored charge result.',
      ],
      solution: `Claim the key first. Insert a row with status started and a unique key before you call the card network. The second request loses the insert race or reads the started row. It must not call the network. Return 409 or 425 with a short Retry-After so the client comes back. Do not block the second request for the full 4 seconds on a web worker if you can help it. A brief wait is a product choice. A second charge is not.

When the first request commits, it updates the same row to the final status and charge id. The next retry reads that row and returns the same 201 and the same id. If the first request fails before any charge exists, store that failure or delete the started row carefully. Deleting it lets a retry try again, which is what you want for a connect error and not what you want if the network call might have succeeded. If the external result is uncertain, leave the row in progress or mark it unknown. Do not remove the only memory that a call might be in flight.`,
      rubric: [
        'The in-progress row is created before the external call and blocks a second charge.',
        'The in-progress response is wait or conflict, and the later response is the stored result.',
      ],
      myth: [
        'If the second request arrives before the first commits, it is a different charge and should proceed.',
        'That race is why the key exists. Proceeding starts two charges for one key.',
      ],
      context:
        'Payment APIs document this state explicitly because clients retry on a timer shorter than the card network. The started row is the product.',
      tradeoff: 'Holding a started row forever blocks the key if the process dies mid-call. Expiring it too soon allows a second charge while the first call is still open at the network.',
      mistake: 'Returning 201 for the second request with a newly created charge because the first had not finished.',
      followUp: 'How do you recover a started row whose process died during the network call?',
      extension: 'What response does a third retry get if the first request stored a decline?',
      alternative: 'Serializing all charges for a customer on one lock avoids the double call and blocks unrelated charges behind a slow one. The idempotency row is the narrower lock.',
    },
  },
  'edge-synthesis': {
    morning: {
      title: 'One public POST, hop by hop',
      why: 'The edge is where proxy policy, auth, and limits meet the handler. Drawing one request through them shows which hop is allowed to say no, and which hop is allowed to commit.',
      explain: `Take POST /charges from the public internet. The proxy terminates TLS, rejects an oversized body, and is the only writer of the forwarded client address. The gateway authenticates the token and applies a coarse rate limit. Neither of those hops creates a charge. The handler then authorizes the caller for this merchant, claims the idempotency key, and only then talks to the card network and the database.

If any earlier hop retries without the idempotency contract, it can still duplicate the charge. If auth lives only in the gateway, an internal caller skips it. The point of the walk is to put each decision on a hop that has the data and to keep the commit on exactly one of them.`,
      question:
        'Walk a public POST /charges through the proxy, authentication, the rate limit, and the handler. For each hop, say whether it may retry, and where the charge is actually created.',
      hints: [
        'Only the handler has the idempotency row and the card-network call.',
        'A limit or an auth failure should be a response, not a retry.',
      ],
      outline: [
        'The proxy ends TLS, enforces size, and must not retry this POST on a 502.',
        'Authentication rejects a bad token with 401 and does not create a charge.',
        'The rate limit rejects early with 429, before the handler, and does not retry.',
        'The handler claims the idempotency key and is the only hop that creates the charge.',
      ],
      solution: `The proxy accepts the connection, verifies TLS, and drops a body that is too large. It forwards one request. It may retry a connect failure only if it is sure the handler never saw bytes. It must not retry a 502, because the handler may have charged and died while answering. Authentication runs next, at the gateway or the handler. A bad token is 401. That response is final. Retrying it will not grow a valid credential.

The rate limit runs before the card network. Over the limit, return 429 and stop. Do not let the handler create a charge and then discover the caller was over budget. The handler authenticates the merchant relationship, not just the token's existence, claims the idempotency key as in progress, and only then creates the charge. That is the only hop that commits. Everyone else is allowed to say no. None of them is allowed to say yes twice.`,
      rubric: [
        'Proxy, auth, and limit each get a no, and none of them is described as creating the charge.',
        'The handler is the only writer, and the proxy is forbidden to retry the unsafe 502.',
      ],
      myth: [
        'The gateway creates the charge because it is the public API.',
        'The gateway admits the request. The handler and the database create the charge. Confusing them is how retries get placed on the wrong hop.',
      ],
      context:
        'This walk is the whole web phase in one request. Each earlier day is a hop on this path.',
      tradeoff: 'Authenticating at the gateway saves handler CPU and can drift from handler rules. Authenticating only in the handler is harder to bypass and spends CPU on anonymous traffic.',
      mistake: 'Letting the proxy, the mesh, and the handler each retry the POST once.',
      followUp: 'Which hop should see the Idempotency-Key, and which hop should interpret it?',
      extension: 'Where would you reject a forged X-Forwarded-For on this same request?',
      alternative: 'Collapsing proxy, auth, and limit into one process reduces hops and couples their deploys and their blast radius. The decisions do not change. Only the number of timeouts does.',
    },
    evening: {
      title: 'Stop the duplicate without a new service',
      why: 'The phase ends on the smallest change. A duplicate charge does not require a new platform. It requires one hop to remember the first attempt.',
      explain: `Look at the path you just walked and find the duplicate. It comes from a retry of a POST that already committed, or from two concurrent first attempts. The change that stops it is an idempotency key stored with the charge in the handler that already exists. A new dedupe service is another network hop with the same problem: you can crash after charging and before telling it.

Prefer the change that sits in the same transaction as the side effect. Everything else is optional.`,
      question:
        'Users are being charged twice when the proxy times out and retries POST /charges. Name the one change that stops the duplicate. You may not add a service.',
      hints: [
        'The proxy retry is the trigger. The missing memory is in the handler.',
        'A new service would have its own timeout between the charge and the record.',
      ],
      outline: [
        'Keep the charge creation where it is.',
        'Require an idempotency key and store it in the same transaction as the charge.',
        'The proxy retry then receives the original result and does not create a second charge.',
        'Alternatively, stop retrying the POST. That also avoids a new service, with a worse client experience.',
      ],
      solution: `Require an Idempotency-Key and store it in the same database transaction as the charge, including the in-progress state before the card call if that call sits inside the request. When the proxy times out and retries, the handler finds the key and returns the first charge. It does not create another. No new service is involved, so there is no second place to crash between the money and the memory.

Stopping the proxy from retrying POST also stops the duplicate and also adds nothing. It leaves the user with a timeout and an unknown charge, so it is the worse of the two one-change fixes. Do not do both poorly by adding a cache key in a sidecar. The sidecar is a service, and a crash after the charge and before the sidecar write is the original bug. The row next to the charge is the change.`,
      rubric: [
        'The change is an idempotency record in the existing charge transaction, not a new component.',
        'The proxy retry is what hits that record, and a sidecar dedupe service is rejected.',
      ],
      myth: [
        'We need a deduplication platform before we can stop double charges.',
        'You need a unique key in the same commit as the charge. A platform that hears about the charge later is another partial failure.',
      ],
      context:
        'This is the web phase applied to one route. Proxy policy without handler memory is how the duplicate survives a redesign.',
      tradeoff: 'Storing keys on the charge table couples retention to the payments schema. It also makes the memory impossible to lose without losing the charge.',
      mistake: 'Turning off timeouts so the proxy never retries, and letting slow charges occupy gateway workers forever.',
      followUp: 'What must the client send on the retry for this change to work?',
      extension: 'Which earlier lesson's failure remains if the key is stored in Redis instead of in the charge transaction?',
      alternative: 'Disabling the proxy retry is the other change that adds no service. It stops duplicates and leaves uncertain charges the client cannot see.',
    },
  },
};
