import type { LessonPair } from './publish';

export const advancedDataLessons: Record<string, LessonPair> = {
  'replication-protocols': {
    morning: {
      title: 'Three ways to copy a write',
      why: 'A replica is only as faithful as the thing you ship. Shipping SQL, log bytes, or row images fails in different places, and the primary can look healthy while the copy drifts.',
      explain: `Statement replication ships the SQL text and runs it again on the replica. If the statement calls the clock, draws a random value, or picks "the first matching row," the replica can choose a different result than the primary already stored. Triggers on the replica fire again. The log stays small when one statement changes many rows, and it stays wrong when the statement is not a pure function of the rows it saw.

Write-ahead log replication ships the storage changes the primary already made. The replica applies those bytes. It does not re-run functions or triggers, so the copy matches the primary's pages. The cost is a replica that tracks the same engine and version, and a stream you cannot easily turn into "only these tables" for another consumer. Row-based replication ships the before and after image of each committed row. The replica writes those values, so a timestamp or an id generated on the primary is copied rather than recomputed. Bulk updates log every row. Triggers do not get a second chance to invent a different side effect.`,
      question:
        'You replicate a primary to a reporting replica and to a cache builder. Which protocol fits each consumer, and which one do you reject for the cache builder because it cannot see rows?',
      hints: [
        'The reporting replica wants the same bytes. The cache builder wants row changes for a few tables.',
        'Physical log shipping does not hand you a row image you can filter by table.',
      ],
      outline: [
        'Use write-ahead log replication for the reporting replica so pages match.',
        'Use row-based replication for the cache builder so it sees committed images.',
        'Reject statement replication where NOW() or LIMIT would diverge.',
        'Reject the physical log for the cache builder because it is not a row stream.',
      ],
      solution: `The reporting replica should follow the write-ahead log. It is a crash copy of the primary, and it never re-executes SQL, so a statement that called the clock cannot drift. The cache builder should follow row images. It needs the key and the after-image of the tables it caches, and it should ignore the rest. Statement replication is the wrong feed for both if any write is non-deterministic.

Do not point the cache builder at the physical log. That stream is page bytes, not rows, and it includes every table. Parsing it into cache invalidations couples the builder to storage internals and to the engine version. Row-based replication is the stream that can drop a table and still preserve the primary's values. The reporting copy stays physical so a reporting query sees the same pages the primary wrote.`,
      rubric: [
        'The reporting copy is physical log shipping, and the cache builder consumes row images.',
        'Statement replay is rejected for non-deterministic writes, and the physical log is rejected as a row feed.',
      ],
      myth: [
        'Replication means the replica ran the same statements, so the rows match.',
        'Running the same statement again can choose a different row or a different clock value. Matching requires copying the result, not the text.',
      ],
      context:
        'Mixed deployments get this wrong by using one binlog format for a failover replica and a downstream indexer. The indexer then sees either pages it cannot read or statements it must not replay.',
      tradeoff: 'Row images are easy to fan out and heavy when one statement touches millions of rows. Physical logs are compact and useless to a consumer that wanted a key.',
      mistake: 'Turning on triggers on the replica so the copy "does the same work" as the primary.',
      followUp: 'A statement updates one million rows. What does each protocol put on the network?',
      extension: 'Which protocol still diverges if the replica has an extra trigger the primary does not?',
      alternative: 'Shipping both the statement and the row count it affected detects some drift after the fact. It does not make statement replay deterministic.',
    },
    evening: {
      title: 'The replica claims a different row',
      why: 'A protocol can acknowledge replication and still repeat the wrong write. The dangerous case is a statement whose meaning depends on which rows are visible at execution time.',
      explain: `The primary runs a claim: update the lowest unassigned job and set its owner to 42. That statement touches job 10, because job 10 was the lowest free row in that moment. Statement replication does not ship "job 10." It ships the SQL. The replica runs the SELECT again. If it has already applied a different claim, or it has not yet applied one the primary had, the lowest free row is job 11. Owner 42 is written onto the wrong job. Later updates that name job 10 do not repair the lie.

Row images record the before and after of job 10. The replica sets owner 42 on job 10 even if a local LIMIT would have chosen job 11. A physical log copies the same page change. The failure that statement replication repeats incorrectly is the re-execution. The failure it does not prevent, and that row images also do not prevent, is a replica that is missing an earlier commit: both protocols only apply what they have received. The difference is what they do with a statement that was never a stable function.`,
      question:
        'The primary assigns worker 42 to job 10 with "update the first free job." The statement-based replica assigns worker 42 to job 11. Why, and which protocol would have copied job 10 instead?',
      hints: [
        'The replica executed the predicate again. It did not receive the primary key of the row the primary changed.',
        'A row image names job 10. A physical log names the page that holds job 10.',
      ],
      outline: [
        'The primary's claim selected job 10 only because of the rows visible then.',
        'Statement replay runs the LIMIT again and can select job 11.',
        'Row images and the write-ahead log both carry the change to job 10.',
        'The replica is wrong even though replication lag looks caught up.',
      ],
      solution: `Statement replication replayed a predicate, not a result. "First free job" is a different row once the replica's free set differs by even one committed claim. Worker 42 now owns job 11 on the replica and job 10 on the primary. A reporting query or a failover will hand out the wrong job. Caught-up replication does not save you, because the bad statement was applied, not delayed.

Row-based replication would have logged the after-image of job 10 and updated job 10. Write-ahead log replication would have copied the page that stores job 10. Either one handles this failure. Statement replication repeats it. If a trigger on the replica also inserts an audit row with its own sequence, statement replay invents an audit identity the primary never wrote. Row application writes the primary's audit image once, if that table is in the stream, and does not ask the trigger to invent another.`,
      rubric: [
        'The wrong job is explained as the replica re-running LIMIT, not as lag.',
        'Row images or the physical log are named as the protocol that updates job 10.',
      ],
      myth: [
        'If the replica is caught up, it must contain the same rows as the primary.',
        'Caught up means every shipped statement ran. A statement that picks a row can write a different row and still count as applied.',
      ],
      context:
        'Claim-style updates show up in queues implemented as tables. They are safe on one primary and unsafe the moment statement replication executes them a second time.',
      tradeoff: 'Statement logs stay small for this one-row claim and silently diverge. Row logs are larger on bulk updates and name the row.',
      mistake: 'Failing over onto the statement replica and treating job 11 as the assignment the worker already started.',
      followUp: 'The replica also has a trigger that inserts an audit row. Which protocol creates an audit id the primary never stored?',
      extension: 'How would you detect this drift if you only compared row counts?',
      alternative: 'Changing the claim to update a primary key chosen in application code makes statement replay safe for this one statement. It does not make every other statement safe.',
    },
  },
  'partitioning-strategies': {
    morning: {
      title: 'Where an order row lives',
      why: 'Partitioning is a map from a key to a place. The wrong map makes the common query touch every place, or makes one place hold the rows everyone is writing today.',
      explain: `Take the orders table. The common read is one customer's recent orders. The common write is today's orders. A range partition on the order id, or on the customer id, keeps a slice of keys together. A range on time makes "drop last year" a metadata change and makes this month's partition the only one taking writes. A hash on order id spreads writes and scatters one customer's history across every partition. A hash on customer id keeps a customer's orders together and still piles a huge customer onto one partition.

A directory is a table that maps a key, often a customer id, to a partition. It can send a huge customer to a dedicated place and leave small customers packed together. Every read and write pays an extra lookup, and the directory itself has to be consistent with the move of a key. For this dataset, hash on customer id is the wrong primary map because the ten largest customers are the hot partitions. A pure time range is the wrong map because the product read is per customer, not per month. Use a directory keyed by customer id, with the largest customers placed alone.`,
      question:
        'Orders are read by customer and written all day. Ten customers produce most of the writes. Choose range, hash, or directory partitioning, and say which query the choice makes local.',
      hints: [
        'A hash of order id spreads load and breaks the customer read into a scatter.',
        'The directory exists so one customer can move without rehashing everyone.',
      ],
      outline: [
        'Reject a hash on order id because a customer read would hit every partition.',
        'Reject a time range as the only split because the hot month is one partition.',
        'Choose a directory from customer id to partition.',
        'Place the ten large customers on their own partitions so their writes stay local.',
      ],
      solution: `Use a directory. The key in the directory is the customer id, and the value is the partition that holds that customer's orders. A customer read hits one partition. The ten noisy customers each get a partition of their own, and the long tail shares partitions. A time range can still exist inside a large customer's partition if you need to drop old months, but time is not the top-level map.

Hashing order id would make every "my orders" query a fan-out. Hashing customer id looks like the directory until a large customer outgrows a node, and then you cannot move only that customer without changing the hash function for everyone. A global time range keeps writes on the newest partition and turns that partition into the bottleneck the directory was meant to avoid. The directory costs a lookup. Pay it, and cache the mapping next to the router so the lookup is not a second round trip on every order read.`,
      rubric: [
        'The choice is a directory on customer id, with large customers placed apart from the tail.',
        'Hash-on-order-id and a single time range are rejected for this read and this write pattern.',
      ],
      myth: [
        'Hash partitioning is always the fair choice because every partition gets the same number of keys.',
        'Fair key counts are not fair load. A hash still pins a huge customer to one partition, and it scatters queries that want one customer.',
      ],
      context:
        'The directory is a partition map with an owner. Routers cache it. A stale cache is the same bug as a stale hash ring: the write goes to a place the read no longer checks.',
      tradeoff: 'A directory lets you move one customer and adds a mapping that must stay in sync with the data. A fixed hash has no map and no way to move one hot key.',
      mistake: 'Partitioning by the month because drop-partition was an easy maintenance task, then watching the current month fall over.',
      followUp: 'Which key do you put in the directory if the common read is by order id and not by customer?',
      extension: 'What happens to a customer read if the directory entry is missing?',
      alternative: 'Range partitions on customer id, split when a range gets hot, avoid a separate directory. You still keep a map of ranges, so the operational problem is similar and the lookup key is less precise.',
    },
    evening: {
      title: 'Who is wrong during the move',
      why: 'A rebalance is a period where two places disagree about who owns a key. Someone is either blocked or reading a copy that is not finished.',
      explain: `You are moving customers 5000 through 5999 from node A to node B. First copy the rows, then catch up the changes that landed on A during the copy, then switch the directory, then stop writing A for those keys. Until the switch, A is the only place that accepts writes. B is a stale copy. If a router sees the new directory early, it reads B and misses a write that just committed on A. If it sees the old directory late, it writes A after B has become the source, and that write never arrives.

You can fence the range: reject writes and maybe reads for those customers until B is caught up and the directory has flipped. Those customers are unavailable for the fence. Or you can keep serving, and then readers are inconsistent for the length of the lag. There is no moment in which A and B both have the latest row unless you stop writes or you compare versions on read. The rest of the customers are not in this range. They should not notice, unless the copy saturates the disk they share with A.`,
      question:
        'Customers 5000-5999 are moving from node A to node B. A checkout for customer 5421 runs during the copy. What can that checkout see or lose, and who else is unaffected?',
      hints: [
        'Decide whether the directory already points at B, and whether B has applied the latest write.',
        'Customers outside 5000-5999 are not in the copy, unless the copy steals the disk.',
      ],
      outline: [
        'Before the switch, writes still commit on A and B is behind.',
        'A reader that uses the new map early misses rows that are only on A.',
        'A writer that uses the old map late writes A after B is authoritative.',
        'A fence makes 5000-5999 unavailable and leaves every other customer on the old path.',
      ],
      solution: `Customer 5421 can hit a stale read or a lost write, depending on which map the router uses. If the router already points at B, the checkout reads a copy that does not yet have the last order, or it writes B while a catch-up stream from A later overwrites that row. If the router still points at A, the checkout is fine until the moment B becomes authoritative, and then a late write to A is orphaned. The failure is split brain for one range, not a general outage.

Customers outside 5000-5999 keep using their old directory entries. They are available and consistent, as long as the bulk copy does not peg the disk or the replication log on A. If you fence 5000-5999, those customers get a hard error on checkout until the switch completes, and everyone else still checks out. Pick the fence if a double-owned order is worse than a few minutes of errors. Pick a dirty read only if the screen is allowed to be behind and the write path still has a single owner. Do not let both nodes accept writes for 5421 in the same minute.`,
      rubric: [
        'The in-flight customer can read a stale copy or lose a write if both nodes are treated as owners.',
        'Customers outside the range stay on the old map, and a fence is what makes the moving range unavailable.',
      ],
      myth: [
        'During a rebalance every key is readable from either node, so the move is invisible.',
        'The destination is missing rows until catch-up finishes. Reading it early is a stale read, not a second primary.',
      ],
      context:
        'This is the same cutover as a cache invalidation race, stretched over a key range. Two routers with different maps are two clients of the directory, not two opinions you can average.',
      tradeoff: 'Fencing the range prevents double writes and turns the move into errors for those customers. Serving both sides preserves availability and creates a minute of conflicting orders.',
      mistake: 'Updating the directory first and backfilling B later, so new checkouts land on an empty partition.',
      followUp: 'What do you do with a write that committed on A after you thought the copy had finished?',
      extension: 'How does a router with a cached directory entry learn that it is stale mid-request?',
      alternative: 'Dual-writing to A and B during the move, and reading A until B's log position passes the switch. Dual-writing reintroduces a non-atomic pair unless the write carries a version both sides can reject.',
    },
  },
  'distributed-transactions': {
    morning: {
      title: 'Two commits are not one commit',
      why: 'A local transaction has one log and one recovery outcome. A transaction across two services has a network between the two commits, so one side can commit after the other has already said no.',
      explain: `Inside one database, commit writes one record. Crash recovery reads that record and the transaction is in or out. Locks, constraints, and the snapshot all live in the same process. If the process dies before the commit record, the whole change is absent. Callers do not have to reconcile half of it.

Across an order service and an inventory service, each has its own log. You can commit the order and then lose the reply from inventory, or commit inventory and crash before the order commit. Neither service can roll back a commit it has already made because the other one failed. There is also no shared snapshot. The order service can read a price while inventory reads a stock count from a later or earlier moment. A lock in one service does not block a write in the other. The new failure is not "the database was down." It is a durable outcome on one side and a different durable outcome on the other, with no single record that names the pair.`,
      question:
        'Checkout writes an order row and decrements stock in a different service. Why is this not the same as one local transaction that inserts the order and updates stock together?',
      hints: [
        'Each service can crash on its own side of the network call.',
        'A committed row in one service cannot be undone by a rollback in the other.',
      ],
      outline: [
        'A local commit is one log record and one recovery decision.',
        'The order commit and the stock commit are two log records.',
        'A crash or a timeout leaves one of them durable and the other absent.',
        'Locks and snapshots do not cross the service boundary, so the reads can skew.',
      ],
      solution: `A local transaction either inserts the order and decrements stock, or it does neither. Recovery does not produce an order without the stock change. Two services break that. The order service can commit and then time out waiting for inventory. From the caller's side the checkout failed. From the database the order exists. Retrying creates a second order unless something else stops it. The reverse crash decrements stock and never inserts the order, so the units are gone and no customer owns them.

Nothing in either service is broken. Each commit worked. The pair did not. You also cannot take a lock in the order service and expect the inventory service to see it. A concurrent checkout can pass a stock check against a number the first checkout has not reserved. That is a different problem from a local commit, and it does not go away because both services are "in the same datacenter." The network is still between the two logs.`,
      rubric: [
        'The difference named is two commit records with a crash or timeout between them, not a slower database.',
        'One concrete half-outcome is an order without a stock change, or stock taken without an order.',
      ],
      myth: [
        'If both services are ours and they sit in the same cluster, their writes commit together.',
        'Ownership of the code does not merge the logs. A timeout after the first commit is still a partial outcome.',
      ],
      context:
        'People reach for a distributed transaction when they diagram two boxes and draw one arrow labeled "checkout." The arrow is a network call. It is not a commit boundary.',
      tradeoff: 'Keeping both writes in one database preserves the single commit and couples the two teams to one schema and one failure domain.',
      mistake: 'Retrying the whole checkout after a timeout without knowing which of the two commits happened.',
      followUp: 'Which side can roll back, and which side can only compensate with a new write?',
      extension: 'What does a shared snapshot give you that two independent reads do not?',
      alternative: 'Putting the order row and the stock row in the same database restores a local commit. You give up the independent deploy and the independent scale of the two services.',
    },
    evening: {
      title: 'Reserve stock, accept the gap',
      why: 'The useful move is to shrink the atomic unit until it fits in one log. What remains is an anomaly you can name, detect, and clean up, instead of a pair of commits that only look related.',
      explain: `Do not try to commit the order and the stock change together. Make the atomic unit the reservation: in the inventory database, decrement available stock and insert a reservation row plus an outbox row in one local transaction. The order service creates its row only when it applies that outbox event. One log decides whether the units are held. The order is a follower of that fact.

The anomaly you still have is a reservation with no order. The user can be charged in a later step, or shown a success, before the order service has applied the event. If the consumer is slow, the order list is empty while inventory has already held the units. If the consumer is buggy, the hold stays until a sweeper expires it and returns the stock. You accepted a visible delay and a hold that might expire. You did not accept two services that both think they committed a sale the other one rolled back.`,
      question:
        'Checkout currently writes the order service and the inventory service as if they were one transaction. Choose a smaller atomic unit, and name the anomaly that is still visible to the user.',
      hints: [
        'Put the stock decrement and the outbox row in one inventory transaction.',
        'The remaining hole is time between the reservation and the order row, not a missing lock manager.',
      ],
      outline: [
        'The atomic unit is the inventory reservation plus its outbox row.',
        'The order row is created by a consumer, not in the same commit.',
        'The user can observe a hold, or a payment, before an order exists.',
        'A sweeper expires reservations that never grow an order, and returns the stock.',
      ],
      solution: `Make inventory the only writer that decides the sale. One transaction decrements stock, inserts the reservation, and inserts the outbox event. If that transaction rolls back, nothing is held and no event exists. The order service is downstream. It inserts the order when it handles the event, using the reservation id as its idempotency key so a replayed event does not create two orders.

The anomaly that remains is the gap. A user who refreshes the order list in that gap sees no order, while the warehouse copy of inventory already shows the units held. If you took payment before the order consumer ran, you can also have a charge for a reservation that later expires. Treat expiry as a refund, not as a silent loss. What you gave up is the fiction that the order row and the stock row appear in one instant. What you gained is one place to look when the process dies: either the reservation commit happened, or it did not.`,
      rubric: [
        'The atomic unit is one local inventory transaction that includes the outbox, not a lock across both services.',
        'The named anomaly is a reservation, or a charge, that exists before the order row, and expiry is how it ends.',
      ],
      myth: [
        'Once you emit an event, the order and the stock change are atomic.',
        'The event is another message that can be delayed or applied twice. Atomicity stopped at the inventory commit.',
      ],
      context:
        'This is the same shape as an outbox anywhere else. The inventory database is the source of the sale. The order service is a projection with a lag.',
      tradeoff: 'A smaller atomic unit makes crash recovery local and leaves a user-visible gap you have to explain in the product.',
      mistake: 'Returning "order placed" from the checkout handler before the reservation transaction has committed.',
      followUp: 'What does the user see if the sweeper expires the reservation after the card was captured?',
      extension: 'Which id must the order consumer store so a second delivery of the event does not create a second order?',
      alternative: 'Keeping order and stock in one database removes the gap and puts both teams on one commit path. Choose that if the gap is a product bug rather than a lag you can show.',
    },
  },
  'two-phase-commit': {
    morning: {
      title: 'Prepare, then the coordinator dies',
      why: 'Two-phase commit is a protocol for one decision across two logs. The dangerous state is the one after a participant has promised and before the decision is durable anywhere the participant can read.',
      explain: `The coordinator asks each participant to prepare. A participant that votes yes writes a prepared record to its own log and keeps its locks. It is promising that it can commit later, even if it crashes, and that it will not forget the change. If any participant votes no, the coordinator writes abort and tells everyone to release. If every participant votes yes, the coordinator writes a commit record to its own log. Only then does it tell the participants to commit. They write their own commit records and release locks.

If the coordinator dies after a participant has prepared and before the coordinator's commit record is durable, that participant is stuck. It holds the locks. It does not know whether another participant voted no, and it does not know whether the coordinator had already decided. Aborting on its own breaks a commit the coordinator might already have sent to someone else. Committing on its own breaks an abort. Recovery is to bring the coordinator's log back and read the decision, or to learn the decision from a participant that already received it. Until then the locks stay.`,
      question:
        'Inventory has prepared and locked the last unit. Payments has prepared. The coordinator crashes before either participant hears a decision. What is inventory allowed to do with the lock?',
      hints: [
        'A yes vote was a promise to commit if the coordinator says so, not a local commit.',
        'The decision lives in the coordinator's log, which has not been read yet.',
      ],
      outline: [
        'Both participants have written prepared and are holding locks.',
        'No participant has a commit or abort record from the coordinator.',
        'Inventory must not release the unit or sell it to someone else.',
        'Recovery reads the coordinator log, or a peer that already learned the outcome.',
      ],
      solution: `Inventory keeps the lock and the prepared record. It does not return the unit to available, and it does not let a new checkout take it. Payments does the same with its hold. From the outside, the last unit looks stuck. That is the protocol working. There is no safe local guess, because the coordinator may have written commit and died while sending the messages, or it may have written nothing and an abort is the right outcome once a human or a recovery process decides the prepare round cannot finish.

When the coordinator's log is readable again, recovery looks for a commit record. If it is there, both participants commit. If it is not, both abort and release. A participant that already received the decision can answer the other, which is why a prepared participant asks its peers instead of timing out in silence. What inventory must not do is treat "coordinator is unreachable" as a vote. The vote already happened. The missing piece is the record.`,
      rubric: [
        'Inventory holds the prepared lock and does not sell or release the unit.',
        'The outcome comes from the coordinator log or a peer that heard the decision, not from a local guess.',
      ],
      myth: [
        'If the coordinator crashes, each participant should roll back so locks do not linger.',
        'Rolling back after a yes vote splits the decision. Another participant may already have been told to commit.',
      ],
      context:
        'This blocking window is why teams avoid two-phase commit on the user path. The locks are held across a process that is not the database the user is waiting on.',
      tradeoff: 'Waiting protects the single decision and holds the last unit hostage to coordinator recovery. Guessing frees the unit and can sell it twice.',
      mistake: 'Restarting a participant to clear prepared locks because the checkout button is spinning.',
      followUp: 'A participant crashed after voting yes and before writing its prepared record. What is its vote?',
      extension: 'Which failure is worse for this sale: a stuck unit, or a unit sold to two people?',
      alternative: 'A single database commit avoids the prepared state entirely. Two-phase commit is what you are doing only because the two logs refused to become one.',
    },
    evening: {
      title: 'The participant that forgets',
      why: 'A timeout feels like ordinary request handling. In two-phase commit the prepared participant already promised to remember, so a timeout that forgets rewrites the decision.',
      explain: `After a yes vote, the participant's log is part of the transaction. The coordinator may have written commit, told the other participant, and then lost the network to this one. This participant sees silence. If it times out, deletes the prepared record, and releases the row, it has aborted a transaction the other side committed. The next reader takes the seat or the balance. When the commit message finally arrives, the participant no longer has the row in the state it promised to commit.

Forgetting is not a cleanup step. The protocol has no "I got bored" vote after prepare. A heuristic abort or a heuristic commit is a human override that you record because it may disagree with the coordinator. It is an incident, with a repair, not a timer you set to thirty seconds and ignore. Until the decision is known, the correct behavior is to keep the lock, keep answering "prepared," and keep asking for the decision.`,
      question:
        'Inventory waits 30 seconds after prepare, hears nothing, and releases the last seat. Payments then applies the coordinator's commit and captures the card. What did the timeout break, and why was the release illegal?',
      hints: [
        'The commit message may already have been delivered to payments.',
        'The prepared record was a promise that the seat would still be there to commit.',
      ],
      outline: [
        'Inventory's timeout releases a seat it had promised to hold.',
        'Payments can commit and capture funds for that seat.',
        'A later buyer can take the released seat, so two outcomes exist.',
        'The legal wait is to hold the lock until the decision record is known.',
      ],
      solution: `The timeout turned one decision into two. Payments captured funds because the coordinator had decided commit. Inventory no longer has the seat reserved, so a second buyer can take it, or the first buyer has paid for a seat the venue no longer holds. The release was illegal because the yes vote promised the opposite: that no later transaction would touch those rows until commit or abort. Silence is not an abort record. Thirty seconds is not a third phase of the protocol.

Inventory should still be holding the seat when the commit arrives, apply the commit, and then release the lock to the sold state. If the coordinator had aborted, the same wait ends in a release that every participant agrees with. If operators must force a release because the coordinator log is gone, that is a heuristic abort. Record it, reconcile it with payments, and expect to refund or to re-seat. Do not hide that path inside a client timeout.`,
      rubric: [
        'The broken outcome is a captured payment and a seat that was released for someone else.',
        'The timeout is illegal because prepare promised to wait for a decision record, not for a timer.',
      ],
      myth: [
        'Any participant can abort a prepared transaction once its own request deadline passes.',
        'The deadline is local impatience. The other participant may already have committed on the coordinator's decision.',
      ],
      context:
        'Heuristic decisions exist in real transaction managers because locks cannot be held forever when the coordinator log is actually lost. They are repairs, and they are how you get the split this scenario describes.',
      tradeoff: 'Holding locks until recovery blocks every later buyer of that seat. Releasing on a timer unblocks them by sometimes selling a committed seat again.',
      mistake: 'Setting the prepare timeout equal to the HTTP timeout and treating both as the same cancel.',
      followUp: 'The commit message arrives after the heuristic release. What does inventory log, and what does support do for the charge?',
      extension: 'How can payments, which already committed, help inventory learn the decision without the coordinator?',
      alternative: 'An outbox in one database removes the prepared state. You trade the blocking protocol for a visible lag between the two business rows.',
    },
  },
  cdc: {
    morning: {
      title: 'The log is the change stream',
      why: 'Polling a table loses the order of commits and misses deletes. The database already wrote a log of what committed. Change data capture reads that log instead of asking the table what it looks like now.',
      explain: `Every committed transaction appended records to the write-ahead log or the binlog before the client was told success. A capture process tails that log. It emits inserts, updates, and deletes in commit order, with the key and the images the log holds. Rolled-back work is not in the stream, because it never committed. The capture process does not add a trigger on the table and does not run on the query path.

Readers of the table cannot reconstruct this. A row that was inserted and deleted between two polls never appears. Two updates collapse into the latest values. The log still has both, if you have not dropped it. A new consumer starts with a snapshot of the table at a known log position, then tails from that position, so it does not miss writes that happen during the snapshot and does not apply the snapshot rows twice without a key. The database does not know who is consuming. If the consumer stops, the log retention clock is the deadline before the stream has a hole.`,
      question:
        'A job polls the orders table every minute and misses an order that was inserted and cancelled inside that minute. What does reading the log show that the poll cannot, and where must a new consumer start?',
      hints: [
        'The poll sees the table now. The log sees the commits that already disappeared.',
        'A snapshot has a log position. Tailing starts at that position, not at "now" in the abstract.',
      ],
      outline: [
        'The poll collapses the minute into the surviving rows and misses the cancelled insert.',
        'The log contains the insert and the delete in commit order.',
        'Rolled-back work is absent because it never made a commit record.',
        'A new consumer snapshots at a log position and then tails from that position.',
      ],
      solution: `The log shows the insert and then the cancel, in order, with the order id on both events. The poll shows neither, because the row is gone, or it shows only the cancelled state if the row was soft-deleted and the poll does not understand that as a transition. Downstream jobs that need "an order existed" cannot learn it from the surviving table. They can learn it from the log, as long as retention still holds those records.

A new consumer does not start at "whatever the log tail is" and also run a snapshot with no shared position. Writes during the snapshot would fall in the gap or be double-counted. Record the log position when the snapshot transaction's view is fixed. Emit the snapshot rows as a baseline. Then tail from that position and let the consumer's key rule collapse any row that appears in both. If the log is gone before the consumer is built, there is no honest reconstruction of the cancelled order. The table cannot grow it back.`,
      rubric: [
        'The log retains the insert and the delete in commit order, which the one-minute poll no longer has.',
        'The consumer starts from a snapshot tied to a log position, then tails from that position.',
      ],
      myth: [
        'A frequent poll of the table is the same as a stream of changes, just slower.',
        'A poll reads current rows. It drops transitions that were committed and overwritten or deleted between two polls.',
      ],
      context:
        'Triggers that copy changes into an outbox are a different design. They add write cost on the request. Capture reads a log the database was already writing.',
      tradeoff: 'Tailing the log keeps the write path free of consumer code and ties you to log format, retention, and a capture process that can stall replication slots.',
      mistake: 'Starting the tail at the current end and snapshotting afterward, so the gap in the middle is never emitted.',
      followUp: 'What happens to a consumer that was offline longer than the log retention window?',
      extension: 'Why is a rolled-back update absent from the stream even though the client sent it?',
      alternative: 'An outbox table written in the same transaction as the order is explicit and survives log-format changes. It costs a write on the request path that capture avoids.',
    },
    evening: {
      title: 'The same change arrives twice',
      why: 'A consumer crashes after it applies a change and before it records that it applied it. The log will hand it the same record again. The second apply has to be harmless.',
      explain: `The capture stream is at-least-once once you include restarts. The consumer reads "order 18, quantity after-image 4, log position 9001," updates a projection, and dies before saving 9001 as applied. On restart it reads 9001 again. If the projection does quantity = quantity + 1, the second apply makes 5. If the projection sets quantity to the after-image, the second apply writes 4 again and the row stays correct. The safe shape is not "increment whatever arrived." It is "remember this log position."

The memory has to sit in the same transaction as the projection write. Store the last applied position for that stream partition in the same database as the quantity. If the position is in a different store, you can commit the quantity and lose the position, which is the crash you already had, or commit the position and lose the quantity, which skips a change. An external side effect, such as sending a mail, is not inside that transaction. Then the key is still the log position, stored before the send, and the mailer must accept the same key twice without a second mail.`,
      question:
        'A consumer adds the delta in each event to a warehouse quantity. It crashes after the add and before saving its position, then restarts. What goes wrong, and which key makes the second delivery safe?',
      hints: [
        'The second delivery is the same log position, not a new order.',
        'Store that position in the same transaction as the quantity change.',
      ],
      outline: [
        'The restart delivers log position 9001 again.',
        'Adding the delta a second time moves the quantity off the after-image.',
        'The safe key is the log position, stored with the projection write.',
        'Setting the after-image is safe only if every event is an absolute value and none are skipped.',
      ],
      solution: `The quantity is wrong by one delta. The event was not a second sale. It was the same committed change, redelivered because the consumer's position did not advance. Nothing upstream is duplicated. The warehouse projection invented an extra unit. Support will see stock the primary does not have, and a later absolute snapshot will not match.

Make the apply conditional on the log position. In one transaction, if 9001 is already recorded for this partition, do nothing. If it is not, apply the change and insert 9001. A second delivery finds the row and stops. Prefer the after-image when the event has one, so a replay that slips past the position check still writes 4 and not 5. Do not use the order id alone if one order produces many updates. Positions increase inside one order. The order id is the entity. The log position is the attempt.`,
      rubric: [
        'The double apply is traced to a crash before the position is saved, and the quantity moves twice.',
        'The key is the log position, recorded in the same transaction as the projection write.',
      ],
      myth: [
        'Change events are exactly once, so a consumer can apply them with an increment and no memory.',
        'Restarting the consumer redelivers from the last saved position. An increment without that position is a second change.',
      ],
      context:
        'This is the idempotency key problem with the key chosen by the log, not by the client. The client never saw the log position. The consumer has to.',
      tradeoff: 'Storing every applied position forever is exact and grows without bound. Storing only the highest contiguous position is small and forces you not to commit a later event first.',
      mistake: 'Saving the position in the consumer process memory, which dies in the same crash as the apply.',
      followUp: 'The projection is an email send, not a row. Where do you store the position relative to the send?',
      extension: 'Why is the order id an insufficient key when one order is updated five times?',
      alternative: 'Applying only absolute after-images makes a blind replay of the latest event idempotent. It still drops an intermediate state if you skip a position the product needed to observe.',
    },
  },
  'stream-processing': {
    morning: {
      title: 'The count that never closes for the night',
      why: 'A nightly batch answers yesterday. A login check needs the failures from the last few minutes while the attempts are still happening. The job has to keep a result, not a file that appears at midnight.',
      explain: `Define a job that reads the login-attempt stream and keeps, per account, how many failures occurred with event times in the last five minutes. As each attempt arrives, the job updates that count and writes the new value where the login path can read it. There is no point in the day when the job "finishes" and replaces a table. The result is a value that moves.

State lives in the job, keyed by account, and it has to survive a restart. A checkpoint stores the counts and the stream position together. On restart the job loads the checkpoint and continues. It does not recompute the morning from raw logs unless the checkpoint is gone. A nightly batch over the same logs would publish a number too late to lock an account during an attack, and it would re-read a day of attempts to change a handful of rows. The continuous job reads each attempt once, plus replays after a failed checkpoint. The login path does not scan the raw stream. It reads the latest count.`,
      question:
        'Account lockout needs the number of failures in the last five minutes, available on the next login. Why is a nightly job the wrong shape, and what does the continuous job store?',
      hints: [
        'The decision happens during the attack, not after the warehouse run.',
        'The job stores a count per account and a position in the stream, not a pile of raw attempts.',
      ],
      outline: [
        'The nightly batch publishes yesterday, after the lockout decision has passed.',
        'The continuous job updates a five-minute failure count as attempts arrive.',
        'The login path reads that count and does not scan the raw stream.',
        'A checkpoint holds the counts and the stream position together.',
      ],
      solution: `A nightly job computes a result for a day that is already over. The attacker does not wait for it. Even an hourly batch leaves up to an hour of failures invisible to the lockout check, and it still reprocesses a window the continuous job has already reduced to a number. The shape you want is a maintained count, updated on each event, read on each login.

Store the count per account, the event times still inside the five minutes, and the stream position of the checkpoint. Drop attempts that have aged out of the window so the state stays small. Write the count where the login service can read it without calling the job. If the checkpoint and the published count can move separately, a crash republishes an old count or skips a stretch of attempts. Put the position and the effects you can rewind in one record. The login service then enforces the lock. The job only maintains the number.`,
      rubric: [
        'The nightly batch is rejected because the lockout decision cannot wait until the day is over.',
        'The job stores a per-account rolling count and a checkpointed stream position.',
      ],
      myth: [
        'A stream job is a faster nightly batch, so it still replaces the whole table on a schedule.',
        'The result is updated as events arrive. Waiting for a schedule puts the lockout behind the attack.',
      ],
      context:
        'The login service stays a reader of a small keyed value. Putting the raw attempt log on the login path would make every password check a scan.',
      tradeoff: 'Checkpointing often limits how much work a crash repeats and adds write cost. Checkpointing rarely makes restart cheap and replays a long stretch of attempts.',
      mistake: 'Having the login handler scan the last five minutes of the raw log on every password attempt.',
      followUp: 'What does the login path do if the count has not been updated for longer than the checkpoint interval?',
      extension: 'Why must the checkpoint and the published count share a fate?',
      alternative: 'A database query that counts recent failures on each login avoids a stream job and contends on the attempt table at login rate. It fits only while that rate is small.',
    },
    evening: {
      title: 'The failure that arrives after the alert',
      why: 'Events do not arrive in the order they happened, and they do not arrive inside the window they belong to. A job that emits a count and forgets the window will page on a lie or miss the attempt that mattered.',
      explain: `The job emits "account 7 had two failures between 10:00 and 10:05" at 10:06, then drops the window. At 10:08 a third failure arrives with event time 10:04. It was slow because the client was offline. If the job ignores it, the emitted count stays at two and the lockout never trips. If the job still has the window, it updates the count to three and emits a correction. Reordering is the same hole with a different clock. A success can arrive before the failure that happened earlier, and a job that assumes arrival order will clear a lock the event-time count should still hold.

The job needs a rule for lateness. Hold each window open for a grace period after the watermark, apply late events into that window, and emit a new count when the number changes. After grace, either drop the event and count the drop, or send it to a side output a human can see. Do not append it to "whatever window is open now," because that attributes 10:04's failure to 10:08 and pages the wrong minute.`,
      question:
        'The five-minute failure count for account 7 was emitted as two. A third failure, timestamped inside that window, arrives three minutes later. What is wrong if you ignore it, and what is wrong if you add it to the current minute?',
      hints: [
        'The event time is inside the closed window. The arrival time is not.',
        'Adding it to the open window moves the failure onto a minute when it did not happen.',
      ],
      outline: [
        'Ignoring the event leaves the emitted count at two and skips the lockout.',
        'Adding it to the current minute attributes the failure to the wrong time.',
        'The job should correct the original window if that window is still inside grace.',
        'After grace, count the drop instead of rewriting a random open window.',
      ],
      solution: `Ignoring the event leaves a published count that is short by one. If the lockout threshold is three, the account stays open through an attack the job already has the evidence for. The login path cannot reconstruct the missing attempt, because it only reads the count. The damage is a decision made from a result the job refused to correct.

Adding the failure to the 10:08 window is also wrong. The account did not fail at 10:08. It failed at 10:04. Alerts and rate graphs will show a spike in the minute the consumer was slow, and the original window stays under threshold. Keep the 10:00 window mutable until grace expires, emit three when the late event lands, and have the login path read the corrected count. If grace is already over, increment a late-drop metric and do not pretend the event belongs to now. The threshold for account 7 was a fact about 10:00, not about whenever the packet showed up.`,
      rubric: [
        'Ignoring the event keeps a wrong count of two and can miss the lockout.',
        'Parking the event in the current minute misstates when the failure happened. The fix is a correction to the original window or an explicit drop.',
      ],
      myth: [
        'Once a window result is emitted, later events belong to the next window.',
        'Belonging is decided by event time. Arrival after the emit is lateness, and it either corrects that window or it is counted as late.',
      ],
      context:
        'Mobile clients and retries make this ordinary. The stream's order is the order of delivery into the job, not the order of the attempts.',
      tradeoff: 'A long grace period corrects more late failures and delays the final count. A short one pages sooner and silently drops the attempt that would have crossed the threshold.',
      mistake: 'Sorting by arrival time and treating that sort as the order the user attempted logins.',
      followUp: 'A success with an earlier event time arrives after you already counted three failures. What should the count do?',
      extension: 'What do you graph so an operator can see that lockouts are being computed from late events?',
      alternative: 'Recomputing the last hour from raw events on a timer fixes late data and gives up the "each event once" cost that made the job continuous.',
    },
  },
  'event-time': {
    morning: {
      title: 'When it happened, when you heard',
      why: 'A timestamp on an event is not the time your process observed it. Windows, bills, and alerts change their meaning depending on which of those clocks you aggregate.',
      explain: `Event time is when the thing happened, usually a timestamp the producer wrote. Processing time is when your job or your server handled the event. Ingest time is when it first hit your front door. They diverge whenever a client was offline, a buffer filled, or a consumer was stopped. A phone that records a tap at 12:01 and uploads it at 12:40 has an event time of 12:01 and a processing time of 12:40.

Anything that means "per minute of user experience" has to use event time and then say how late an event may be and still count. Anything that means "how behind is the consumer" uses the gap between the two clocks. Mixing them creates a graph that moves when your pipeline hiccups, not when users had a bad minute. The event timestamp is also a claim. A client clock can be wrong. You still keep it separate from processing time, and you can bound it, rather than throwing it away and using the arrival clock as a substitute for what the user did.`,
      question:
        'A client records a failed payment at 12:01 and the event reaches your job at 12:40 because the phone was offline. Which clock should the billing minute use, and which clock tells you the pipeline was behind?',
      hints: [
        'The user experienced the failure at 12:01, not at 12:40.',
        'The forty-minute gap is a property of delivery, not of the payment.',
      ],
      outline: [
        'Event time is 12:01, the time on the payment.',
        'Processing time is 12:40, when the job handled it.',
        'The billing minute uses event time so the charge lands in the minute it happened.',
        'The lag graph uses the gap between the two clocks and does not rewrite the payment time.',
      ],
      solution: `Bill the failure to 12:01. That is when the payment happened, which is the minute a customer, a merchant, or a dispute will ask about. Using 12:40 charges the incident to a quiet minute and leaves 12:01 looking clean. The offline phone is not a reason to edit the event. It is a reason to accept the event late and fold it into the 12:01 bucket if it is still inside the allowed lateness.

The pipeline's health is the gap, about 39 minutes for this event. Graph that separately. If you instead set the event's timestamp to the processing time at the door, you destroy the only record of when the payment happened, and every downstream window inherits the outage. Keep both fields. Window by event time. Alert on lag when the gap grows, because that alert means "we are late," not "users suddenly failed at 12:40."`,
      rubric: [
        'Billing uses the 12:01 event time, and the 12:40 processing time is not written over it.',
        'Pipeline lag is the gap between the two clocks, graphed as lag rather than as a spike in failures.',
      ],
      myth: [
        'The time we stored the event is the time the event happened, because that is the time we trust.',
        'Storage time is when you learned about it. The producer time is when it happened, and both fields are useful for different questions.',
      ],
      context:
        'Client clocks skew, so event time is not holy. Bounding a timestamp that is hours in the future is a validation rule. Replacing it with the server clock is a different choice, and it changes every window.',
      tradeoff: 'Trusting client timestamps preserves the user minute and admits skewed clocks. Stamping at the door makes windows tidy and misfiles offline events.',
      mistake: 'Overwriting the producer timestamp with the ingest time so the warehouse schema has only one time column.',
      followUp: 'A client stamps an event two days in the future. Do you drop it, bound it, or bill it?',
      extension: 'Which clock should an SLO on "time to ingest" use, and which should a receipt use?',
      alternative: 'Storing only ingest time simplifies the pipeline and makes offline clients bill the upload minute. That is acceptable only if the product defines the event as the upload.',
    },
    evening: {
      title: 'The page that fired on the quiet minute',
      why: 'Processing-time windows report when your job was busy. On-call then treats a backlog flush as an outage in the minute the backlog drained.',
      explain: `You alert when the one-minute error count exceeds 100. The errors happened between 12:00 and 12:01. A stuck consumer processes them at 12:05, along with a quiet stretch that followed. A processing-time window attributes all of them to 12:05. The pager fires for 12:05, a minute when users were fine and the job was catching up. The 12:00 window, if you only count what arrived inside it, looks empty, so the minute of the real incident never pages.

An event-time window groups those errors under 12:00. It has to stay open long enough to receive them, or it has to accept a late correction. The alert then says "12:00 crossed 100," which is the minute a status page should name. The lag alert, if you want one, is a different rule on the gap between event time and processing time. One number cannot honestly be both the user-facing error spike and the consumer backlog.`,
      question:
        'Errors from 12:00-12:01 sit in a backlog and are processed at 12:05. The one-minute pager uses processing time. What does on-call investigate, and what would an event-time window have paged instead?',
      hints: [
        'The errors did not occur at 12:05. The consumer woke up at 12:05.',
        'A lag alert and an error alert are two thresholds, not one window.',
      ],
      outline: [
        'Processing time pages 12:05, the minute the backlog flushed.',
        'That minute was quiet for users. The investigation looks at the wrong interval.',
        'Event time groups the same errors under 12:00 and pages that minute.',
        'Consumer lag needs its own signal, the gap between the clocks.',
      ],
      solution: `On-call opens 12:05 and finds a consumer catching up, not a new failure. They may roll back a deploy that landed at 12:04 and miss the bad release, the bad dependency, or the traffic spike that actually ran at 12:00. The processing-time window did what it was defined to do. It counted arrivals into the job. That definition is the wrong one for a user-facing error budget.

An event-time window pages 12:00 once the late errors land, provided grace covers the five-minute delay or a correction is allowed to fire after the window first looked empty. The page then matches logs, support tickets, and the deploy that went out at 11:58. Keep a second alert on ingest lag so a stuck consumer is still visible when the error count has not crossed the line. Do not "fix" the false page by raising the threshold. The next backlog will be larger and will still be filed under the wrong minute.`,
      rubric: [
        'The processing-time page points at 12:05, a flush, and misdirects the investigation.',
        'Event time pages 12:00 for the same errors, and lag is a separate alert.',
      ],
      myth: [
        'Processing time is the conservative clock because the server clock is accurate.',
        'An accurate server clock still timestamps the wrong event. It records when you processed the error, not when the user hit it.',
      ],
      context:
        'Backlog flushes are a common source of false pages. The graph looks like an incident because the window was defined on the consumer, not on the user.',
      tradeoff: 'Event-time alerts wait for grace before they are final, so they page later. Processing-time alerts page immediately and blame the wrong minute.',
      mistake: 'Raising the alert threshold until backlog flushes stop paging, which also hides a real 12:00 spike of the same size.',
      followUp: 'Grace is one minute and the backlog is five. What do you alert on while the 12:00 window is still missing its events?',
      extension: 'How would a status page sentence differ between these two windows?',
      alternative: 'Alerting on the ratio of errors to requests inside the consumer, still in processing time, removes some flush noise and still reports the consumer minute rather than the user minute.',
    },
  },
  'search-indexes': {
    morning: {
      title: 'The row is not the search document',
      why: 'The database that takes the order is built for a transaction. The structure that answers "products matching these words" is built for that query. Using one for the other either slows the purchase or returns a scan.',
      explain: `The product row lives in the transactional store. It has a primary key, a price, a stock constraint, and it is the row a purchase locks. Search needs tokens, ranking, and a query that would be a scan or an awkward combination of indexes if you asked the transactional store to do it at page-view rate. The search index holds a document per product, built from the row, and it serves the query. It does not enforce "price is non-negative" or "only one sku." Those stay on the write path into the transactional store.

The index is fed by the log or by a job that reads committed rows. The purchase path writes the transactional store and returns. It does not wait for the document to be searchable, and it does not read the index to decide whether the sku exists. A query hits the index, gets back ids, and loads any fresh fields it must not serve stale, such as the current price, from the transactional store. Deleting the row does not delete the document until the feed says so.`,
      question:
        'A purchase must decrement stock exactly once, and the product page must find products by words in the description. Where does each operation run, and which store is allowed to be missing the new product for a while?',
      hints: [
        'The stock constraint lives on the transactional row. The word query lives on the index.',
        'The index is a follower. The purchase does not consult it to decide if the sku is real.',
      ],
      outline: [
        'The purchase locks and updates the product row in the transactional store.',
        'The word query reads the search index and gets back ids.',
        'The index is built from committed rows or the log, not from the purchase transaction.',
        'The index is the store that may not contain the new product yet.',
      ],
      solution: `Decrement stock in the transactional store, in the same transaction as the order line, with a constraint that stock does not go negative. That commit is the sale. The search index is not a participant. After commit, the log or a job upserts a document. Until that happens, a word query will not find the new product, and that is the lag you accept. A lookup by primary key still reads the transactional store and can show the product to its editor immediately.

Do not run the word query as a scan on the transactional store to avoid that lag. At page-view rate it becomes the bottleneck the index existed to remove, and it sits on the same pages as the stock updates. Do not ask the index whether stock is available in order to accept the purchase. The document's stock field is a copy. Two purchases can both see "10 left" in the index and both commit. The constraint on the row is what makes one of them fail.`,
      rubric: [
        'The sale is a transactional update with a stock constraint, and the word query is an index read.',
        'The index is explicitly allowed to lack the new document until the feed catches up.',
      ],
      myth: [
        'If the search document has a stock field, checkout can trust it and skip the transactional row.',
        'The document is a copy, possibly stale. Two checkouts can read the same leftover stock. The row constraint is the decision.',
      ],
      context:
        'This split is why a search outage should not stop purchases by id, and a database failover should not be explained as "search is down."',
      tradeoff: 'Serving price from the index avoids a second read and can sell at a stale price. Serving price from the row adds a read and matches the charge.',
      mistake: 'Updating the search document inside the purchase transaction so the sale fails when the index is slow.',
      followUp: 'Which fields do you load from the row after the index returns ids, and which do you render from the document?',
      extension: 'A search node is down. Which user action still works?',
      alternative: 'A database full-text index on the product table removes the second system and puts query load on the store that also locks stock. It fits a small catalog.',
    },
    evening: {
      title: 'The rename the search box cannot see',
      why: 'Users experience index lag as a broken save. The row committed. The document they can find is the old one, and the gap has a length you can point at.',
      explain: `A seller renames a product from "Red mug" to "Blue mug" and immediately searches for Blue. The transactional update has committed. The indexer has not consumed that log position, or it has consumed it and the search replica has not refreshed. The query still returns Red mug, or it returns nothing if the query is exact. The lag is the sum of capture lag, the indexing batch, and any refresh interval on the replica that serves reads. It is not zero just because the write API returned 200.

Say that number to the product. If the pipeline is healthy at under ten seconds, the seller's own screen should not use search to confirm the save. Read the row by id for the owner. Everyone else's search is allowed to be behind. Also describe the delete. A product removed from the store remains findable until the document is removed, and a click then 404s or, worse, loads a row that a cache resurrected. Lag on delete is a stale hit. Lag on insert is a miss. They are the same pipeline measured in two directions.`,
      question:
        'A seller renames "Red mug" to "Blue mug," gets a success response, and searches for Blue. The old name still comes back. What has committed, what has not, and which read should the seller\'s own page use?',
      hints: [
        'The 200 is the transactional commit, not the index refresh.',
        'The owner can read by primary key. The search box is the stale path.',
      ],
      outline: [
        'The row has the new name. The document still has the old one, or is absent.',
        'The gap is capture lag plus index batching plus replica refresh.',
        'The seller confirms the save by reading the row, not by searching.',
        'A delete stays findable for the same gap and then clicks through to a miss.',
      ],
      solution: `The rename is durable in the transactional store. Search is serving a document built from an earlier log position. The seller's search is not evidence that the save failed, and repeating the save will not teach the index any faster. It only writes the same row again. The page that confirms the edit should GET the product by id from the transactional store. That read sees Blue mug as soon as the commit returned.

Other shoppers search and may see Red mug until the pipeline catches up. If a healthy pipeline is under ten seconds, say that, and do not block the save on it. If the indexer is hours behind, that is an incident, not the ordinary lag, and the signal is the log position of the index versus the primary, not the seller's anecdote alone. The same clock applies to a delete: the id remains in results until the document is removed. Do not "fix" the rename by writing the index inside the request. You would couple the save to a system the purchase path was deliberately not waiting on.`,
      rubric: [
        'The commit has the new name and the index still has the old document for the length of the pipeline.',
        'The seller reads by id. Search is not the confirmation and is not put inside the write transaction.',
      ],
      myth: [
        'A successful save means every read path, including search, returns the new value.',
        'The success is the transactional commit. Search is a follower with its own position in the log.',
      ],
      context:
        'Support tickets of the form "I uploaded it and it is not searchable" are this lag. The useful reply names the pipeline position, not a second upload.',
      tradeoff: 'Refreshing the index on every write shortens the gap and turns a rename storm into index load. Batching lengthens the gap and keeps the index stable.',
      mistake: 'Telling the seller to edit the product again because search did not change.',
      followUp: 'How do you measure the lag without waiting for a seller to complain?',
      extension: 'A shopper buys from a stale search hit. Which price do you charge, the document or the row?',
      alternative: 'A synchronous index update on the seller write removes the gap for renames and makes the editor depend on index availability. Shopper search can still be a replica behind that update.',
    },
  },
  'inverted-index': {
    morning: {
      title: 'The term points at the documents',
      why: 'Search is fast when the query touches the words the user typed, not every document you have stored. The index is shaped as term to documents because that is the direction the query runs.',
      explain: `An inverted index maps a term to the list of documents that contain it. "Mug" points at documents 4, 9, and 12. "Blue" points at 9 and 15. A query for blue mug intersects those lists and returns 9. Positions inside each posting tell you whether the words were a phrase or just both present. The dictionary is the set of terms. A rare term has a short list and is cheap. A term like "the" has a list close to the size of the corpus, which is why you often do not index it, or you index it only for phrases.

The other direction, document to the terms inside it, is how you build and delete. It is a bad query path. Finding every document containing "mug" would mean reading every document. The inverted shape reads two lists and writes nothing on the query. That is why the expensive work happens when a document changes, not when someone searches. You pay at update time so the read can be an intersection instead of a scan.`,
      question:
        'The catalog has five million products. A query asks for the phrase "blue mug." Why does a term-to-document list answer it without reading every product, and what is stored besides the document id?',
      hints: [
        'The query reads the lists for the terms it contains, then intersects them.',
        'Positions in the list distinguish a phrase from two words somewhere in the document.',
      ],
      outline: [
        'Each term points at the documents that contain it, not the other way around.',
        'The query loads the posting lists for blue and mug and intersects them.',
        'Positions on the postings enforce the phrase, not only the two words.',
        'A document-to-terms map would scan the catalog and is the wrong query shape.',
      ],
      solution: `The query never opens the five million products. It opens the dictionary entries for "blue" and "mug," reads those posting lists, and intersects them. If "mug" appears in forty thousand products and "blue" in ten thousand, the work is proportional to those lists, not to the catalog. Documents in both lists are candidates. Positions stored next to each document id keep only the hits where "blue" is immediately followed by "mug." Without positions you can return a blue lid sold with a mug in the same description.

The forward direction still exists as the source text and as whatever map you need to delete a document from every list it joined. You do not use it to answer the query. You use it when the description changes and you must find the old terms. The shape serves search because the user's words are the lookup key. The documents are the payload hanging off that key.`,
      rubric: [
        'The query intersects posting lists for the terms and does not scan the five million products.',
        'Positions are named as the extra data that makes the phrase check possible.',
      ],
      myth: [
        'An index on the document id is enough for search, because you can fetch each document and test the words.',
        'Fetching each document is a scan. Search needs the term as the key so the documents come back from the word.',
      ],
      context:
        'Ranking uses the same lists, often with term frequency stored in the posting, so you can score without loading the full description first.',
      tradeoff: 'Storing positions makes phrases possible and inflates the index. Skipping them makes a smaller index that treats a bag of words as a match.',
      mistake: 'Indexing every token, including extremely common words, and then intersecting lists the size of the corpus.',
      followUp: 'Why is the forward map still required when a document is deleted?',
      extension: 'Which list do you read first if one term is rare and the other is common?',
      alternative: 'A forward scan with a text filter answers the same phrase and costs a pass over the catalog. It is a fallback for a tiny collection, not for five million products.',
    },
    evening: {
      title: 'A like count rewrites the postings',
      why: 'The inverted index is cheap to read and expensive to edit. An update pattern that rewrites a whole document for a field nobody searches will dominate the index cost.',
      explain: `Changing a document means removing its id from every term it used to contain and inserting it into every term it contains now. A 200-word description touches on the order of 200 lists, more if you store positions and have to rewrite slices of those lists. That cost is reasonable when the description changes. It is unreasonable when the field that changed is a like count, a stock level, or a "viewed" counter stored in the same document as the description.

If every like rewrites the document, a popular product rewrites the same 200 postings once per like. The terms did not change. The index still deletes and reinserts them, because the document is the unit of update. The pattern that hurts is a high-frequency mutation of a non-text field living inside the searchable document. Keep the counter in a forward store keyed by document id. Reindex when the words change. The query can fetch the count after it has the ids, or tolerate a count that is hours old if you occasionally refresh it.`,
      question:
        'Product documents contain the description and a like count. Every like updates the document in the inverted index. Why is that update pattern expensive, and where should the count live instead?',
      hints: [
        'An update removes the document from each term list and inserts it again.',
        'The words did not change. The counter can live beside the index, keyed by document id.',
      ],
      outline: [
        'Each like rebuilds postings for every term in the description.',
        'The term lists change even though the terms did not.',
        'Move the like count out of the inverted document.',
        'Reindex only when the searchable text changes.',
      ],
      solution: `A single like rewrites every posting that mentions the product, because the index updates a whole document. A description of a couple hundred tokens becomes a couple hundred list edits, repeated for every like. On a product that gets thousands of likes an hour, the index spends its write budget reinserting the same words. Query latency suffers when those lists are constantly rewritten, and the cluster looks "hot" with no change in search traffic.

Store the like count in a row or a forward record keyed by product id. The inverted document holds the text that search actually matches. Update that document when the title or description changes, which is rare next to likes. After a query returns ids, read the counts if the page must show them fresh, or join a slowly refreshed copy if it must not. What you must not do is treat the searchable document as a general-purpose row. The shape that makes search fast is the shape that makes unrelated updates loud.`,
      rubric: [
        'The cost is a full posting rewrite for unchanged terms, driven by the like count.',
        'The count moves to a forward record by document id, and reindex runs when the text changes.',
      ],
      myth: [
        'Updating one field in a search document rewrites only that field.',
        'The inverted document is stored as term postings. A field that shares the document still forces those postings to be deleted and inserted again.',
      ],
      context:
        'Stock levels and last-viewed timestamps cause the same amplification. They belong on the transactional row or a side record, with the index holding text.',
      tradeoff: 'Leaving the count in the document makes the search response self-contained and turns every like into an index write. Splitting it adds a read after the ids come back.',
      mistake: 'Indexing the entire product row, including counters, because the indexer already had the row in hand.',
      followUp: 'A title change and a like arrive together. Which one is allowed to reindex?',
      extension: 'What happens to delete cost for a document that sits in tens of thousands of term lists?',
      alternative: 'Batching like updates into an hourly reindex of that document cuts the write rate and leaves the count in the index stale for the hour. The terms are still rewritten for a field search does not use.',
    },
  },
  'time-series': {
    morning: {
      title: 'A metric is a series with a lifetime',
      why: 'A metric is not one number. It is a name plus tags, a stream of samples, a retention for the raw points, and a plan for the coarser points you keep after that.',
      explain: `Model each series as an identity and a sequence. The identity is the metric name and its tags, such as the service and the status code. The sequence is samples of timestamp and value. A request counter scraped every 10 seconds is 6 samples a minute, 360 an hour, 8640 a day. At 16 bytes for a timestamp and a value, one series is about 8640 times 16, roughly 138 kilobytes a day. One hundred thousand series is about 13.5 gigabytes a day of raw samples, before replication and before the index of series names.

You do not keep that resolution for a year. Keep raw samples for a short window, for example 7 days, which is about 95 gigabytes at this rate. Downsample to five-minute sums and maximums for 90 days, and to one-hour points for a year. The five-minute series has 288 points a day instead of 8640, which is 30 times smaller. Queries for last Tuesday hit the downsample. Queries for the last hour hit raw data. A new tag value is a new series, not a new column. That is the retention model: two clocks, sample interval and how long each resolution lives.`,
      question:
        'You scrape one counter every 10 seconds for 100,000 series. How much raw data is that per day, and what do you keep after the raw retention window so a year does not store every scrape?',
      hints: [
        'Samples per day are 6 per minute times 60 times 24, then times series count and bytes.',
        'Downsample to a coarser interval instead of deleting history outright.',
      ],
      outline: [
        'One series produces 8640 raw samples a day at a 10-second interval.',
        'At 16 bytes, 100,000 series are about 13.5 gigabytes a day.',
        'Keep raw samples for days, not for a year.',
        'Keep five-minute and one-hour rollups so older graphs still have a point to read.',
      ],
      solution: `Each series produces 6 samples a minute. Times 60 minutes times 24 hours is 8640 samples a day. Times 16 bytes is 138,240 bytes, about 135 kilobytes per series per day. Times 100,000 series is about 1.35 times 10 to the 10th bytes, or roughly 13.5 gigabytes a day. Seven days of raw data is on the order of 95 gigabytes, before you replicate it. A year of raw data would be roughly 365 times 13.5 gigabytes, about 5 terabytes, for values nobody will graph at 10-second resolution in November.

After the raw window, downsample. A five-minute bucket holds the sum, the count, and the max, so a rate and a peak can still be drawn. That is 24 times 60 divided by 5, which is 288 points a day, about 30 times fewer than 8640. Keep those for 90 days, then keep hourly points for a year. The graph of last quarter reads the hourly series. The graph of the last hour reads raw samples. Document the identity too: adding a tag is a new series and multiplies this arithmetic. The retention rules are part of the model, not a janitor job you bolt on later.`,
      rubric: [
        'The daily raw volume is computed from interval, bytes, and series count, on the order of 13.5 gigabytes.',
        'Older data is kept as five-minute and hourly rollups, not as every 10-second sample.',
      ],
      myth: [
        'A metric is a single current value, so storage is one row per series.',
        'The current value is the latest sample. The product is the history, and the history has a resolution and a retention for each age.',
      ],
      context:
        'Dashboards hide this until a cardinality change multiplies the 100,000 series. The bill moves because the identity changed, not because the scrape got chattier.',
      tradeoff: 'Short raw retention keeps the hot store small and makes a six-day incident unreconstructable at full resolution. Long raw retention does the reverse.',
      mistake: 'Storing every scrape forever in the database that also serves the live dashboard.',
      followUp: 'What must a five-minute bucket store so you can still compute a rate, not only an average of averages?',
      extension: 'How does the daily volume change if the scrape interval moves from 10 seconds to 60?',
      alternative: 'Keeping raw data for a year in cheap object storage, and only the last day in the query store, preserves resolution and makes old queries slower and operationally separate.',
    },
    evening: {
      title: 'A late point and a counter that restarts',
      why: 'Two ordinary events ruin a graph if the rollup assumes samples arrive in order and counters only go up. One is a point that shows up after its bucket was closed. The other is a process restart.',
      explain: `A late sample belongs to 12:01 and arrives at 12:11, after the five-minute rollup for 12:00-12:05 was written. The raw store can still accept it if that block allows out-of-order writes. The rollup already published an average that excluded it. Until you recompute that bucket, the hourly graph is missing the point and any alert on the rollup has already evaluated the wrong number. Dropping the late sample keeps the rollup stable and biases the hour low.

A counter reset is a restart. requests_total goes 5000, then 0, then 30 over the next scrape interval of 15 seconds. A naive delta, 30 minus 5000, is -4970 in 15 seconds, about -331 per second. The graph dives below zero, or the UI clips negatives and shows a hole, hiding the 30 requests that happened after the restart. A rate that understands counters treats a decrease as a reset, starts from zero, and counts the 30. A gauge, unlike a counter, is allowed to decrease, so the same rule must not be applied to queue depth.`,
      question:
        'requests_total drops from 5000 to 0 and then reads 30 at the next 15-second scrape. A sample for 12:01 also arrives after its five-minute bucket was rolled up. What does each do to the graph?',
      hints: [
        'Subtracting across the reset produces a large negative rate.',
        'The late sample is missing from a bucket that already closed, not from the minute the packet arrived.',
      ],
      outline: [
        'The naive delta is 30 minus 5000 over 15 seconds, a large negative rate.',
        'Clipping negatives hides the post-restart requests instead of counting them.',
        'A counter-aware rate treats the drop as a reset and counts the 30.',
        'The late 12:01 sample stays out of the rollup until that bucket is recomputed.',
      ],
      solution: `The reset makes a naive graph claim the service ran backward at about 331 requests per second, because (30 - 5000) / 15 is -331.3. If the drawer drops negative rates, the restart looks like a gap and the 30 new requests never appear in the rate. Either drawing is wrong. Treat the decrease as a process start, emit a rate from the new samples only, and do not connect 5000 to 0 with a line that means "negative work." A gauge would keep the decrease. Do not run the reset rule on it.

The late sample is a different defect. The 12:00-12:05 rollup was computed without the 12:01 point, so the five-minute average is low and any alert on that average already fired or did not fire on incomplete data. Recompute the bucket when the late point lands, or mark the bucket provisional until the lateness window passes. Attributing the point to 12:11, when you learned about it, moves it into the wrong five minutes and repeats the processing-time mistake on a graph the on-call trusts.`,
      rubric: [
        'The reset is shown as a negative or missing rate under naive delta, with the arithmetic of 30 minus 5000 over 15 seconds.',
        'The late sample is missing from the closed 12:01 bucket until recomputed, and is not moved to 12:11.',
      ],
      myth: [
        'Counters only increase, so a dip in the graph is a real drop in traffic.',
        'A restart sets the counter back to zero. The dip is a new process, and the rate function has to start over rather than subtract across it.',
      ],
      context:
        'Deploys restart processes and flush late metrics at the same time. The graph during a deploy is exactly these two hazards together.',
      tradeoff: 'Recomputing closed buckets fixes late data and rewrites a graph someone may have already used for an incident. Freezing buckets keeps the incident stable and the average low.',
      mistake: 'Drawing a line from the pre-restart sample to zero and calling it a traffic collapse.',
      followUp: 'How do you tell a counter reset from a bug that decreased a gauge?',
      extension: 'What does the five-minute sum store so a late point can update it without the original samples?',
      alternative: 'Recording absolute counters only in raw storage, and computing rates at read time, handles resets on read and makes every dashboard query more expensive.',
    },
  },
  'vector-retrieval': {
    morning: {
      title: 'Nearest neighbor is an index',
      why: 'Approximate nearest-neighbor search is a storage and query system. The model that produced the vectors is upstream. The system you operate is the index, the filters, and the ids you hand back.',
      explain: `You store one vector per chunk, plus the chunk id and the filter fields you refuse to apply late, such as the tenant. A query is another vector. The index returns k ids that are close under a distance, without reading every vector. An exact scan would. The approximation, a graph walk or a cluster probe, is how you skip work. It can miss a true neighbor. Recall is the fraction of the true nearest set you actually returned. That number is a property of the index build and the query parameters, not of the embedding model.

Around the index you still have a pipeline. A job embeds new or changed chunks and inserts them. A delete must remove or tombstone the id, or the query returns a chunk the source no longer has. The index may be sharded. After the ids come back, you load the text from a store keyed by chunk id. The model call, if there is one, happens after that, and it is not what found the neighbors. Memory is the cost: the graph or the clusters have to be resident to hit the latency you promised. A rebuild changes recall and has to be swapped, not edited vector by vector in the hottest path, unless the index supports incremental inserts with a known recall cost.`,
      question:
        'A search returns ten chunk ids for a query vector. What did the index guarantee, what did it not scan, and which component is allowed to miss a true neighbor?',
      hints: [
        'Approximate search trades a full scan for a recall target.',
        'The embedding model is not the component that stored or filtered the ids.',
      ],
      outline: [
        'The index stores vectors and returns k approximate neighbors by distance.',
        'It does not read every vector, which is why a true neighbor can be missing.',
        'Recall names that miss rate. It is an index property.',
        'Text and the later model call are lookups after the ids, not the search.',
      ],
      solution: `The index guaranteed an approximate top ten under its distance and its build parameters, from the vectors it had indexed at query time. It did not scan the full collection. That is the point of the graph or the clusters. The component that can miss a true neighbor is this index, not the model that will later read the text. If recall at ten is 0.9 on your evaluation set, about one of the ten true neighbors is absent on average. You do not discover that from a single query a user liked.

The model that embedded the query is upstream. Swapping it without re-embedding the corpus makes distances meaningless, which is an index rebuild, not a prompt change. Filters matter here too. If you search the whole corpus and then drop other tenants, you can return fewer than ten valid ids, or you can spend the ten slots on vectors you must discard. Partition or filter so the neighbor walk happens inside the tenant. Then hydrate text by id from the chunk store. The vector index does not need to be the system of record for the prose.`,
      rubric: [
        'The guarantee is approximate neighbors from an index, with an explicit possibility of missing a true neighbor.',
        'The full scan is what was avoided, and the embedding model is not described as the retrieval system.',
      ],
      myth: [
        'Nearest-neighbor search reads every vector and returns the exact closest documents.',
        'The usual serving path is approximate so it can skip vectors. Exactness was traded for latency and memory, and recall is how you measure the trade.',
      ],
      context:
        'Operators tune build parameters and memory. They do not tune "the AI." A recall regression after a rebuild is an index incident.',
      tradeoff: 'A bigger candidate list raises recall and raises latency and memory. A smaller one does the reverse and fails closed only if the product can tolerate missing the best chunk.',
      mistake: 'Re-embedding queries with a new model while the index still holds vectors from the old one.',
      followUp: 'What do you rebuild when you change the embedding model?',
      extension: 'Why can a post-filter for tenant id return fewer than k results?',
      alternative: 'An exact scan over a tenant\'s vectors is honest and cheap only while that tenant\'s chunk count stays small enough to read on the query.',
    },
    evening: {
      title: 'What you tell the product owner',
      why: 'The owner will hear "semantic search" and expect the current document and the right document. You owe them the two limits the system actually has: freshness and false neighbors.',
      explain: `Freshness is the delay from a published or deleted source to the index that serves queries. If the embed job runs every fifteen minutes and the index picks up the new segment after that, a new article is invisible for that long, and a deleted article can still be retrieved until the tombstone is visible. Say the number you operate, not "near real time." Also say whose write is covered. An edit in the source store is not a write to the index.

False neighbors are the other limit. The nearest vector can be the wrong paragraph: shipping policy next to refund policy, because the embedding puts them close, or because the walk never visited the true neighbor. At a recall of about nine in ten, one true top-ten chunk is missing on average, and some of the ten you return are merely near. The product must show the source text and must not treat the first hit as a fact. You cannot promise "the answer." You can promise candidates from this tenant's index as of a given age, with a measured recall, and a hydration step the owner can inspect.`,
      question:
        'A product owner wants the help center search to "just return the right article." What freshness limit and what false-neighbor limit do you tell them, in numbers they can hold you to?',
      hints: [
        'Name the embed interval and the fact that deletes survive until the index applies them.',
        'Recall below one means a true neighbor can be absent, even before the embedding is wrong.',
      ],
      outline: [
        'A new or edited article is missing until the embed job and the index refresh finish.',
        'Put a number on that lag from the job you actually run.',
        'Recall around nine in ten means a true top result can be missing.',
        'The UI must show sources, because a near vector is not a guaranteed article.',
      ],
      solution: `Tell them the index is as fresh as the pipeline, not as fresh as the publish button. If embedding and segment refresh take fifteen minutes, say fifteen minutes. An article published at 3:00 can be missing at 3:10. An article deleted at 3:00 can still be retrieved at 3:10 and then quoted. If that is unacceptable for a legal policy, the publish path has to wait for the index or the old chunk has to be filtered by version at query time. Do not describe the lag as a rare bug.

Tell them the neighbors are approximate and semantic. On an evaluation set, if nine of the ten true chunks come back, one is missing even when the embedding is doing what it was trained to do. Some returned chunks will be the adjacent policy, not the one the user needed. The screen should show the retrieved passages and the titles. The owner should not write a requirement that the top hit is correct. The requirement you can accept is: candidates from this tenant, older than the pipeline lag only in the sense that they lag by at most that lag, with recall measured on a set you can re-run when the index is rebuilt.`,
      rubric: [
        'Freshness is a concrete pipeline delay, including deletes that remain retrievable until the index catches up.',
        'The false-neighbor limit is a recall short of exact, plus near-but-wrong chunks, with the UI showing sources.',
      ],
      myth: [
        'If the embedding model is good, the nearest vector is the right document and it is current.',
        'The model does not decide freshness. The index does. Approximate search can miss the true neighbor even when the vectors are excellent.',
      ],
      context:
        'This is the conversation that prevents a launch requirement of "never show a deleted article" on a pipeline that refreshes every quarter hour.',
      tradeoff: 'Waiting for the index on publish removes the freshness gap and puts the editor on the embedder\'s failure path. Searching anyway keeps publish fast and the results stale.',
      mistake: 'Promising the owner exact, current answers because a demo query returned the paragraph you expected.',
      followUp: 'Which limit moves if you re-embed the corpus and forget to rebuild the index?',
      extension: 'What would you measure weekly so the recall number does not rot?',
      alternative: 'Keyword search over the same chunks is stale only by the text index lag and fails on paraphrases instead of near vectors. Some articles want both, with the keyword hit as a check.',
    },
  },
  'multi-region-writes': {
    morning: {
      title: 'Two regions, one balance',
      why: 'If two regions accept writes to the same row, both writes are real before either region has seen the other. Replication does not merge them. You need a rule before the second write is allowed.',
      explain: `A user in one region debits an account. A user in another region debits the same account a moment later. Each region committed locally because each one was allowed to. When the replicas exchange the two debits, both cannot be "the" balance unless you have a rule: last write wins by a clock, the amounts add because they were deltas, a human merges them, or one of the writes is rejected. Without a rule, the row flickers to whichever replica delivered last, and a failover keeps a balance nobody computed on purpose.

The clock is part of the problem, not a solution you get for free. If last write wins and the regions' clocks disagree, the earlier real debit can carry the later timestamp and erase the other. A conflict is likely whenever both regions serve the same accounts. It is not a rare disaster. It is the ordinary overlap of two writers plus replication delay. The design work is to name the merge, or to stop having two writers. Hoping the users will not touch the same row is a bet on traffic, not a conflict story.`,
      question:
        'Both regions accept debits for account 18 before either replicate arrives. Why is "replicate the row" not enough, and what must exist before you allow the second writer?',
      hints: [
        'Each region has a committed debit the other has never seen.',
        'A timestamp comparison is a conflict rule, and clocks can order the debits backward.',
      ],
      outline: [
        'Each region commits a debit locally, so both writes are durable.',
        'Replication delivers two values and does not know the product rule.',
        'You need an explicit merge, a reject, or a single writer.',
        'Last-write-wins is one rule, and clock skew can keep the wrong debit.',
      ],
      solution: `Replication will happily deliver both rows. It will not tell you whether the balance should be the sum of the debits, the minimum, or the later one. If each region wrote an absolute balance, one debit disappears when its row is overwritten. If the product cannot say which, you do not have a design yet. You have two primaries and a race. The thing that must exist first is the conflict story: a commutative debit (store each debit as a delta with its own id), a rejection of the second writer, or a single region that is allowed to write account 18.

Last-write-wins is a story, and it is a bad one for a balance. The later timestamp replaces the row, so one spend is gone and the account can go below zero in real life while the stored number looks fine. Clock skew makes "later" disagree with the order the users experienced. Write the rule down before you turn on the second writer. If the rule is "we do not know how to merge a balance," the second writer stays off.`,
      rubric: [
        'Both debits are committed before replication, so copying the row overwrites or duplicates without a merge rule.',
        'A conflict story is required first: a real merge, a rejection, or one writer. Last-write-wins is identified as a lossy rule.',
      ],
      myth: [
        'Active-active replication means conflicts are handled by the database.',
        'The database can ship both versions. It does not know whether two debits add, cancel, or hide a bug. That rule is the product.',
      ],
      context:
        'The same hole exists for any row both regions update, including a profile and a feature flag. Balances are where the lost write becomes money.',
      tradeoff: 'Accepting writes in both regions cuts latency for each user and forces a merge you have to test. Refusing the second writer adds a cross-region hop and keeps one log.',
      mistake: 'Enabling a second writer because the replica was already there, with no rule for the same account.',
      followUp: 'If each debit is stored as its own row with a unique id, what conflict remains on the balance?',
      extension: 'How does clock skew reverse a last-write-wins outcome the users could see?',
      alternative: 'Pinning each account to a home region gives that account one writer and still lets two regions accept writes for different accounts. The conflict story is then only for the wrong pin.',
    },
    evening: {
      title: 'One writer for the ledger',
      why: 'A conflict story you cannot explain to a customer is not worth the latency you saved. A ledger is that case. One region writes. The other forwards or refuses.',
      explain: `Two regions writing the same balance need a merge that preserves "you cannot spend the same unit twice." A timestamp does not do that. A sum of deltas can, if every debit has a globally unique id and a check against the running total that both regions agree on, which is most of a consensus protocol wearing a different hat. If you do not have that, do not take the write in the second region.

Choose a single writer region for the ledger. The other region accepts the HTTP request and forwards the debit, or it rejects writes and serves reads only. The user far from the writer pays a cross-region round trip on every debit. Writes stop when the writer region stops, even if the read region is up. That outage is smaller than a weekend of reconciling two captured spends. Reads can stay local and stale, if the product allows a balance that lags. The write path does not.`,
      question:
        'The team wants both regions to accept debits so European users avoid a cross-region hop. Why do you refuse, and what does the far region do with a debit instead?',
      hints: [
        'A merged balance is not a defined outcome for two spends of the last unit.',
        'Forward the write to the single writer, or reject it. Do not commit it locally.',
      ],
      outline: [
        'Two local commits can both spend the last unit before either replicates.',
        'You refuse because there is no merge you can show a customer.',
        'The far region forwards the debit to the writer region, or it rejects writes.',
        'The cost is write latency and a writer-region outage that stops all debits.',
      ],
      solution: `Refuse the second writer. If both regions commit a debit of the last 10 units, replication has two successes and the account is 10 overdrawn in the world, whichever row you keep. Last-write-wins hides one debit and keeps the charge. A handmade merge will not invent the customer's consent. The conflict story is not worth a shorter round trip.

The European request is forwarded to the writer region and committed there, then replicated back for local reads. The user waits on that hop. If the writer is unreachable, the debit fails closed. You do not queue it locally and commit it later, because that is a second writer with extra steps. Reads of the balance can come from the local replica with a lag you name. A screen that says "available to spend" must read fresh enough to match the writer, or it will offer money the forwarded debits have already taken. The assumption that would revive multi-region writes is a per-debit id and a single ordered log, which is one writer again, just described geographically.`,
      rubric: [
        'Multi-region debits are refused because both regions can spend the last unit before replication.',
        'The far region forwards the debit or rejects it, and a local commit is explicitly not allowed.',
      ],
      myth: [
        'If we replicate quickly, two writer regions will not conflict on the same account.',
        'Quick replication shrinks the window. It does not close it. Two commits inside that window are both durable.',
      ],
      context:
        'Read replicas in the second region are still useful. The mistake is promoting them to writers to save a hop on the debit path.',
      tradeoff: 'One writer region adds cross-region latency to every far debit and gives you one commit order. Two writers remove the hop and the order.',
      mistake: 'Letting the far region commit "temporarily" when the writer times out, then reconciling charges by hand.',
      followUp: 'The writer region is down. What does the far region return on a debit, and what can it still serve?',
      extension: 'Which read of the balance is allowed to use the local replica?',
      alternative: 'Home-region pinning gives each account one writer, which may be the nearer region. You still forbid two writers for one account, and a move of the home region is a rebalance with a fence.',
    },
  },
  'conflict-resolution': {
    morning: {
      title: 'Drop the other write, or merge it',
      why: 'Last-write-wins is a conflict policy. It keeps one version and deletes the other. A merge the application understands is a different policy, and it is only available when the product can say how two edits combine.',
      explain: `Last-write-wins picks the version with the greater timestamp or version number and discards the rest of the losing write. It needs no knowledge of the fields. That is why it is easy and why the loss is silent. The discarded edit is not stored unless you kept it on purpose. If the "later" clock is skewed, the edit the user made last in real life is the one thrown away.

A merge uses the type. A shopping cart can union the line items by sku and add quantities, because two devices adding milk is milk twice, not a choice of one cart. A counter can sum deltas if each delta has an id. A document of independently edited fields can keep each field from the version that changed it, and can surface a real conflict when both sides changed the same field. The application has to know which of those is true. There is no generic merge for "a row." If you cannot write the combine function, you do not have a merge. You have last-write-wins under a longer name.`,
      question:
        'Two devices edit the same cart while offline. One adds milk. The other adds bread and removes eggs. Compare last-write-wins with a merge for this cart. Which fields survive in each?',
      hints: [
        'Last-write-wins keeps one whole cart and drops the other edit entirely.',
        'A line-level merge can keep milk and bread and apply the egg removal if you know which edit happened to which sku.',
      ],
      outline: [
        'Last-write-wins retains only the cart with the later timestamp.',
        'The other device\'s add or remove disappears with no conflict shown.',
        'A merge keyed by sku keeps milk and bread and applies the egg deletion.',
        'The merge is possible because line items combine. It is not a generic row rule.',
      ],
      solution: `Under last-write-wins, the cart with the later timestamp replaces the other. If the bread device stamps later, milk is gone. If the milk device stamps later, bread is gone and eggs are back, because the removal lived only on the losing cart. The user who loses does not get a prompt. They get a cart that forgot their edit. A skewed clock decides which shopper that is.

A merge the application understands treats each sku as its own fact. Milk was added on one device, bread on the other, eggs removed on one of them. The combined cart contains milk and bread and does not contain eggs, as long as the egg removal is a delete of that sku and not a rewrite of the whole list. If both devices changed the quantity of milk, the merge has to add deltas or ask the user. That rule is the product. Last-write-wins is what you have left if the only representation you stored is the full cart blob and a single timestamp.`,
      rubric: [
        'Last-write-wins keeps one entire cart, so either milk or the bread-and-egg edit is lost.',
        'The merge is per sku, so milk, bread, and the egg removal can all survive, with a rule for two quantity edits.',
      ],
      myth: [
        'Last-write-wins is not data loss. It is the latest user intent.',
        'It is one device\'s whole version, chosen by a clock. The other device\'s intent is discarded even when the edits touched different items.',
      ],
      context:
        'Offline clients make this ordinary. Each device committed locally. The server sees the conflict only when the second version arrives.',
      tradeoff: 'A field-level merge keeps more edits and requires a combine rule you have to test. Last-write-wins is one comparison and a silent drop.',
      mistake: 'Storing the cart as one JSON blob with one updated_at, then wishing for a line-item merge you cannot compute.',
      followUp: 'Both devices set the quantity of milk. What does the merge do if you stored absolute quantities instead of deltas?',
      extension: 'What do you show the user when the same sku was deleted on one device and incremented on the other?',
      alternative: 'Rejecting the second write and forcing a reload avoids a merge and loses offline edits that never got a chance to apply. It fits a cart that is always online.',
    },
    evening: {
      title: 'The sentence that disappeared',
      why: 'Last-write-wins becomes visible when a person looks for their edit and finds the other version with no error and no conflict marker. The clock did not feel like a delete key. It was one.',
      explain: `Two caregivers share a note for a pickup. The phone sets the text to "Lee is sick. Do not carpool." and saves. The laptop, which still has the morning text "Pick up at 3," was offline, then reconnects. Its save carries a timestamp ahead of the phone because the laptop clock is fast, and the body is the old sentence plus a line "bring the permission slip." Last-write-wins keeps the laptop version because the timestamp is greater. The sickness sentence is gone. The screen shows a normal note. There is no banner that says an edit was dropped.

That is the user-visible loss. The next caregiver carpools. Nothing in the API response said the save from the phone was overwritten. A merge that understood the note as text could have kept both sentences and asked a human about the overlap. Last-write-wins cannot, because it already threw the phone version away. The bug is not that replication was slow. The bug is the policy that resolved the conflict by deletion.`,
      question:
        'The phone saves "Lee is sick. Do not carpool." The laptop then syncs an older sentence with a faster clock, and last-write-wins keeps the laptop. What does the next reader see, and what was lost?',
      hints: [
        'The winning version is the one with the greater timestamp, not the one saved last in real life.',
        'The reader sees an ordinary note. The dropped sentence is not returned as an error.',
      ],
      outline: [
        'The laptop clock makes the stale body look newer.',
        'Last-write-wins stores the laptop text and drops the sickness warning.',
        'The next reader sees the permission-slip note and no conflict.',
        'The loss is the warning, and the product gave no signal that it was discarded.',
      ],
      solution: `The next reader sees "Pick up at 3" and "bring the permission slip." They do not see "Lee is sick. Do not carpool." The carpool happens. The phone user can open the note, observe that their sentence is missing, and have no version history to restore it from, if last-write-wins did not retain the loser. The API returned success to both saves. Success meant "your write was accepted into the conflict," not "your write is what readers will see."

This is the loss last-write-wins causes on a whole-document timestamp. The edits were not even mutually exclusive. The laptop added a sentence. The phone replaced the body with a warning. A policy that keeps one blob cannot keep both, and a skewed clock chooses the blob that omits the warning. If the note stored operations, or if a conflict left both versions for a person to reconcile, the warning would still be on screen. Do not call this a rare clock bug. The clock only decided the direction. The policy decided that one of the two sentences would be destroyed.`,
      rubric: [
        'The reader sees the laptop text, and the sickness warning is gone with no error shown.',
        'The cause is last-write-wins on a whole document, helped by a fast laptop clock, not a failed save.',
      ],
      myth: [
        'The user would have seen an error if their edit was not the one that stuck.',
        'Both saves succeeded. The losing edit is deleted by the conflict rule, and a normal read returns only the winner.',
      ],
      context:
        'Shared notes, address books, and access-control documents have the same shape. A dropped sentence in an access rule resurrects a permission instead of a carpool.',
      tradeoff: 'Keeping the losing version for a manual merge avoids the silent delete and makes every conflict a product surface you must design.',
      mistake: 'Telling the phone user their app failed to save, and asking them to type the warning again into a note that may overwrite the laptop next.',
      followUp: 'What do you retain so support can put the sickness sentence back?',
      extension: 'The same policy is used on a document that includes an "access revoked" flag. What does a losing revoke allow?',
      alternative: 'Field-level last-write-wins would still drop the phone\'s text if the body is one field. It only helps when the laptop and the phone edited different fields.',
    },
  },
  'read-your-writes-regions': {
    morning: {
      title: 'The next read has to see the save',
      why: 'A user who saves and then reads can be sent to a replica that does not have the save yet. Read-your-writes is a routing promise for that user, not a stronger consistency model for everyone else.',
      explain: `After a write commits in the writer region, other regions apply it later. A load balancer that sends the next GET to a different region can read the old row. The user thinks the save failed. The fix is to pin that user, not the whole product. Pin the session to the writer region for a short time after a write, or hand the client a token that names the log position of their write. The next read must go to a replica that has applied that position, or it must go to the writer until one has.

The token is per user or per session. Other users can keep reading locally and can miss this save for the replication lag. That is a different promise. Sticky routing without a token fails when the sticky cookie is lost or when the user changes networks and the balancer picks a new region. The token still works, because the requirement travels with the request. A pin to a region works only while that region still has the data and the balancer honors the pin.`,
      question:
        'A profile save commits in the writer region. The next read must show the new bio to that user, even if you normally serve reads from a nearby replica. What do you pin, and what do other users still tolerate?',
      hints: [
        'The pin or the token is for the writer of this save, not for every reader of the profile.',
        'A token names a log position. A region pin names a place that already has the write.',
      ],
      outline: [
        'The save returns a token for its log position, or sticks the session to the writer.',
        'The next read from this user waits for that position or hits the writer.',
        'A nearby replica is allowed only after it has caught up to the token.',
        'Other users may still see the old bio until replication catches up.',
      ],
      solution: `Pin the writer, not the crowd. On the save response, return a token that carries the log position, and send this session's reads to the writer region until a local replica advertises that position. If you cannot pass a token, pin the session to the writer region for longer than your normal replication lag, and honor the pin even when another region is closer. The user's GET then sees the bio they just saved.

Other readers are not covered. A friend loading the profile from a third region can see the old bio until replication. Do not upgrade the whole read path to the writer to avoid building the token. You would spend the writer's capacity on everyone to keep a promise you only made to the saver. Also do not pin only by datacenter cookie if the client drops it. The token in the client, sent on the following GET, is the requirement that survives a new connection.`,
      rubric: [
        'The saver is pinned by session or by a log-position token so their next read sees the bio.',
        'Other users are explicitly allowed to see the old bio until replication.',
      ],
      myth: [
        'Read-your-writes means every replica is synchronous, so any region can serve the next read.',
        'It means this user\'s next read observes this user\'s write. Other replicas can still be behind for everyone else.',
      ],
      context:
        'The token is the same idea as a read-after-write barrier inside one database, carried across a load balancer that does not know the log.',
      tradeoff: 'Pinning writers to the primary protects the next read and concentrates their traffic. A token lets them return to a local replica the moment it catches up.',
      mistake: 'Setting a session cookie to the nearest region on every request, including the request right after a save.',
      followUp: 'The pinned writer region fails before the local replica catches up. Where does this user read?',
      extension: 'What does the client send on the GET so a new connection still sees the save?',
      alternative: 'Reading always from the writer satisfies the promise and makes every region\'s users pay the writer\'s latency, including users who have not written anything.',
    },
    evening: {
      title: 'Saved, routed, and stale',
      why: 'The bug report is "save does nothing." The save worked. The next request landed on a replica that had not applied it, and the user wrote again.',
      explain: `The user posts a comment. The writer region commits it and returns 201. The following GET is routed to another region because the balancer prefers geography and the session pin was never set. That replica is two seconds behind. The comment list does not include the new comment. The user posts it again. You now have two comments, or you have one comment and a user who no longer trusts the button.

Walk the times. The commit's log position had not reached the replica at the moment of the GET. The 201 did not change the balancer's mind. Nothing on the read path compared the replica's position with the write the user just performed. The stale page is the bug. The duplicate comment is the user reacting to it. Fix the route for that user. Do not tell them the list is cached and they should refresh, unless the client actually retries the read against the token.`,
      question:
        'A user saves a comment, gets a success, and the next page load from another region is missing the comment. They save again. What failed, and what should the second save have found?',
      hints: [
        'The 201 committed in the writer region. The GET did not go there and did not carry a position.',
        'The second save should have been a retry of the same comment id, not a new insert, once the first read had been made fresh.',
      ],
      outline: [
        'The comment is committed in the writer region before the user is routed away.',
        'The other region serves a replica that has not applied it.',
        'The user sees a stale list and submits a second comment.',
        'A token or a pin would have made the first reload show the comment.',
      ],
      solution: `The read failed the user, not the write. The comment was durable before the 201 returned. The GET ran against a replica that had not reached that log position, because routing optimized for region and nobody attached the write's position to the session. The page is stale by the replication lag, here a couple of seconds, which is long enough to redraw and long enough for a second submit.

The second save should have found the first comment. Either the reload reads from the writer, or it carries the position and waits until the local replica has it, so the user sees the comment and does not submit again. If they do submit again, an idempotency key on the comment stops the duplicate even when the screen was stale. Use both. The key covers the double submit. The pin covers the lie on the screen. Showing a cached list with no token is what trained the user to tap twice.`,
      rubric: [
        'The comment commit succeeded, and the GET to the other region observed an older log position.',
        'The remedy is a pin or a token on that user\'s next read, with idempotency so the second tap is not a second comment.',
      ],
      myth: [
        'A 201 means the next GET from any region will include the new row.',
        'The 201 means the writer committed. Other regions include the row only after they apply it, and the balancer does not wait unless you make it.',
      ],
      context:
        'This shows up at the boundary of regions and also at the boundary of a primary and a local read replica. The geography makes the lag easier to hit. It is not a different bug.',
      tradeoff: 'Routing every post-write read to the writer removes the stale page and adds cross-region latency to that one user. Serving the local replica without a token keeps the latency and creates the duplicate.',
      mistake: 'Adding a client retry of the POST because the following GET did not show the comment.',
      followUp: 'How long can the pin last before a local replica is safe for this user?',
      extension: 'What does the comment list show to a different user in the stale region during those two seconds?',
      alternative: 'Blocking the 201 until every region has applied the comment removes the stale read and makes the writer wait on the slowest region for every comment.',
    },
  },
  'rebuild-derived': {
    morning: {
      title: 'Rebuild from the source, then catch up',
      why: 'A cache, an index, or a projection can be wrong while the source of truth is fine. The rebuild has to copy the source at a named position and then include the writes that happened during the copy.',
      explain: `Pick the source. For the product search index, the source is the product table, not the old index. A rebuild that reads the old index copies the bug you are trying to leave behind. Record a log position, or open a snapshot transaction whose position you know. Scan the table in primary-key order and write new documents to a new index. Do not overwrite the index that is serving queries.

Writes during the scan are not in the snapshot, or they are partially in it if you scanned without one. After the scan, tail the log from the recorded position and apply those changes to the new index. Some snapshot rows will also appear in the log. The apply has to be idempotent. When the new index is close to the head of the log, dual-read or compare counts, then switch reads. Keep the old index until the new one has served real queries. If you switch first and catch up later, search misses every product written during the scan.`,
      question:
        'The search index is missing updates from a bad deploy. How do you rebuild it from the product table without losing writes that happen while you scan, and when do you switch reads?',
      hints: [
        'Record the log position before or as you snapshot, then tail from there.',
        'Build into a new index. The serving index stays until the new one has caught up.',
      ],
      outline: [
        'Snapshot the product table at a recorded log position.',
        'Fill a new index from that snapshot in key order.',
        'Tail the log from that position so writes during the scan land in the new index.',
        'Switch reads only after the new index is near the log head, and keep the old one for rollback.',
      ],
      solution: `Start a snapshot and record its log position. Scan products by primary key into a new index that does not take live traffic. When the scan finishes, consume the log from that position and upsert or delete documents, using the same idempotent apply you use for ordinary indexing. A product edited during the scan is refreshed by its log record. A product created after the snapshot appears only in the log, so skipping the tail would omit it.

Switch reads when the new index's position is within the lag you already accept for search, not when the scan loop exits. Compare a count or a sample of ids against the source before the switch. Leave the old index in place so a bad rebuild is a switch back, not a second full scan under incident pressure. Do not "rebuild" by updating documents inside the live index from a scan that has no position. You cannot tell which live updates the scan overwrote with stale snapshot rows.`,
      rubric: [
        'The rebuild scans a snapshot at a log position into a new index, then tails from that position.',
        'Reads switch only after catch-up, and the old index remains available to switch back.',
      ],
      myth: [
        'Rebuilding an index means reading the current index and writing it out again in a cleaner format.',
        'The current index is the derived copy. The rebuild has to read the source of truth, or it preserves the missing updates.',
      ],
      context:
        'The same plan fits a cache that can be refilled from the table and a projection that can be folded from an event log. The log position is what makes the scan and the live writes one sequence.',
      tradeoff: 'Building a second index costs capacity and makes the switch atomic. Rebuilding in place saves the disk and can serve a mix of old and new documents halfway through.',
      mistake: 'Truncating the live index and then scanning, so queries fail or return empty for the length of the rebuild.',
      followUp: 'A product is deleted after it was scanned and before the tail runs. How does the new index learn the delete?',
      extension: 'What do you compare before the switch so a partial scan cannot take traffic?',
      alternative: 'Replaying only the log from position zero, with no snapshot, rebuilds the index if the log still has every change. Most operational logs do not go back that far, which is why the snapshot exists.',
    },
    evening: {
      title: 'The rebuild that saturates the source',
      why: 'A rebuild is a full read of the source. Done at disk speed, it is an incident for the writes that share that disk. The estimate tells you how far to throttle.',
      explain: `The product table holds 100 million rows, about 1 kilobyte of useful columns each. That is 100 million kilobytes, or about 100 gigabytes, which is 100,000 megabytes. If the rebuild reads at 200 megabytes a second, the scan takes 100,000 / 200 = 500 seconds, a little over eight minutes. Those eight minutes are a full-speed sequential read on the database the checkout path also uses. Cache eviction and replica lag move immediately.

Throttle to 20 megabytes a second and the same 100,000 megabytes take 100,000 / 20 = 5,000 seconds, about 83 minutes. Checkout keeps the disk. You pay with a longer rebuild. Batch by primary-key ranges, for example a few thousand rows at a time, and pause when source CPU, replica lag, or checkout latency crosses a line you set before you start. Do not run many range workers that add up to the 200 megabyte pace you just rejected. Parallelism is not free capacity. It is the same disk.`,
      question:
        'A rebuild must read 100 million product rows at about 1 kilobyte each from the live database. How long is an unthrottled scan at 200 MB/s, and what limit keeps checkout usable?',
      hints: [
        '100 million kilobytes is about 100 gigabytes, which is 100,000 megabytes.',
        'Divide that by the read rate. Then pick a slower rate and pause on lag, not only on a timer.',
      ],
      outline: [
        'The scan is about 100 GB, or 100,000 MB.',
        'At 200 MB/s it finishes in about 500 seconds and saturates the source.',
        'At 20 MB/s it takes about 5,000 seconds, near 83 minutes.',
        'Pause on CPU, replica lag, or checkout latency, and do not parallelize back to full speed.',
      ],
      solution: `Unthrottled, 100,000 megabytes at 200 megabytes a second is 500 seconds, about 8 minutes. That is the length of a checkout incident if the table shares disks with the writer. The index would be rebuilt and the source would be the thing that paged you. Throttle the reader to 20 megabytes a second. 100,000 / 20 is 5,000 seconds, about 83 minutes. Spread it in primary-key batches so you can stop between batches.

The stop condition is the source, not the index. If replica lag climbs past a couple of seconds, or checkout latency moves, pause the scan even if you are under 20 megabytes a second. Resume when it recedes. Cap concurrency at one scan. Ten workers at 20 megabytes a second are the original 200. Write the documents to the new index from a process that is not the database, so the source only pays the read. Eighty-three minutes of background read is a maintenance window you can explain. Eight minutes at disk speed is an outage you scheduled by accident.`,
      rubric: [
        'The volume and both durations are computed: about 500 seconds unthrottled and about 5,000 seconds at 20 MB/s.',
        'The throttle is enforced with a pause on source lag or latency, and parallel workers are not allowed to multiply it away.',
      ],
      myth: [
        'A rebuild is safe because it only reads, and reads do not affect writes.',
        'A full-speed read evicts cache and saturates the disk the writes need. The writes then stall behind a job that is not even on the user path.',
      ],
      context:
        'The same arithmetic applies to refilling a cache from a table or replaying a projection. The constant that changes is the row size and whether the source is the primary or a replica you can afford to lag.',
      tradeoff: 'Throttling protects checkout and leaves the bad index in service for the extra hour. Running full speed fixes search and spends the database.',
      mistake: 'Launching one worker per partition with no shared byte budget, then calling the rebuild throttled because each worker has a sleep.',
      followUp: 'What do you watch in the first minute to decide the 20 MB/s cap is still too high?',
      extension: 'How does the estimate change if you read from a replica instead of the primary?',
      alternative: 'Restoring a source snapshot to a separate warehouse and scanning that protects the live disk and rebuilds from whatever time the snapshot was taken, so the log tail from that time still has to run.',
    },
  },
  'consistency-choice': {
    morning: {
      title: 'The comment does not need a global order',
      why: 'A stronger consistency model is a cost on every read and write that uses it. Pick the model for one action, and reject a stronger one when the product already tolerates the weaker anomaly.',
      explain: `Take posting a comment. The author must see their comment on the next read. That is read-your-writes for that user, backed by a token or a pin to the writer. Everyone else must see the comment soon, on the order of replication lag, not inside one global total order. Eventual delivery to other regions is enough. A linearizable read of the comment thread, the kind that would make every viewer observe the same latest comment as a quorum or as the primary, would put every thread view on the writer or on a cross-region quorum.

Reject that stronger model for the viewer. The product already has a refresh button and a lag of seconds on other people's comments. Paying a cross-region quorum on every view spends latency and availability on an anomaly the screen does not treat as a bug. Keep the stronger guarantee where the action is the author's own save. Do not "upgrade the thread to strong consistency" because the setting was available on the table. The choice is per action.`,
      question:
        'For a comment post, which consistency do you give the author, which do you give other readers, and which stronger model do you reject for the readers?',
      hints: [
        'The author has to observe their own write on the next load.',
        'A linearizable read for every viewer would pin the thread to a quorum or the primary.',
      ],
      outline: [
        'The author gets read-your-writes via a token or a writer pin.',
        'Other readers get the comment after ordinary replication lag.',
        'Reject linearizable reads for every thread view.',
        'The rejection stands because a refresh already tolerates seconds of lag.',
      ],
      solution: `Give the author read-your-writes. The post returns the log position, and the author's next load uses it. Give other readers eventual consistency bounded by replication lag. Their thread can be a replica. Do not give them a linearizable read. That would mean each view contacts a quorum or the writer so that no reader is behind the latest comment, which is a stronger model than this screen needs.

The cost you refuse is that quorum on a read-heavy page. A thread view is allowed to miss a comment that was committed a second ago in another region. A stock decrement is not the same action and does not inherit this choice. If someone later asks for "strong consistency" on the comments table, split the answer by action. The save is stronger for its author. The view is weaker for everyone else. One database setting for the table would smear the expensive choice across both.`,
      rubric: [
        'The author gets read-your-writes, and other readers are allowed to lag.',
        'Linearizable or quorum reads are rejected for ordinary thread views, with the reason that the product already tolerates refresh lag.',
      ],
      myth: [
        'The safest choice is the strongest consistency model the database offers, applied to the whole table.',
        'The strongest model taxes every reader. Apply it to the action that breaks if the anomaly happens, and not to the view that already refreshes.',
      ],
      context:
        'This is a product decision recorded as a consistency model. "We chose strong" is not a decision until you name the action and the model you refused.',
      tradeoff: 'Eventual reads for viewers keep the thread fast and let two readers see different threads for a few seconds. A quorum read removes that window and adds a dependency on the far region.',
      mistake: 'Turning on linearizable reads for the comment table because the author once saw a stale copy of their own post.',
      followUp: 'Which action on this same product still needs a conditional write on one row?',
      extension: 'What does the viewer\'s model cost you the moment the writer region is unreachable?',
      alternative: 'Serving every thread from the writer gives read-your-writes to everyone and makes view traffic scale with the writer, which is the cost you rejected.',
    },
    evening: {
      title: 'The reply that ignored the new comment',
      why: 'The consistency you picked is real only if you can write the anomaly a user can see. If you cannot describe it, you do not know what you accepted.',
      explain: `You accepted this: a reader in another region loads the thread in the same second the author posts "meet at 3," and the replica has not applied it. The reader sees the old thread and replies "what time?" The author sees both comments and thinks the reader ignored them. No error is shown. Refreshing a few seconds later shows "meet at 3," and the reply is already attached above it or beside it, looking out of order to a person who assumes a global sequence.

You did not accept the author missing their own "meet at 3." If the author sees that, the token or the pin is broken, and that is a bug against the model you chose. You also did not accept a lost comment. The reply is durable. It is only uninformed. Write the anomaly in a sentence a support agent can use, including the lag you think is normal, so "a few seconds of cross-region lag" does not get filed as data loss.`,
      question:
        'You chose lagged reads for everyone except the author. Write the user-visible anomaly you accepted, and write the stale read that would still be a bug.',
      hints: [
        'The accepted case is another person acting on a thread that does not show the latest comment yet.',
        'The author missing their own comment violates read-your-writes and is not the accepted anomaly.',
      ],
      outline: [
        'A remote reader does not see "meet at 3" and replies "what time?"',
        'Both comments exist. The reply looks like it ignored the author.',
        'That window is the replication lag you accepted.',
        'The author failing to see their own comment is a bug, not this anomaly.',
      ],
      solution: `The anomaly you accepted is a reader who acts on a stale thread. They do not see "meet at 3," they post "what time?", and for a few seconds, or however long replication takes, the conversation looks like they ignored the author. Both writes succeeded. A later load shows the meeting time. Support should explain lag, not restore data. The UI can reduce the confusion by ordering on the writer's timestamps once both comments are present, but it cannot prevent the reply from being composed against the old page.

The bug you did not accept is the author loading the thread and not seeing "meet at 3" after a success response. That means their read ignored the token. It is not covered by "eventual." Neither is a comment that never arrives on any replica. Eventual here means late, not optional. If you cannot bear the "what time?" reply, you picked the wrong model this morning, and the fix is a fresher read for the composer of a reply, not a slogan about strong consistency on every list view.`,
      rubric: [
        'The accepted anomaly is a second user replying without having seen the new comment because of replica lag.',
        'The author missing their own comment is classified as a bug against read-your-writes, not as the accepted anomaly.',
      ],
      myth: [
        'Eventual consistency means some comments may never show up, and users should expect that.',
        'Eventual means late, after replication. A comment that never arrives, or an author who cannot see their own save, is a different failure.',
      ],
      context:
        'Writing the anomaly down is the test that the morning\'s choice was about a user and not about a database setting. If the sentence sounds like an outage, the choice was too weak.',
      tradeoff: 'Accepting the stale reply keeps thread reads off the writer. Preventing it means the reply composer must read at the author\'s position, which is a stronger read on that one action.',
      mistake: 'Filing the "what time?" reply as a lost comment and replaying the author\'s post into a duplicate.',
      followUp: 'What would you change if product later forbids replying until the latest comment is visible?',
      extension: 'How long a lag would make you revisit this choice: two seconds, or two minutes?',
      alternative: 'Taking a quorum read when the user focuses the reply box, and a stale read for passive scrolling, narrows the anomaly to people who reply from a half-loaded screen.',
    },
  },
};
