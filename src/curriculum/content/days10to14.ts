import { buildFullDay } from '../author';
import type { CurriculumDay } from '../types';

export const days10to14: CurriculumDay[] = [
  buildFullDay({
    day: 10,
    phaseId: 'foundations',
    title: 'HTTP',
    morning: {
      title: 'Requests, methods, and status',
      conceptIds: ['concept.http', 'concept.tcp'],
      objectives: [
        'Read an HTTP exchange as a contract with method, status, and framing.',
        'Decide which methods a client may retry from the semantics, not from hope.',
      ],
      durationMinutes: 16,
      difficulty: 'foundational',
      resourceIds: ['resource.rfc9110'],
      whyItMatters:
        'Load balancers, browsers, and client libraries retry some methods on their own. If your POST creates a charge, their helpfulness becomes your incident.',
      explanation:
        'HTTP is a request and a response on a transport, almost always TCP with TLS in front of users. The request has a method, a target, headers, and sometimes a body. The response has a status code, headers, and sometimes a body. The connection can carry more than one exchange. Whether it does is a version and a header decision, not a new network.\n\nMethods have intended semantics. GET is a read and is safe to repeat. PUT replaces a resource at a known target and is idempotent: doing it twice leaves the same state as doing it once. DELETE is idempotent in the same practical sense. POST is the method for operations that are not necessarily safe to repeat. A client that retries POST is making a bet the server must be in on.\n\nStatus codes are the server\'s classification, and clients act on them. 2xx means the server accepted the exchange. 4xx means the client should not blindly repeat the same request: not found, unauthorized, validation. 5xx and some 429 responses mean the server, or a gateway, failed or refused under load. A timeout is not a status code. It is the absence of one, which you already treated as dangerous for payments.\n\nProxies and clients may retry idempotent methods when a connection dies before a response. They generally should not retry POST unless they have an application contract. "The library retries on 502" is a behavior you need to read, not a default to assume is safe.',
      question:
        'A checkout endpoint is POST /charges. A gateway retries the request once when it sees a 502 from the application, and the application sometimes commits the charge and then crashes before writing the 201. What state can the customer end up in, and how should the HTTP contract change?',
      hints: [
        'A 502 means the gateway did not get a valid response. It does not mean the application did nothing.',
        'POST is not idempotent unless you add a contract that makes this particular POST idempotent.',
      ],
      expectedOutline: [
        'The charge can commit without a 201, so the client and gateway see failure.',
        'The gateway retry can create a second charge.',
        'An idempotency key makes the second POST return the original result.',
        'The gateway should not invent retries for a non-idempotent POST that lacks that contract.',
      ],
      referenceSolution:
        'The application committed and then died. The gateway saw a broken response and classified it as 502. As far as HTTP goes, there is no 201, so the client believes the charge failed. The money may already have moved. The gateway\'s automatic retry sends a second POST. Nothing in the method says "this is the same charge", so the application creates another one. The customer can be charged twice while their screen says the first attempt failed, then surprised by a later success or a second success.\n\nChange the contract. Require an idempotency key on POST /charges. The first request stores the key with the outcome. A retry with the same key returns that outcome, including "in progress" if the first attempt has not finished, and does not create a second charge. Until that exists, the gateway must not retry this POST on 502. Retrying GET /charges/{id} to read the result is a different, safer request.\n\nStatus codes still matter. A 400 should not be retried. A 502 might be retried only when the idempotency contract makes the retry the same operation.',
      rubric: [
        { id: 'commit-gap', description: 'A committed charge can exist even though the client never received 201.', conceptId: 'concept.http' },
        { id: 'contract', description: 'The fix is an idempotency contract, and blind POST retries stop until then.', conceptId: 'concept.http' },
      ],
      misconceptions: [
        { id: '502-means-not-done', statement: 'A 502 means the handler did not run.', correction: 'A 502 means the gateway lacked a valid response. The handler may have committed and then failed while answering.' },
      ],
      engineeringContext:
        'This is the HTTP face of the TCP retry problem. Gateways retry idempotent requests by policy. POST becomes safe to put on that list only after the application promises that a repeated call is the same call.',
      extensionQuestions: [
        'What status should the server return when the same key is still in progress?',
      ],
      acceptableAlternatives: [
        'PUT on a client-generated charge id is a valid idempotent redesign if repeats replace rather than duplicate.',
      ],
      tradeoffs: [
        'Storing idempotency keys costs a database write and a retention policy. Not storing them costs duplicate charges.',
      ],
      commonMistakes: [
        'Returning 200 for a retry that created a second charge, because the second charge "succeeded".',
      ],
      followUps: [
        'How long do you keep the idempotency record, and what happens after you delete it?',
      ],
    },
    evening: {
      title: 'Which call is safe to send again',
      conceptIds: ['concept.http'],
      objectives: [
        'Classify a small API by retry behavior using method and server contract, not the product name.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      resourceIds: ['resource.rfc9110'],
      whyItMatters:
        'Interview designs and production clients both fail by retrying "the API" as if every route had the same semantics.',
      explanation:
        'Build the habit of a table: route, method, side effect, idempotent or not, and what a retry must send. Safe reads can retry within a deadline. Creates need a key or a client-generated id. A status poll is a GET and is the right place to put the client\'s impatience.',
      question:
        'An API has GET /orders/{id}, POST /orders, and PUT /orders/{id}/address. The client times out on each during a blip. Which retries are safe with no extra server support, which need a contract, and what should the client do instead of retrying POST blindly?',
      hints: [
        'PUT to a known address resource is a replacement. POST /orders creates.',
        'After a doubtful POST, reading the order is not the same as creating it again.',
      ],
      expectedOutline: [
        'GET is safe to retry.',
        'PUT is idempotent if the body is the full desired address. Repeating it converges.',
        'POST needs an idempotency key or a client-generated id. Otherwise do not retry it blindly.',
        'If the create timed out, look up the order by a key the client already has, or surface uncertainty. Do not fire a second create.',
      ],
      referenceSolution:
        'GET /orders/{id} has no side effect. Retry it inside the user\'s deadline. A second GET does not create a second order.\n\nPUT /orders/{id}/address replaces the address. If the body is the complete new address, sending it twice leaves that address in place. It is safe without an extra key, provided the server really replaces rather than appending a change log entry per call. If two different addresses are in flight, last write wins, which is a product decision, not a retry accident.\n\nPOST /orders is not safe to repeat. A timeout is not proof the order is absent. The client should send an idempotency key and retry with the same key, or use a client-generated order id with PUT. If the API offers neither, the client should not automatically POST again. It should tell the user the result is unknown and offer a refresh of their order list, or a support path. A spinner that creates three orders is worse than an honest "we are not sure".',
      rubric: [
        { id: 'classify', description: 'GET, PUT, and POST are classified from side effects, not treated as one API.', conceptId: 'concept.http' },
        { id: 'post', description: 'A blind POST retry is rejected, with a concrete alternative.', conceptId: 'concept.http' },
      ],
      misconceptions: [
        { id: 'put-appends', statement: 'PUT is safe no matter what the handler does.', correction: 'PUT is idempotent when repeating it leaves the same state. A handler that appends a row per PUT has broken that contract.' },
      ],
      engineeringContext:
        'Client generators and API gateways ask you to mark routes idempotent. That checkbox is this classification. Marking POST idempotent without a key is how the gateway from the morning lesson gets built.',
      extensionQuestions: [
        'A PUT that updates "address" and also increments a revision counter: is the second call the same state?',
      ],
      acceptableAlternatives: [
        'A synchronous create that returns only after commit, plus a lookup by client token, is a valid alternative design.',
      ],
      tradeoffs: [
        'Refusing to retry POST avoids duplicates and leaves the user uncertain. Retrying with a key removes the uncertainty and requires storage.',
      ],
      commonMistakes: [
        'Polling POST /orders in a loop because GET felt like extra work.',
      ],
      followUps: [
        'What unique constraint in the database would back the idempotency key?',
      ],
    },
  }),
  buildFullDay({
    day: 11,
    phaseId: 'foundations',
    title: 'Latency',
    morning: {
      title: 'Latency budgets and tail latency',
      conceptIds: ['concept.latency', 'concept.cpu'],
      objectives: [
        'Use a latency budget and a percentile instead of an average.',
        'Explain why a dependency\'s tail dominates the user\'s tail.',
      ],
      durationMinutes: 16,
      difficulty: 'foundational',
      resourceIds: ['resource.sre-monitoring'],
      whyItMatters:
        'Users remember the slow request. An average hides it, and a timeout copied from the average turns the tail into errors.',
      explanation:
        'Latency is the wall-clock wait for one operation. A budget is the wait you are willing to spend, split across the hops that make the operation. If the page budget is 200 ms and the token check can take 20 ms, the catalog 80 ms, and the network 40 ms, the slack is what remains for queueing, retries, and garbage collection. A retry that uses the full budget again has already spent the user\'s budget twice.\n\nThe median, p50, is a typical request. p99 is the request that is slower than 99 of 100. Averages sit near the median when the distribution is tight and get dragged by outliers when it is not. A service with p50 of 30 ms and p99 of 2 s is not a 30 ms service to the unlucky user, and those users are often the ones with the largest carts, the cold caches, or the contended row.\n\nTail latency gets worse as you call more dependencies. If a page calls twenty services and waits for all of them, the chance that one of them is having a bad moment approaches certainty even when each service is usually fast. The page\'s p99 tracks the worst dependency\'s tail, plus queueing. Timeouts must be shorter than the parent budget and coordinated. A child with a 5 s timeout inside a parent with a 200 ms budget is fiction. The parent gives up, and the child keeps working.',
      question:
        'A product page calls ten services and waits for every one. Each service has p50 of 20 ms and p99 of 300 ms. The page budget is 250 ms. Why can the page miss the budget even though every service\'s median looks fine, and what design change reduces that exposure?',
      hints: [
        'The page is slow if any required service is slow.',
        'Ten independent p99 events do not stay at the p99 of one service.',
      ],
      expectedOutline: [
        'The page latency is driven by the slowest required call, not the median of each.',
        'The chance of hitting someone\'s tail grows with the number of calls.',
        '300 ms already exceeds the 250 ms page budget, so one slow dependency breaks the page.',
        'Reduce required calls, parallelize what remains, set child deadlines inside the budget, or degrade when a non-critical call is slow.',
      ],
      referenceSolution:
        'The page cannot finish until the slowest required service finishes. Each service is usually near 20 ms, so a demo looks fine. Across ten services, it is common that at least one is somewhere in its tail. A single 300 ms response already exceeds the 250 ms budget by itself, before network and assembly. The median of each dependency never described the page.\n\nThe design change is to stop treating every call as required and unbounded. Call the necessary ones in parallel, give each a deadline that fits inside 250 ms, and decide what the page does when a non-critical call misses that deadline: omit recommendations, show a cached price, or render without reviews. Caching the slow fragment removes it from the critical path entirely. Combining chatty calls reduces the number of tails you are exposed to.\n\nWhat you should not do is raise the page budget silently to 3 s so the chart goes green. That hides a dependency whose own p99 cannot fit the product.',
      rubric: [
        { id: 'tail', description: 'Page latency follows the slowest required dependency, and ten calls raise the odds of a tail.', conceptId: 'concept.latency' },
        { id: 'design', description: 'The change cuts required tails: deadlines, parallelism, fewer calls, or degradation.', conceptId: 'concept.latency' },
      ],
      misconceptions: [
        { id: 'median-page', statement: 'If every service has a 20 ms median, the page takes about 20 ms.', correction: 'Only if the page waits for one typical call. Waiting for all of them tracks the worst call in the group.' },
      ],
      engineeringContext:
        'This is the "tail at scale" problem in miniature. It shows up in fan-out to storage shards as well as to services. Hedged requests, sending a second copy after a delay, are one response to tails and they double load if you hedge too early. You do not need that tool until the budget and the critical path are explicit.',
      extensionQuestions: [
        'When would a hedged request help, and when would it stampede the slow dependency?',
      ],
      acceptableAlternatives: [
        'A single aggregated backend call is a valid redesign if you say what tail it removes from the page.',
      ],
      tradeoffs: [
        'Degrading the page protects the budget and ships a worse page. Waiting protects completeness and misses the budget.',
      ],
      commonMistakes: [
        'Setting every child timeout equal to the parent budget, so the first child can consume the entire budget.',
      ],
      followUps: [
        'Which of the ten calls would you drop first, and what would the user lose?',
      ],
    },
    evening: {
      title: 'Spend a 200 millisecond budget',
      conceptIds: ['concept.latency'],
      objectives: [
        'Assign numbers to hops and leave slack for the tail and one recovery attempt.',
      ],
      durationMinutes: 15,
      difficulty: 'foundational',
      whyItMatters:
        'A budget that is not divided is a slogan. The evening session makes you divide one.',
      explanation:
        'Write the budget as a stack: client network, edge, application queue, dependency, and slack. Slack is not waste. It is the difference between a p50 design and a p99 design. If the stack already sums past the budget at p50, no amount of hope fixes p99.',
      question:
        'You have 200 ms for a signed-in API call from the edge to the response. The token introspection median is 15 ms with a 80 ms p99. The database median is 10 ms with a 40 ms p99. Queueing on the app can reach 30 ms under load. Divide the budget. What do you refuse to retry?',
      hints: [
        'Use the tails of required hops, not the medians, when deciding if the budget fits.',
        'A retry of the whole call needs another 200 ms the user did not give you.',
      ],
      expectedOutline: [
        'Sum the p99 or a chosen percentile of the required hops plus queueing.',
        'Token 80 plus database 40 plus queue 30 is already 150 ms, before network and serialization.',
        'There is little slack. A full retry does not fit.',
        'Refuse to retry the whole request inline. Maybe retry only a fast idempotent read if a smaller leftover remains, or fix the token tail instead.',
      ],
      referenceSolution:
        'At the tails you already measured, token introspection can take 80 ms, the database 40 ms, and queueing 30 ms. That is 150 ms before the edge network, TLS on an inner hop, and writing the response. The remaining slack inside 200 ms is small, on the order of a few tens of milliseconds, and it disappears if any hop exceeds its current p99.\n\nI would not retry the whole call inline. A second attempt needs a fresh budget and the user is already at the limit. I would also not retry token introspection by default: its tail is the largest term, and a retry can turn an 80 ms failure into 160 ms plus the database. The work belongs in shrinking that tail, caching a validated token for a short time, or running the database and any independent work in parallel with a deadline.\n\nThe budget I would write down: 90 ms deadline for auth including its cache, 50 ms for the database, 30 ms for queueing, 30 ms slack for the rest. If auth misses 90 ms, fail that request rather than spending the database budget on a call you will discard. Those numbers are a contract you can alert on. The medians of 15 and 10 ms are not the contract.',
      rubric: [
        { id: 'sum', description: 'The tails and queueing are added and compared with 200 ms.', conceptId: 'concept.latency' },
        { id: 'retry', description: 'A full inline retry is rejected because it does not fit the budget.', conceptId: 'concept.latency' },
      ],
      misconceptions: [
        { id: 'median-budget', statement: 'The budget works because 15 plus 10 is much less than 200.', correction: 'The user at the tail pays the tails, plus queueing. The median sum is the happy path only.' },
      ],
      engineeringContext:
        'This is how an SLO on a user journey turns into timeouts on clients. Each client timeout is a slice of a parent deadline. Teams that pick timeouts locally invent a stack that cannot close.',
      extensionQuestions: [
        'If token introspection were cached, which number moves, and what new failure appears when the cache is stale?',
      ],
      acceptableAlternatives: [
        'Different numbers are fine if they use tails, leave slack, and still refuse a nested full retry.',
      ],
      tradeoffs: [
        'A hard child deadline fails a few slow auths quickly. A soft one lets them consume the whole user budget and then time out anyway.',
      ],
      commonMistakes: [
        'Budgeting the medians and then being surprised by the p99 pager.',
      ],
      followUps: [
        'What would you page on: p50, p99, or the fraction of requests that miss 200 ms?',
      ],
    },
  }),
  buildFullDay({
    day: 12,
    phaseId: 'foundations',
    title: 'Throughput',
    morning: {
      title: 'Throughput is not the inverse of latency',
      conceptIds: ['concept.throughput', 'concept.latency'],
      objectives: [
        'Define throughput as completed work per time, with a resource that caps it.',
        'Estimate a coarse capacity from rate, size, and a bottleneck.',
      ],
      durationMinutes: 16,
      difficulty: 'foundational',
      whyItMatters:
        'A design that quotes latency and never quotes work per second cannot say whether one database, one core, or one link will carry the product.',
      explanation:
        'Throughput is completed operations per unit time: requests per second, rows per second, bytes per second. Latency is how long one operation waits. A system can have terrible throughput and excellent latency at low load, when a single request has the machine to itself. It can have high throughput and poor latency when it is busy and requests queue.\n\nThe cap is a bottleneck resource. A core can do so much CPU work. A disk can do so many IOPS or so many megabytes. A link can carry so many bits. A database connection can run one query at a time if the driver serializes it. Throughput cannot exceed the narrowest of these, and adding load past that point mostly adds latency.\n\nA coarse estimate makes the bottleneck visible. Suppose 500 requests per second, each reading a 20 KB payload from the database and spending 2 ms of CPU. CPU demand is 500 times 2 ms, which is one full core before overhead. Payload from the database is 500 times 20 KB, about 10 MB/s, which is comfortable for a network and not the first limit. If each request also takes a pooled connection for 30 ms of database time, you need 500 times 0.03 connections busy at once, which is 15 connections just for this call. The arithmetic is not a capacity plan. It is how you find which number to measure.\n\nGoodput is useful throughput, excluding retries and overhead. A client that retries three times can triple the measured request rate without tripling useful checkouts.',
      question:
        'A service handles 200 requests per second. Each request uses 5 ms of CPU and writes a 4 KB row. Predict the first bottleneck you would measure, show the arithmetic, and say what would mislead you if you only watched request latency at 10 requests per second.',
      hints: [
        'CPU seconds per second is utilization of one core. 200 times 0.005 is a full core.',
        'A quiet test does not queue, so latency looks like service time.',
      ],
      expectedOutline: [
        'CPU: 200 * 5 ms = 1 second of CPU per second, about one core, before overhead and GC.',
        'Write bandwidth: 200 * 4 KB is under 1 MB/s, unlikely to be first.',
        'The first thing to measure is CPU, then the database\'s ability to take 200 small writes.',
        'Latency at 10 rps hides the queue that appears when the core is full.',
      ],
      referenceSolution:
        'CPU demand is 200 requests times 5 ms, which is 1,000 ms of CPU every second. That is one core saturated, and real overhead, garbage collection, and the kernel will push it past one core. Write traffic is 200 times 4 KB, about 800 KB/s, which is small for a disk or a network. I would measure CPU first, per core not as a host average, and then confirm the database can commit 200 small writes a second with its own fsync and lock behavior. The arithmetic says the link is not the story.\n\nAt 10 requests per second the same handler uses 50 ms of CPU per second, a small fraction of one core. Latency there is mostly service time, the 5 ms plus I/O, and it will not show the queue that appears when you ask for a full core. A load test that never approaches the bottleneck produces a flattering latency number and an imaginary capacity.',
      rubric: [
        { id: 'arithmetic', description: 'CPU demand is computed as rate times CPU time, and bytes are estimated too.', conceptId: 'concept.throughput' },
        { id: 'low-load', description: 'Low-load latency misses the queue that appears at the bottleneck.', conceptId: 'concept.throughput' },
      ],
      misconceptions: [
        { id: 'latency-is-capacity', statement: 'If latency is 5 ms, the service can do 1/0.005 = 200 requests per second per whatever.', correction: 'That division is a single-core CPU sketch only if the 5 ms is CPU and nothing else limits you. It is not a measurement of the database, the lock, or the fleet.' },
      ],
      engineeringContext:
        'This is the start of capacity estimation you will do later with SLO headroom and multiple resources. The discipline is the same on day one: name the resource, multiply, and then measure the thing the multiplication pointed at.',
      extensionQuestions: [
        'If a retry storm doubles the 200 rps without doubling checkouts, what happened to goodput?',
      ],
      acceptableAlternatives: [
        'Choosing the database as the first measurement is acceptable if you show why 200 commits might be harder than the CPU sketch and you still do the CPU arithmetic.',
      ],
      tradeoffs: [
        'Headroom below the bottleneck keeps latency stable and spends money on idle capacity. Running at the cap maximizes utilization and maximizes queueing.',
      ],
      commonMistakes: [
        'Dividing a host\'s core count into a latency measured when the host was idle.',
      ],
      followUps: [
        'What extra CPU would you reserve for a traffic spike and for garbage collection?',
      ],
    },
    evening: {
      title: 'A one-page capacity sketch',
      conceptIds: ['concept.throughput'],
      objectives: [
        'Produce a bottleneck sketch with explicit assumptions and one measurement that would falsify it.',
      ],
      durationMinutes: 18,
      difficulty: 'foundational',
      whyItMatters:
        'System design interviews and production planning both ask "will it fit?". The honest answer shows the arithmetic and the assumption that could be wrong.',
      explanation:
        'State assumptions in one line each: peak rate, payload, CPU per request, and how long a scarce resource is held. Compute utilization. Pick the resource over roughly 50 percent at peak as the one to test. Name the measurement that would prove the sketch wrong, such as a CPU profile that shows 20 ms instead of 5, or a lock wait the sketch forgot.',
      question:
        'Peak traffic is 1,000 reads per second. Each read is one indexed database lookup that you believe takes 1 ms of database time and 1 ms of application CPU, returning 2 KB. Sketch the capacity. What assumption, if wrong, invalidates the "one database is plenty" conclusion?',
      hints: [
        'One thousand times 1 ms of database time is one full database core or one fully busy connection-second, only if the lookup really is 1 ms.',
        'A lock, a cache miss, or a fan-out inside that "one lookup" changes the 1 ms.',
      ],
      expectedOutline: [
        'App CPU is about one core. Database service time is about one core or one second of DB time per second.',
        'Bandwidth is about 2 MB/s.',
        'One database can be enough if the 1 ms holds and there is headroom.',
        'The conclusion dies if the lookup is a scan, waits on a lock, or fans out to many rows. Measure the actual database time and rows read.',
      ],
      referenceSolution:
        'Application CPU is 1,000 times 1 ms, about one core, so the app tier wants more than one core once overhead and failover are included. Database time is also 1,000 times 1 ms, one full second of database work every second, so one database core at 100 percent if the lookup is really 1 ms of execution and does not wait. Return traffic is 1,000 times 2 KB, about 2 MB/s, which is not the limit. Connections: if each lookup holds a connection for that 1 ms, you need on the order of a handful of connections, not hundreds, unless the 1 ms is actually 50 ms of waiting.\n\n"One database is plenty" depends on the 1 ms indexed lookup. It is wrong if the query scans, if p99 is 40 ms because of lock waits, if each "read" is twenty queries, or if the working set does not fit in memory and the 1 ms becomes disk time. The measurement that falsifies the sketch is the database\'s actual time per query and rows examined at peak, plus CPU on that box. If those match the assumption, one primary with headroom is a reasonable starting point. If they do not, the sketch told you what to redesign.',
      rubric: [
        { id: 'sketch', description: 'CPU, database time, and bytes are estimated from the stated assumptions.', conceptId: 'concept.throughput' },
        { id: 'falsify', description: 'A specific wrong assumption, such as hidden lock or scan time, is named as the thing to measure.', conceptId: 'concept.throughput' },
      ],
      misconceptions: [
        { id: 'reads-are-free', statement: 'Reads do not count as load.', correction: 'Reads cost CPU, cache, and bandwidth. A million cheap reads are a capacity problem.' },
      ],
      engineeringContext:
        'Interviewers ask for this sketch to see whether you notice the bottleneck. Production uses the same sketch to decide what to load-test. Neither is a promise. Both are a hypothesis with a measurement attached.',
      extensionQuestions: [
        'How does the sketch change if 10 percent of reads miss an application cache and the rest hit it?',
      ],
      acceptableAlternatives: [
        'Adding a replica for read capacity is reasonable if you also say the 1 ms assumption is what would make it unnecessary.',
      ],
      tradeoffs: [
        'Sizing for peak with 50 percent headroom costs idle machines and absorbs a spike. Sizing to the average looks efficient and falls over at the peak.',
      ],
      commonMistakes: [
        'Quoting 2 MB/s as proof the system is fine while a single database lock serializes the 1,000 reads.',
      ],
      followUps: [
        'What peak, not average, would you insist on before trusting the sketch?',
      ],
    },
  }),
  buildFullDay({
    day: 13,
    phaseId: 'foundations',
    title: 'Queueing',
    morning: {
      title: 'Queues, utilization, and Little\'s law',
      conceptIds: ['concept.queueing', 'concept.throughput', 'concept.latency'],
      objectives: [
        'Explain why latency explodes as utilization approaches the bottleneck.',
        'Apply Little\'s law to a worker pool with explicit units.',
      ],
      durationMinutes: 18,
      difficulty: 'foundational',
      whyItMatters:
        'Most "we need more instances" incidents are a queue you did not bound. The math is small and the failure is familiar: latency was fine at 60 percent and unacceptable at 90.',
      explanation:
        'A queue forms when work arrives faster than it is completed, even briefly. The server, the thread pool, the database, and the TCP listen backlog are all queues. While an item is queued it is not being served, so queue time adds to latency and does not add to useful throughput.\n\nUtilization is how busy the server is. As it approaches 1, there is no slack to absorb a clump of arrivals. Queue length and wait grow sharply, not in a straight line. This is why a system that looks healthy at 50 percent utilization can miss its latency SLO at 85 percent with no new bug. The knee is the point where adding a little traffic adds a lot of wait.\n\nLittle\'s law relates the average number of items in a stable system, L, to the average arrival rate λ and the average time an item spends in the system, W: L = λ times W. The units have to match. If 100 requests per second spend an average of 0.2 seconds in a worker pool, the average number of requests in that pool is 20. If you have 16 workers, the extra 4 are waiting, or your belief about W or λ is wrong. The law does not tell you the distribution. It checks that your averages are possible.\n\nAn unbounded queue stores trouble until memory dies or clients time out and retry, which adds arrivals. A bounded queue fails new work while the system is still fast enough to finish the work it accepted. That failure is information. The unbounded queue\'s latency is a slower way to fail.',
      question:
        'A pool of 20 workers handles 50 requests per second. The average end-to-end time in the pool, including waiting for a worker, is 500 ms. Use Little\'s law to say whether this is consistent, and explain what happens to latency if arrivals rise so utilization of the workers goes from 70 percent to 95 percent without adding workers.',
      hints: [
        'L = 50 per second times 0.5 seconds. Compare L with 20 workers.',
        'Near 100 percent utilization, wait grows faster than utilization. You do not get 95/70 times the latency and then stop.',
      ],
      expectedOutline: [
        'L is 25 requests in the system on average. Only 20 can be in service, so some are waiting, or the measured averages are inconsistent.',
        'The pool is already at or past a comfortable concurrency.',
        'Moving from 70 to 95 percent utilization lengthens the queue sharply. Latency rises by more than the utilization ratio.',
        'A bound on the queue, or more workers, or less work per request, is the response. More arrivals without slack is not.',
      ],
      referenceSolution:
        'Little\'s law says the average number in the pool is 50 times 0.5, which is 25. There are only 20 workers, so on average about 5 requests are waiting, and the workers are fully occupied if the service time fills them. The picture is internally possible: 20 in service and a short queue. It is not comfortable. If someone claimed the average time was 100 ms at this arrival rate, L would be 5, and 20 workers would be mostly idle. The law is the consistency check.\n\nAt 70 percent utilization there is slack for bursts, so the queue is usually empty and latency is close to service time. At 95 percent the slack is almost gone. The same burst waits much longer. Latency does not rise by 95/70. It rises along a curve that gets steep near saturation. In practice you will see p99 move first. Clients then time out and retry, arrival rate goes up, and the queue gets worse.\n\nAdd workers or cut service time before you get to that knee, and bound the queue so the 21st waiting request fails fast instead of sitting until the process runs out of memory.',
      rubric: [
        { id: 'littles', description: 'Little\'s law is applied with matching units and compared with the worker count.', conceptId: 'concept.queueing' },
        { id: 'knee', description: 'Latency near saturation grows sharply, and retries can feed the queue.', conceptId: 'concept.queueing' },
      ],
      misconceptions: [
        { id: 'linear', statement: 'Doubling utilization doubles latency.', correction: 'Wait is not linear in utilization. It stays small until the server is busy, then grows quickly.' },
      ],
      engineeringContext:
        'Thread pools, database connection pools, and consumer groups are this lecture with different names. "Pool exhausted" means the queue or the wait for a worker hit a limit. Raising the pool without raising the real resource, such as database cores, moves the queue downstream.',
      extensionQuestions: [
        'If you double the workers and the database was the real bottleneck, where does the queue move?',
      ],
      acceptableAlternatives: [
        'A sketch of the M/M/1 wait formula is optional. The qualitative knee plus a correct Little\'s law application is enough.',
      ],
      tradeoffs: [
        'A short queue bound protects latency and rejects work during spikes. A long queue absorbs spikes and delivers that work late, sometimes after the client has already retried.',
      ],
      commonMistakes: [
        'Mixing per-second rates with per-minute waits and getting a number that feels precise and is 60 times wrong.',
      ],
      followUps: [
        'What metric is L in your current service, and do you graph it?',
      ],
    },
    evening: {
      title: 'Size a worker pool',
      conceptIds: ['concept.queueing'],
      objectives: [
        'Choose a pool size and a queue bound from a target latency, not from a round number.',
      ],
      durationMinutes: 16,
      difficulty: 'foundational',
      whyItMatters:
        'The evening decision is one you will make for real: how many workers, how long the line is allowed to get, and what the client hears when the line is full.',
      explanation:
        'Service time is the time a worker spends on a request, not including the wait to become the worker. If service time is 100 ms and you want time-in-system under 200 ms, queue time can be at most 100 ms. Little\'s law on the queue, not the whole system, tells you how many can be waiting. If you cannot keep that wait, the arrival rate is too high for the pool and the answer is fewer admissions, not a larger hidden queue.',
      question:
        'Service time is 100 ms. The arrival rate you must absorb is 100 requests per second. You want typical time in the system near 150 ms, so queue time stays near 50 ms. How many workers do you need at a minimum, what queue bound would you set, and what should a client receive when the bound is hit?',
      hints: [
        'Workers needed, ignoring slack, are arrival rate times service time: 100 * 0.1 = 10 busy workers.',
        'If queue time is 50 ms, the average queue length is 100 * 0.05 = 5. A bound near that is already tight. You also need slack above the minimum or the 50 ms will not hold.',
      ],
      expectedOutline: [
        'Minimum in service is 10 workers. Practical size is higher so utilization stays off the knee.',
        'Average queue length at the target is about 5. The bound should be small and explicit.',
        'When the bound is hit, reject or shed load with a clear status. Do not block the client for seconds.',
        'Retries from the client must back off or the shed load comes straight back.',
      ],
      referenceSolution:
        'Ten workers is the minimum to keep up, because 100 requests per second times 0.1 seconds is 10 requests in service. At exactly 10 workers, utilization is 1 and the 50 ms queue target will not hold as soon as arrivals clump. I would run enough workers to sit nearer 60 to 70 percent at this peak, on the order of 15, and confirm the downstream database can absorb the extra concurrency. If the database cannot, adding workers only lengthens a queue in front of the database.\n\nAverage queue length at 50 ms is 100 times 0.05, which is 5. I would bound the waiting queue in that neighborhood, not at 10,000. When the bound is hit, return 503 or another explicit "try later" quickly, and include a backoff signal if the protocol allows it. The request fails while the 15 workers keep their latency. An unbounded queue would accept the request and answer it after the client has timed out, which helps nobody and invites a retry.\n\nThe client that receives 503 should back off. An immediate retry is a second arrival, and Little\'s law will account for it whether the product wanted it or not.',
      rubric: [
        { id: 'workers', description: 'The minimum pool is rate times service time, with slack above that minimum.', conceptId: 'concept.queueing' },
        { id: 'bound', description: 'The queue bound is derived from the latency target, and overflow fails fast.', conceptId: 'concept.queueing' },
      ],
      misconceptions: [
        { id: 'bigger-queue', statement: 'A larger queue increases throughput.', correction: 'Throughput is capped by the workers and whatever they wait on. A larger queue increases how much latency you are willing to store.' },
      ],
      engineeringContext:
        'Connection pools are worker pools in front of a database. Sizing the pool larger than the database can serve creates a queue of queries that all time out together. The 503 at the edge is kinder than a thousand queries waiting on one lock.',
      extensionQuestions: [
        'How would you change the numbers for a short spike that is twice the arrival rate for ten seconds?',
      ],
      acceptableAlternatives: [
        'Shedding load earlier, at a proxy, is valid if the pool bound and the client-visible failure are still defined.',
      ],
      tradeoffs: [
        'More workers hide a slow downstream until that downstream collapses. Fewer workers fail early and leave the downstream with slack.',
      ],
      commonMistakes: [
        'Sizing the pool to the number of CPU cores when the work is mostly waiting on the database. Waiting work needs concurrency, and it needs a database that can take it.',
      ],
      followUps: [
        'What graph would show the queue crossing the bound before users complain?',
      ],
    },
  }),
  buildFullDay({
    day: 14,
    phaseId: 'foundations',
    title: 'A request through one machine',
    morning: {
      title: 'Follow one request',
      conceptIds: ['concept.process', 'concept.thread', 'concept.memory', 'concept.cpu', 'concept.network', 'concept.http', 'concept.latency'],
      objectives: [
        'Narrate a single request from name lookup to response using the foundations together.',
        'Point at the hop that owns each class of failure.',
      ],
      durationMinutes: 18,
      difficulty: 'foundational',
      resourceIds: ['resource.rfc9110', 'resource.rfc8446'],
      extraPrerequisiteSessionIds: ['day.001.morning', 'day.006.morning', 'day.007.morning', 'day.008.morning', 'day.009.morning', 'day.010.morning'],
      whyItMatters:
        'The separate mechanisms are one path when a user clicks. Senior debugging is the ability to walk that path and stop at the hop that matches the symptom.',
      explanation:
        'A client resolves a name and may cache the address. It opens a TCP connection to that address and port, or reuses one. It runs a TLS handshake if the scheme says so, and checks the certificate. It writes an HTTP request onto the byte stream. The server\'s kernel queues the connection. A process accepts it. A thread or event loop reads the bytes, parses HTTP, and runs the handler. The handler uses CPU, allocates memory, and often waits on a database socket, which is another connection with the same kind of life. The response bytes go back through TLS and TCP. The client\'s timer is running for the whole round trip, not for the handler alone.\n\nEach failure you studied has a place on this path. A stale DNS answer never reaches the new process. A refused connection never leaves the kernel\'s "nothing is listening". A lost packet stalls the stream. An expired certificate dies in the handshake. A SIGKILL drops the thread and the request with the process. A race loses an update after the request has "succeeded". A full worker queue adds latency before the handler runs. A retry at the wrong hop duplicates the side effect.\n\nThe path is also a budget. Time spent in DNS, handshake, queue, handler, and database has to sum to something a user will wait for. Throughput is how many such paths you can finish per second before one of those hops queues.',
      question:
        'A user reports that checkout sometimes spins for several seconds and then shows an error, and sometimes creates two orders. Walk the request path and name the most plausible hop for the slow error and the most plausible hop for the duplicate. Do not propose a new architecture. Locate the faults.',
      hints: [
        'A multi-second spin is a timeout or a queue, not a CPU instruction that takes seconds by itself.',
        'Two orders means two creates committed. A retry or a double submit crossed a handler that was not idempotent.',
      ],
      expectedOutline: [
        'Walk name, connection, TLS, accept, queue, handler, dependency, response.',
        'The slow error fits queueing, a downstream wait, or a client deadline that fires while TCP or the server is still working.',
        'The duplicate fits a retry of a non-idempotent create after a timeout or a 502, possibly by the client or a gateway.',
        'These can be one incident: the timeout causes the retry.',
      ],
      referenceSolution:
        'The request is resolved, connected, and, if it gets that far, accepted by the checkout process. The several-second spin is time in a queue or a dependency, or a client waiting on a deadline. The plausible hops are the worker queue in front of the handler, the database or payment call the handler waits on, and TCP retransmission on a lossy path. The error is the client or gateway giving up. The handler may still be running. I would look at queue time and downstream time before blaming the UI.\n\nThe duplicate order is a second create that committed. The plausible hop is a retry of POST, by the client or a gateway, after the first attempt timed out or lost its response. The handler treated the second request as new. DNS, TLS, and the kernel did not create the second order. They may have caused the slowness that provoked the retry.\n\nThe two symptoms fit together. A slow hop trips a timeout, the timeout is misread as "it did not happen", and a retry inserts another row. The fix is on that create: an idempotency key, and a deadline that is honest about the slow hop. That is a localization, not a new platform.',
      rubric: [
        { id: 'path', description: 'The answer walks the real path and assigns each symptom to a hop.', conceptId: 'concept.http' },
        { id: 'link', description: 'The slow timeout and the duplicate are connected through a retry of a create.', conceptId: 'concept.latency' },
      ],
      misconceptions: [
        { id: 'ui-bug', statement: 'A double order is a double click in the browser and nothing on the server.', correction: 'A double click is one cause of two requests. A timeout retry is another. The server still needs a contract that makes the second create harmless.' },
      ],
      engineeringContext:
        'Incident reviews that start with "the network was slow" and end with duplicate orders skipped the hop in the middle: the retry policy. Walking the path is how you keep the review on a mechanism.',
      extensionQuestions: [
        'Which log line, on which machine, would prove the second create was a retry rather than a second user action?',
      ],
      acceptableAlternatives: [
        'A full worker queue as the slow hop, with the same retry conclusion, is a complete answer.',
      ],
      tradeoffs: [
        'Waiting longer before retrying reduces duplicates and makes the spinner worse. Failing fast without retry avoids duplicates and loses sales the first attempt would have completed.',
      ],
      commonMistakes: [
        'Proposing a microservice split before saying which hop is slow.',
      ],
      followUps: [
        'What single metric would catch this class of incident the next morning?',
      ],
    },
    evening: {
      title: 'An incident across the foundations',
      conceptIds: ['concept.process', 'concept.queueing', 'concept.dns', 'concept.tls', 'concept.http'],
      objectives: [
        'Reject fixes that do not match the evidence, using the foundations as a filter.',
      ],
      durationMinutes: 18,
      difficulty: 'foundational',
      resourceIds: ['resource.sre-book'],
      whyItMatters:
        'Judgment starts as refusing the tempting fix. Scale, restart, and "add a cache" are sometimes right and often a way to avoid the hop you have not identified.',
      explanation:
        'You have a small set of evidence types. Errors that are immediate and named, such as certificate invalid or connection refused, are not capacity problems. Errors that grow with utilization are queues. Errors that follow a deploy and affect only some clients may be DNS caches or a partial fleet. Duplicate side effects are retries. Memory graphs that end in a silent death are the OOM killer. A fix that does not change the hop you identified is activity, not response.',
      question:
        'During a deploy, some clients fail immediately with certificate errors, some hit the old version for an hour, and the new process is restarted every few seconds by its supervisor. A teammate wants to double the instance count. Which evidence would that change, and what three checks do you run instead?',
      hints: [
        'A certificate error fails before your new capacity can run the handler.',
        'Old-version traffic an hour later is a cache of an address or a connection, not a shortage of instances.',
        'A crash loop means the new process is not staying up to serve the extra instances.',
      ],
      expectedOutline: [
        'More instances do not fix an expired or mismatched certificate, a stale DNS answer, or a process that exits immediately.',
        'Check the certificate the new process or proxy actually presents.',
        'Check why the supervisor is restarting: exit code and logs.',
        'Check which address and version the lingering clients are using before deleting the old target.',
      ],
      referenceSolution:
        'Doubling the fleet adds processes that will present the same certificate, run the same crashing build, and will not update any client that still has the old address. None of the three symptoms is a utilization curve. Capacity is the wrong knob.\n\nFirst I would read the exit code and the new process\'s logs to see why the supervisor is in a loop. A boot failure, a port conflict, or a config error means there is no healthy new version to send people to, however many instances I start.\n\nSecond I would inspect the certificate served by whatever terminates TLS for the clients who see the error: dates, name, and chain, from a client that matches those users. A bad bundle rolled out with the deploy explains an immediate correlated certificate error. Scaling does not rotate a certificate.\n\nThird I would see where the clients still on the old version got their address. If DNS still has the old record cached, the old target has to stay healthy until that traffic drains. Killing it, or assuming the new fleet should already have 100 percent, strands those clients.\n\nAfter those three, a capacity change might be relevant. It is not the response to this evidence.',
      rubric: [
        { id: 'reject', description: 'Scaling is rejected because it does not touch the certificate, the crash loop, or the stale address.', conceptId: 'concept.process' },
        { id: 'checks', description: 'The three checks match the three symptoms: exit reason, served certificate, and cached address.', conceptId: 'concept.dns' },
      ],
      misconceptions: [
        { id: 'scale-fixes-deploys', statement: 'A bad deploy is a capacity problem if traffic is high.', correction: 'Traffic makes a real bottleneck worse. It does not explain a certificate rejection or a process that cannot stay up.' },
      ],
      engineeringContext:
        'This is the filter you will reuse in later phases. Rate limits, caches, and queues are the right tools when the evidence is load. They are noise when the evidence is identity, configuration, or a process that never becomes ready.',
      extensionQuestions: [
        'What evidence would make doubling the fleet the right next move?',
      ],
      acceptableAlternatives: [
        'A rollback of the new build is reasonable after the exit logs confirm the new build is what is crashing. It still is not a scale-out.',
      ],
      tradeoffs: [
        'Leaving the old target up during a bad deploy protects cached clients and prolongs a split world. Turning it off makes the failure complete and easier to see.',
      ],
      commonMistakes: [
        'Rolling forward to more instances of a build that is already crash-looping.',
      ],
      followUps: [
        'What would you write down as the rollback trigger before the next deploy?',
      ],
    },
  }),
];
