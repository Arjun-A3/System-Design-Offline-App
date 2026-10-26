import type { Concept, Difficulty, PhaseId } from './types';

type Topic = {
  slug: string;
  title: string;
  morning: string;
  evening: string;
};

type PhasePlan = {
  phaseId: PhaseId;
  difficulty: Difficulty;
  topics: Topic[];
};

const plans: PhasePlan[] = [
  {
    phaseId: 'web',
    difficulty: 'intermediate',
    topics: [
      ['request-lifecycle', 'Request lifecycle', 'Trace one request from the socket accept to the handler and back.', 'Name which failure on that path a client can see, and which it cannot.'],
      ['name-to-connection', 'From name to connection', 'Order DNS, TCP, and TLS for one new connection.', 'Explain a client that fails while the process is healthy.'],
      ['reverse-proxy', 'Reverse proxies', 'Say what a reverse proxy terminates, retries, and hides.', 'Decide which header the application must not trust from the proxy.'],
      ['load-balancing', 'Load balancing', 'Compare least-connections, round-robin, and consistent hashing for one workload.', 'Show a balancer decision that creates a hotspot.'],
      ['health-checks', 'Health checks', 'Separate liveness from readiness.', 'Design a check that stays red when the dependency the handler needs is down.'],
      ['connection-draining', 'Connection draining', 'Describe a deploy that finishes in-flight requests.', 'Explain the client-visible failure when drain is shorter than the slowest request.'],
      ['api-gateway', 'API gateways', 'List what belongs in a gateway and what becomes a hidden dependency if you put it there.', 'Find a piece of business policy that should not live only in the gateway.'],
      ['service-boundaries', 'Service boundaries', 'Define a boundary by data ownership and failure, not by a folder.', 'Identify two operations that must not be split across a synchronous call.'],
      ['sessions', 'Sessions', 'Compare server-side sessions and signed cookies.', 'Explain what a restart or a second data center does to each choice.'],
      ['authn-authz', 'Authentication and authorization', 'Separate proving who is calling from deciding what they may do.', 'Find a check that is missing on a write path even though login works.'],
      ['token-storage', 'Where tokens live', 'Describe where a browser, a phone, and a service should keep a credential.', 'Explain a theft scenario for the storage choice you would reject.'],
      ['rate-limiting', 'Rate limiting', 'Choose a key, a limit, and a response for an abusive client.', 'Show how a limiter in front of one replica fails open or closed when it is wrong.'],
      ['edge-retries', 'Retries at the edge', 'State which status codes and which methods a gateway may retry.', 'Show a retry that duplicates a charge or an email.'],
      ['deadlines', 'Timeouts and deadlines', 'Set a deadline that shrinks as the call moves inward.', 'Explain a handler that keeps working after the caller has given up.'],
      ['idempotency-keys', 'Idempotency keys', 'Design the storage and the response for a repeated POST.', 'Decide what to return when the first attempt is still in progress.'],
      ['edge-synthesis', 'An API edge', 'Walk a public POST through the proxy, auth, limit, and handler.', 'Name the one change that stops a duplicate without adding a service.'],
    ].map(topic),
  },
  {
    phaseId: 'data',
    difficulty: 'intermediate',
    topics: [
      ['relational-modeling', 'Relational modeling', 'Model a workflow as tables, keys, and constraints.', 'Find a constraint the application is enforcing that the database should enforce.'],
      ['normalization', 'Normalization and denormalization', 'Say what a normal form protects you from.', 'Choose a deliberate denormalization and name the write anomaly it creates.'],
      ['identifiers', 'Identifiers', 'Choose a primary key and say who generates it.', 'Explain a collision or a leak that the tempting id scheme causes.'],
      ['indexes', 'Indexes', 'Match an index to a query rather than to a table.', 'Show a write path that gets slower because of an index you added for a rare read.'],
      ['query-plans', 'Query plans', 'Read a plan as access method, rows, and the dangerous guess.', 'Decide what evidence would justify an index before you add one.'],
      ['transactions', 'Transactions', 'Define the unit of work that must commit or not commit together.', 'Find two writes in a handler that are accidentally not in one transaction.'],
      ['isolation', 'Isolation', 'Explain a phenomenon your chosen isolation level still allows.', 'Pick an isolation level for a balance update and say what it costs.'],
      ['locks', 'Locks and deadlocks', 'Describe how two transactions wait on each other.', 'Choose a lock order that removes one deadlock without serializing the whole service.'],
      ['replication', 'Replication', 'Separate a primary from a replica and say what is synchronous.', 'Explain a committed write the replica has not applied yet.'],
      ['replication-lag', 'Replication lag', 'Name a read-your-writes bug caused by lag.', 'Choose where a read must go to the primary, and where a replica is acceptable.'],
      ['sharding', 'Sharding', 'Choose a shard key for a known access pattern.', 'Show a query the shard key makes expensive.'],
      ['hot-partitions', 'Hot partitions', 'Explain a key that receives a disproportionate share of writes.', 'Propose a split or a queue that cools the key without pretending the skew vanished.'],
      ['postgresql-ops', 'PostgreSQL in operation', 'Connect WAL, checkpoints, and a restart to durability.', 'Say what you would check first if writes stall and reads continue.'],
      ['document-modeling', 'Document modeling', 'Model an aggregate that is read together.', 'Show a document shape that makes one common update rewrite too much.'],
      ['redis-durability', 'Redis data and durability', 'Match a Redis structure and a persistence setting to a job.', 'Explain what a crash loses under the setting you chose.'],
      ['backups', 'Backups', 'Define what a backup contains and how old it may be.', 'Explain why a backup you have never restored is not a backup.'],
      ['restore-drills', 'Restore drills', 'Walk the steps from backup to a serving database.', 'Name the step that usually fails: credentials, version, or an unrehearsed config change.'],
      ['data-model-choice', 'Choosing a data model', 'Pick one store for a workload and reject two others with reasons.', 'State the first requirement that would make you revisit the choice.'],
    ].map(topic),
  },
  {
    phaseId: 'caching',
    difficulty: 'intermediate',
    topics: [
      ['why-cache', 'Why a cache exists', 'Name the latency or load a cache is supposed to remove.', 'Identify a cache that saves nothing because the origin was not the bottleneck.'],
      ['cache-aside', 'Cache-aside', 'Write the read path: lookup, miss, origin, fill.', 'Show a stale read after a write that updated the origin only.'],
      ['cache-writes', 'Write-through and write-behind', 'Compare the failure of a write that must hit the cache and one that may lag.', 'Choose one for a counter users will notice if it is wrong.'],
      ['cache-ttl', 'TTLs', 'Explain what a TTL bounds and what it does not.', 'Set a TTL for a price and say who is wrong during that window.'],
      ['invalidation', 'Invalidation', 'Name the event that must delete or replace a cached value.', 'Show a race where the invalidation arrives before the new value is written.'],
      ['stampedes', 'Cache stampedes', 'Explain a miss storm when a hot key expires.', 'Choose a lock, early refresh, or request coalescing and state its failure.'],
      ['negative-caching', 'Negative caching', 'Decide how long to remember that a key does not exist.', 'Show a user who cannot see a resource they just created because of a negative entry.'],
      ['cdns', 'CDNs', 'Separate what a CDN can cache from what must stay dynamic.', 'Explain a purge that does not reach every edge before users do.'],
      ['pagination', 'Pagination', 'Compare offset pages and cursor pages under inserts.', 'Show a user who skips or repeats an item, and which scheme caused it.'],
      ['n-plus-one', 'N+1 queries', 'Find a loop of queries hiding inside one request.', 'Replace it with a bound number of queries and say what that bound costs.'],
      ['latency-budget', 'A latency budget', 'Split a user-visible budget across cache, origin, and network.', 'Decide which hop you cut when the sum no longer fits.'],
      ['cache-failure', 'When the cache is the outage', 'Choose fail-open or fail-closed for a down cache.', 'Estimate the origin load if every request misses at once.'],
    ].map(topic),
  },
  {
    phaseId: 'distributed',
    difficulty: 'advanced',
    topics: [
      ['partial-failure', 'Partial failure', 'Give an example where some of a response succeeded and the caller cannot tell.', 'Design the caller\'s next move without assuming the whole call failed or succeeded.'],
      ['failure-detection', 'Failure detection', 'Explain why a timeout is a guess about a process you cannot see.', 'Choose a timeout and say what false suspicion costs.'],
      ['cap', 'CAP, carefully', 'State what the theorem says during a partition, and what it does not say on a quiet day.', 'Reject a design slogan that uses CAP as a substitute for a consistency choice.'],
      ['consistency-models', 'Consistency models', 'Order read-your-writes, monotonic reads, and eventual visibility in plain language.', 'Pick one for a profile photo and one for an account balance.'],
      ['linearizability', 'Linearizability and serializability', 'Separate a single-object order from a multi-statement transaction order.', 'Give a bug that one prevents and the other does not.'],
      ['quorums', 'Quorums', 'Compute a read and write quorum that intersect.', 'Show a stale read when the quorums do not intersect, or when a writer is not in the latest quorum.'],
      ['leader-election', 'Leader election', 'Explain what a lease lets a leader do, and when the lease lies.', 'Describe two nodes that both think they are leader.'],
      ['raft-operators', 'Raft for operators', 'Describe leader election and a committed log entry without implementing Raft.', 'Say what an operator should not do to a quorum that is already impaired.'],
      ['split-brain', 'Split brain', 'Explain how a partition plus a stale leader accepts a write it should not.', 'Name the mechanism, fencing or a term, that makes the stale write unacceptable.'],
      ['idempotent-writes', 'Idempotent distributed writes', 'Make a retried write across two services converge.', 'Show the window where a retry still duplicates work.'],
      ['distributed-locks', 'Distributed locks', 'Say what a lock service can guarantee, and what a paused holder breaks.', 'Prefer a design that does not need the lock, or fence the one that does.'],
      ['fencing-tokens', 'Fencing tokens', 'Attach a monotonic token to a lock holder\'s writes.', 'Show a storage system that rejects a write from a paused former holder.'],
      ['backpressure', 'Backpressure', 'Push overload back to the caller who can slow down.', 'Explain a queue that hides overload until it is full and then fails everyone.'],
      ['circuit-breakers', 'Circuit breakers', 'Define open, half-open, and closed in terms of error rate and a probe.', 'Show a breaker that opens too eagerly and becomes the outage.'],
      ['bulkheads', 'Bulkheads', 'Isolate a dependency so its slowness cannot consume every thread.', 'Name the pool or limit you would split, and what the rejected work sees.'],
      ['retry-amplification', 'Retry amplification', 'Trace one user retry through three layers that each retry.', 'Put a budget on the chain so one request cannot become dozens.'],
      ['delivery-illusions', 'Exactly-once illusions', 'Separate exactly-once processing from exactly-once effects.', 'Choose the duplicate you can tolerate and the one you must deduplicate.'],
      ['partial-failure-design', 'Designing for partial failure', 'Review a small design and list the calls that can succeed alone.', 'Add one explicit uncertainty handling, not a new product.'],
    ].map(topic),
  },
  {
    phaseId: 'messaging',
    difficulty: 'advanced',
    topics: [
      ['why-queues', 'Why a queue', 'Name the spike or the slow consumer a queue absorbs.', 'Show a queue that only delays the same overload.'],
      ['delivery-guarantees', 'Delivery guarantees', 'Define at-most-once, at-least-once, and what people mean by effectively-once.', 'Pick one for sending an email and one for a metric increment.'],
      ['consumer-groups', 'Consumer groups', 'Explain how partitions are assigned and what a rebalance interrupts.', 'Show an ordering promise that a rebalance breaks.'],
      ['message-ordering', 'Ordering', 'Say within which key order holds, and where it does not.', 'Design a consumer that stays correct when two keys arrive out of order.'],
      ['kafka-log', 'The log', 'Describe a partition as an append-only log with offsets.', 'Explain a consumer that rewinds and a producer that is not idempotent.'],
      ['offsets-replay', 'Offsets and replay', 'Decide who stores the offset and when it advances.', 'Show a crash that either skips a message or processes it twice.'],
      ['worker-retry', 'Retries and backoff', 'Separate a transient failure from a permanent one.', 'Place the retry delay where it does not block the partition.'],
      ['dead-letter', 'Dead-letter queues', 'Define when a message is poison and where it goes.', 'Say who looks at the dead letter, and what replaying it assumes has changed.'],
      ['outbox', 'The outbox', 'Write the database row and the outgoing event in one commit.', 'Explain the duplicate publish the outbox still allows, and how a consumer dedupes it.'],
      ['inbox-dedupe', 'Inbox deduplication', 'Record a processed message id before the side effect, or in the same transaction.', 'Find the crash window your chosen order still has.'],
      ['event-driven', 'Events and commands', 'Separate a fact that happened from a request to do work.', 'Show a coupling that appears when every service reacts to a vague event.'],
      ['sagas', 'Sagas', 'Break a multi-service operation into steps with compensations.', 'Give a compensation that cannot really undo the step, and what you do instead.'],
      ['orchestration', 'Orchestration and choreography', 'Choose a coordinator or a chain of events for one workflow.', 'Name the operational question each style makes harder.'],
      ['poison-messages', 'Poison messages', 'Explain a message that crashes every consumer that reads it.', 'Design the skip or park behavior so one message cannot stall the partition forever.'],
      ['consumer-lag', 'Consumer lag', 'Read lag as time behind, not only as a count of messages.', 'Decide when lag is healthy slack and when it is an incident.'],
      ['notification-pipeline', 'A notification pipeline', 'Sketch produce, store, fan-out, and send for one notification.', 'Place the dedupe so a retry does not page a user twice.'],
    ].map(topic),
  },
  {
    phaseId: 'scalability',
    difficulty: 'advanced',
    topics: [
      ['estimation-method', 'How to estimate', 'Write the inputs, the arithmetic, and the uncertainty of a capacity estimate.', 'Mark which number you measured and which you invented.'],
      ['qps-bytes', 'QPS and payload size', 'Turn requests per second and payload size into bandwidth and storage per day.', 'Show the term that dominates, and the one people usually forget.'],
      ['vertical-horizontal', 'Vertical and horizontal scaling', 'Say what a bigger machine buys, and what a second machine requires of the software.', 'Name a bottleneck that horizontal scaling does not move.'],
      ['stateless-services', 'Stateless services', 'Define the state that must leave the process before you can add instances.', 'Find a sticky assumption, a local file or an in-memory session, that blocks that move.'],
      ['scale-balancing', 'Balancing at scale', 'Explain a balancer that is itself the bottleneck or the single point of failure.', 'Choose a health and drain behavior that survives a rolling restart.'],
      ['autoscaling-lag', 'Autoscaling lag', 'Describe the delay between load, metric, and a ready instance.', 'Show a spike that is over before the new instances serve.'],
      ['storage-growth', 'Storage growth', 'Project data growth from writes, retention, and replication.', 'Name the deletion or tiering rule that keeps the projection honest.'],
      ['scale-hotspots', 'Hotspots', 'Find a key, row, or lock that does not scale with the rest of the system.', 'Propose a split that cools it, and the new failure that split adds.'],
      ['fan-out', 'Fan-out', 'Count the work one user action creates for followers, files, or indexes.', 'Choose fan-out on write or fan-out on read and state who waits.'],
      ['read-amplification', 'Read amplification', 'Explain a user read that becomes many internal reads.', 'Put a cap on the amplification and say what the user sees at the cap.'],
      ['bottleneck-hunt', 'Finding the bottleneck', 'Use utilization, queue time, and errors to pick one saturated resource.', 'Reject a scale-out that adds capacity on the idle side of the bottleneck.'],
      ['feed-estimate', 'Estimate a feed', 'Estimate read and write rates for a small social feed.', 'Say which number, if 10× wrong, changes the design.'],
      ['scale-cost', 'Cost as a constraint', 'Put a monthly cost next to a scaling choice.', 'Choose the cheaper design that still meets the latency you wrote down.'],
      ['scaling-review', 'A scaling review', 'Review a design for its first bottleneck and its first hotspot.', 'Name the measurement that would tell you the review was wrong.'],
    ].map(topic),
  },
  {
    phaseId: 'reliability',
    difficulty: 'advanced',
    topics: [
      ['sli-slo', 'SLI, SLO, and SLA', 'Write one SLI a user could recognize and an SLO with a window.', 'Separate that SLO from a contract that pays someone if you miss it.'],
      ['error-budgets', 'Error budgets', 'Turn an SLO into the unreliability you can spend.', 'Decide what you stop shipping when the budget is gone.'],
      ['useful-metrics', 'Metrics that matter', 'Choose a few metrics that would page you, and say why the rest would not.', 'Identify a vanity metric that can improve while users suffer.'],
      ['logs', 'Logs', 'Define a log line that is useful during an incident and cheap enough to keep.', 'Say what you will not log because it is a secret or unbounded.'],
      ['traces', 'Traces', 'Explain what a trace adds that metrics and logs do not.', 'Describe a missing span that would hide the slow hop.'],
      ['prometheus-model', 'The Prometheus model', 'Explain scrape, counters, and a rate.', 'Show a question a counter answers and a question it cannot.'],
      ['dashboards', 'Dashboards', 'Build a one-screen view for one service: symptom, saturation, errors.', 'Remove a panel that does not change a decision.'],
      ['symptom-alerting', 'Alerting on symptoms', 'Write a page that fires on user pain, with a runbook link.', 'Rewrite a cause-based alert that pages when nobody can act.'],
      ['incident-response', 'Incident response', 'Order the first minutes: stop harm, communicate, then explain.', 'Name the action that restores users before the root cause is known.'],
      ['incident-roles', 'Roles and severity', 'Assign incident command, communications, and operations.', 'Set a severity from user impact, not from how interesting the bug is.'],
      ['rpo-rto', 'RPO and RTO', 'Define how much data you can lose and how long you can be down.', 'Show a backup frequency that misses the RPO you just wrote.'],
      ['disaster-recovery', 'Disaster recovery', 'Choose backup-and-restore or a warm standby for one system.', 'State the step in the failover you have not rehearsed.'],
      ['safe-deploy', 'Safe deployment', 'Describe a rollout that can stop and go back.', 'Explain a migration that a code rollback does not undo.'],
      ['canaries', 'Canaries and rollbacks', 'Define the metric and the time that promote or halt a canary.', 'Show a canary that is too small to see the failure, or too large to contain it.'],
      ['migration-flags', 'Flags and data migrations', 'Separate expanding a schema, moving readers, and deleting the old path.', 'Find the dual-write window and what happens if one write fails.'],
      ['operate-service', 'Operating the service', 'Write the minimum an on-call engineer needs: SLO, dashboard, deploy, rollback.', 'Name the one gap that would make the next incident longer.'],
    ].map(topic),
  },
  {
    phaseId: 'security',
    difficulty: 'advanced',
    topics: [
      ['threat-modeling', 'Threat modeling', 'List assets, actors, and one abuse for a small feature.', 'Rank the abuse by impact rather than by how clever it is.'],
      ['trust-boundaries', 'Trust boundaries', 'Draw the boundary where data becomes untrusted.', 'Find a field the server accepts because the UI already checked it.'],
      ['oauth-systems', 'OAuth as a system', 'Name the roles and what each one is allowed to see.', 'Explain a token stored where a stolen device becomes a stolen account.'],
      ['secrets', 'Secrets management', 'Say where a secret lives, who can read it, and how it rotates.', 'Show a secret that is in the image, the repo, or the logs.'],
      ['least-privilege', 'Least privilege', 'Reduce a service account to the calls it actually makes.', 'Explain the incident that a broad role turns from a bug into a breach.'],
      ['injection', 'Injection', 'Explain command, SQL, and template injection as confusing data with code.', 'Point at the API that keeps them separate.'],
      ['ssrf', 'SSRF', 'Describe a server that fetches a URL an attacker chose.', 'Restrict the fetch so it cannot reach metadata or internal services.'],
      ['abuse-limits', 'Rate limits as defense', 'Place a limit that makes credential stuffing and scraping expensive.', 'Explain why the limiter must be outside the expensive work.'],
      ['audit-logs', 'Audit logs', 'Define an audit event: who, what, when, and which object.', 'Say what you will not put in the audit log, and how long you keep it.'],
      ['supply-chain', 'Supply chain', 'Trace a dependency from a lockfile to a running process.', 'Name the check that would have stopped a malicious update.'],
      ['data-minimization', 'Data minimization', 'List the personal data a feature stores and the data it does not need.', 'Shorten a retention period and say which debug habit that breaks.'],
      ['containment', 'Incident containment', 'Order the steps that stop ongoing access before the narrative is finished.', 'Choose revoke, rotate, or isolate for a leaked token.'],
      ['api-security-review', 'Review an API', 'Review one endpoint for auth, object access, and injection.', 'Write the failing test that would prove the hole.'],
      ['login-flow', 'A login flow', 'Walk password or token login including storage, lockout, and reset.', 'Find the step where an attacker learns whether an account exists, if you allow that.'],
    ].map(topic),
  },
  {
    phaseId: 'cloud',
    difficulty: 'advanced',
    topics: [
      ['containers-vms', 'Containers and virtual machines', 'Separate the kernel, the image, and the process.', 'Say which isolation you do not get from a container alone.'],
      ['image-discipline', 'Image discipline', 'Define a rebuildable image: base, lockfile, and no baked secrets.', 'Explain a production container that cannot be rebuilt from the repo.'],
      ['kubernetes-objects', 'Pods, services, deployments', 'Map a process, a stable address, and a desired replica count to Kubernetes objects.', 'Explain what a Service does not guarantee about a single request.'],
      ['resource-limits', 'Requests and limits', 'Set a memory limit from a measured working set.', 'Describe the kill or the throttle when the process exceeds it.'],
      ['serverless-limits', 'Serverless constraints', 'List cold start, timeout, and concurrency limits as design inputs.', 'Choose a workload that fits, and one that will fail the timeout.'],
      ['object-storage', 'Object storage', 'Model a file as an object plus metadata, not as a disk.', 'Explain consistency and request-rate limits you have to design for.'],
      ['cloud-networking', 'Cloud networking', 'Trace a packet across a VPC, a subnet, and a security rule.', 'Show a rule that allows the health check and blocks the dependency, or the reverse.'],
      ['iam', 'IAM', 'Write a policy that names the action and the resource.', 'Find a wildcard that makes the policy equivalent to administrator.'],
      ['infrastructure-as-code', 'Infrastructure as code', 'Treat the account\'s desired state as a reviewed change.', 'Explain drift, and how you would notice a console change.'],
      ['cicd', 'CI/CD', 'Separate build, test, and deploy permissions.', 'Show a pipeline that can deploy to production with no human and no audit, and close that gap.'],
      ['environments', 'Environments', 'Define what staging must share with production to be evidence, and what it must not share.', 'Name a class of bug staging cannot catch.'],
      ['cloud-cost', 'Cloud cost', 'Attribute a bill to a service, a storage class, or a chatty dependency.', 'Propose one change that cuts cost without moving the SLO.'],
      ['account-isolation', 'Account and project isolation', 'Separate production identities and networks from everything else.', 'Explain a blast radius that a shared account makes worse.'],
      ['small-platform', 'A small platform', 'Sketch the minimum platform a team needs: build, run, observe, roll back.', 'Say what you would not build until a second team has the same pain.'],
    ].map(topic),
  },
  {
    phaseId: 'advanced-data',
    difficulty: 'advanced',
    topics: [
      ['replication-protocols', 'Replication protocols', 'Compare statement, write-ahead log, and row-based replication.', 'Show a failure that one protocol handles and another repeats incorrectly.'],
      ['partitioning-strategies', 'Partitioning strategies', 'Choose range, hash, or directory partitioning for one dataset.', 'Explain a rebalance and who is unavailable or inconsistent during it.'],
      ['distributed-transactions', 'Distributed transactions', 'Say why a transaction across two services is a different problem from a local commit.', 'Prefer a smaller atomic unit and name the anomaly that remains.'],
      ['two-phase-commit', 'Two-phase commit', 'Walk prepare and commit, and the coordinator failure in between.', 'Explain why a participant cannot simply time out and forget.'],
      ['cdc', 'Change data capture', 'Read a database log as a stream of committed changes.', 'Show a consumer that applies a change twice, and the key that makes that safe.'],
      ['stream-processing', 'Stream processing', 'Define a job that computes a result continuously rather than in a nightly batch.', 'Explain a late or reordered event the job must still handle.'],
      ['event-time', 'Event time and processing time', 'Separate when something happened from when you learned about it.', 'Show a window that is wrong if you use processing time.'],
      ['search-indexes', 'Search indexes', 'Separate the transactional store from the index that serves queries.', 'Describe the lag between a write and the document a user can find.'],
      ['inverted-index', 'Inverted indexes', 'Explain a term pointing at documents, and why that shape serves search.', 'Name an update pattern that makes the index expensive to maintain.'],
      ['time-series', 'Time-series systems', 'Model a metric as a series with retention and downsampling.', 'Explain what a late sample and a counter reset do to a graph.'],
      ['vector-retrieval', 'Vector retrieval', 'Describe approximate nearest-neighbor search as a system, not as a model.', 'State the freshness and the false-neighbor limits you would tell a product owner.'],
      ['multi-region-writes', 'Multi-region writes', 'Explain why two regions accepting writes need a conflict story.', 'Choose a single writer region when the conflict story is not worth it.'],
      ['conflict-resolution', 'Conflict resolution', 'Compare last-write-wins with a merge the application understands.', 'Give a user-visible loss that last-write-wins causes.'],
      ['read-your-writes-regions', 'Read-your-writes across regions', 'Pin a user to a region or a token that can see their write.', 'Show a user who saves, is routed elsewhere, and sees stale data.'],
      ['rebuild-derived', 'Rebuilding derived data', 'Plan a rebuild of a cache, index, or projection from the source of truth.', 'Estimate the load the rebuild puts on the source, and how you throttle it.'],
      ['consistency-choice', 'Choosing consistency', 'Pick a consistency model for one product action and reject a stronger one.', 'Write the user-visible anomaly you accepted.'],
    ].map(topic),
  },
  {
    phaseId: 'architecture',
    difficulty: 'advanced',
    topics: [
      ['modular-monolith', 'The modular monolith', 'Define modules by ownership and allowed dependencies.', 'Find a call that crosses a module by reaching into its tables.'],
      ['service-rent', 'When a service pays rent', 'List the operational cost a new service adds.', 'Keep a component inside the process when that cost is not yet earned.'],
      ['domain-boundaries', 'Domain boundaries', 'Draw a boundary around data that changes for one reason.', 'Show a boundary drawn around a technical layer instead, and why it hurts.'],
      ['bounded-contexts', 'Bounded contexts', 'Allow two contexts to use the same word for different concepts.', 'Choose the translation at the boundary instead of a shared database table.'],
      ['cqrs', 'CQRS', 'Separate a write model from a read model when their shapes diverge.', 'Name the staleness the read model introduces and who must tolerate it.'],
      ['event-sourcing', 'Event sourcing', 'Store facts and derive state, and say why you would accept the complexity.', 'Explain a projection that is wrong and how you rebuild it.'],
      ['control-data-plane', 'Control plane and data plane', 'Separate configuration changes from the path that serves user traffic.', 'Show a control-plane failure that should not stop the data plane.'],
      ['multi-tenancy', 'Multi-tenancy', 'Choose a shared table, a shared schema, or an account per tenant.', 'Name the noisiest and the most sensitive tenant, and whether one design serves both.'],
      ['noisy-neighbor', 'Noisy neighbors', 'Show one tenant consuming a shared pool.', 'Place a limit that contains them without punishing a quiet tenant.'],
      ['strangler', 'Strangler migrations', 'Move one path at a time while the old path still serves.', 'Define the check that says a path has actually moved.'],
      ['dual-writes', 'Dual writes', 'Explain two writes that are not atomic.', 'Replace the dual write with an outbox or an ordered migration step.'],
      ['api-compatibility', 'API compatibility', 'Version or evolve a response without breaking an old client.', 'Give an example of a compatible change and a breaking one that looks small.'],
      ['platform-product', 'Platform and product teams', 'Define what a platform offers and what a product team still owns.', 'Reject a platform abstraction that hides a failure the product team must handle.'],
      ['architecture-review', 'An architecture review', 'Review a design for boundaries, data ownership, and the first bottleneck.', 'Write the question the review could not answer from the diagram.'],
    ].map(topic),
  },
  {
    phaseId: 'case-studies',
    difficulty: 'advanced',
    topics: [
      ['url-shortener', 'A URL shortener', 'Estimate reads, writes, and the key space for short links.', 'Handle a hot link and a lost redirect without creating duplicate keys.'],
      ['file-storage-case', 'File storage', 'Split metadata from bytes and choose the upload path.', 'Explain a completed upload the metadata store does not know about.'],
      ['notification-service', 'A notification service', 'Design fan-out, preferences, and at-least-once delivery.', 'Stop a retry from notifying a user twice for one event.'],
      ['chat-case', 'Chat', 'Choose the storage and the fan-out for a conversation.', 'Explain ordering and presence without claiming a global total order.'],
      ['feed-case', 'A news feed', 'Choose fan-out on write or read for a given follower distribution.', 'Show the celebrity account that breaks the choice.'],
      ['search-case', 'Search', 'Separate indexing from the query path.', 'Describe staleness and a partial outage of the index.'],
      ['video-case', 'Video streaming', 'Sketch ingest, transcoding, storage, and playback.', 'Explain startup delay and a CDN miss as different problems.'],
      ['payments-case', 'Payment processing', 'Place idempotency, ledger writes, and external authorization.', 'Handle a timeout from the card network after you may have captured funds.'],
      ['ticketing-case', 'Ticket booking', 'Prevent two people from holding the last seat.', 'Explain an expired hold and a payment that arrives after it.'],
      ['dispatch-case', 'Ride dispatch', 'Match a request to a nearby supply under changing locations.', 'Describe a driver who is assigned twice or not at all after a timeout.'],
      ['inventory-case', 'Inventory', 'Reserve stock and release it under concurrent checkouts.', 'Show an oversell and the transaction or token that would have prevented it.'],
      ['metrics-ingest', 'Metrics ingestion', 'Accept a high rate of samples and make them queryable.', 'Explain loss, late data, and a cardinality explosion.'],
      ['cloud-storage-case', 'Cloud object storage', 'Design metadata, placement, and repair for stored objects.', 'Explain a durability target in terms of failure combinations, not a slogan.'],
      ['rag-case', 'Retrieval for a RAG system', 'Separate documents, chunks, indexes, and the model call.', 'State what is stale, what can leak another tenant, and what you can evaluate offline.'],
      ['public-api-case', 'A public API', 'Set auth, limits, pagination, and compatibility for outside callers.', 'Version a breaking change without a flag day.'],
      ['compare-designs', 'Compare two designs', 'Compare two sketches of the same problem on one failure and one cost.', 'Pick one and write the assumption that would reverse the pick.'],
    ].map(topic),
  },
  {
    phaseId: 'judgment',
    difficulty: 'advanced',
    topics: [
      ['decision-records', 'Architecture decision records', 'Write a decision: context, choice, and the options rejected.', 'Include the consequence that would trigger a revisit.'],
      ['migration-planning', 'Migration planning', 'Sequence expand, migrate, and contract so each step can roll back or roll forward.', 'Find the step that is not reversible and put it last.'],
      ['technical-debt', 'Technical debt', 'Describe a shortcut as interest: what it costs per change or per incident.', 'Choose one debt to pay because it is on the critical path, and one to leave.'],
      ['reliability-tradeoffs', 'Reliability trade-offs', 'Trade a slower feature against an error budget with a number.', 'Say whose time you are spending: the user\'s, the on-call\'s, or the next team\'s.'],
      ['build-or-buy', 'Build or buy', 'Compare building a component with buying it, including operation.', 'Name the lock-in and the skill your team stops practicing.'],
      ['platform-engineering', 'Platform engineering', 'Define a platform change as a product with users inside the company.', 'Reject a mandate that adds steps without removing a failure.'],
      ['incident-leadership', 'Incident leadership', 'Lead an incident: roles, updates, and a single next action.', 'Separate restoring service from finding a complete explanation.'],
      ['cost-decisions', 'Cost decisions', 'Frame a cost cut as a reliability or latency trade with a number.', 'Refuse a cut that saves money by deleting the only copy of the data.'],
      ['technical-strategy', 'Technical strategy', 'Write a strategy as a few bets and the bets you will not make.', 'Connect one bet to a hiring or migration consequence this year.'],
      ['saying-no', 'Saying no', 'Decline a design that adds a service without a boundary or an owner.', 'Offer the smaller change that addresses the actual constraint.'],
      ['reviewing-designs', 'Reviewing someone else\'s design', 'Review for failure, data ownership, and operability before style.', 'Ask one question that the document cannot answer yet.'],
      ['capstone', 'Capstone review', 'Review a design end to end with an explicit requirement, bottleneck, and rollback.', 'State the evidence that would change your recommendation.'],
    ].map(topic),
  },
];

function topic(row: readonly string[]): Topic {
  const [slug, title, morning, evening] = row;
  if (!slug || !title || !morning || !evening) {
    throw new Error('A planned topic needs a slug, title, morning objective, and evening objective.');
  }
  return { slug, title, morning, evening };
}

export type RoadmapTopic = {
  dayNumber: number;
  slug: string;
  title: string;
  phaseId: PhaseId;
  difficulty: Difficulty;
  morningObjective: string;
  eveningObjective: string;
};

export const roadmapTopics: RoadmapTopic[] = [];
export const roadmapConcepts: Concept[] = [];

let dayNumber = 15;
for (const plan of plans) {
  for (const item of plan.topics) {
    roadmapTopics.push({
      dayNumber,
      slug: item.slug,
      title: item.title,
      phaseId: plan.phaseId,
      difficulty: plan.difficulty,
      morningObjective: item.morning,
      eveningObjective: item.evening,
    });
    roadmapConcepts.push({
      id: `concept.${item.slug}`,
      title: item.title,
      summary: item.morning,
      phaseId: plan.phaseId,
    });
    dayNumber += 1;
  }
}

if (dayNumber !== 211) {
  throw new Error(`Roadmap should cover days 15 through 210. Next free number was ${dayNumber}.`);
}
