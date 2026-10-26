import type { LessonPair } from './publish';

export const distributedLessons: Record<string, LessonPair> = {
  'partial-failure': {
    morning: {
      title: 'A timeout after half the work',
      why: 'One call can change two records and then vanish. The caller is left with a timeout, which does not say how much of the work is already true.',
      explain: `Partial failure means some effects of a call become durable and the caller never hears which ones. The refund service receives one request for three line items. It completes the card refund for line 1. It completes the card refund for line 2. The process then stops before line 3 and before it writes a status line. The caller waits out its deadline. There is no HTTP status and no body.

The caller cannot reconstruct the prefix from the timeout. Zero refunds, two refunds, and three refunds all look like the same silence. A later retry that starts from scratch can refund line 1 again. A screen that says the refund failed can leave two refunds in place with nobody looking for them. The response did not partially arrive. The work the response was supposed to report partially happened.`,
      question:
        'A caller asks for refunds of line 1, line 2, and line 3 in one request. The service refunds line 1 and line 2 at the card processor, then dies before line 3 and before any response bytes. What succeeded, and why can the caller not tell?',
      hints: [
        'The card processor has already moved money for the lines that finished.',
        'A timeout has no body, so it does not list the prefix that completed.',
      ],
      outline: [
        'Line 1 and line 2 were refunded before the process stopped.',
        'Line 3 has no refund, and no status line was written.',
        'The caller observes only a timeout, which matches zero, two, or three refunds.',
        'The missing response is why the caller cannot name the prefix.',
      ],
      solution: `Line 1 and line 2 succeeded at the card processor. That money has moved. Line 3 has not been refunded, because the process stopped first. No status line and no response body were sent, so nothing on the wire lists that prefix.

The caller cannot tell because every unfinished prefix produces the same timeout. The caller did not receive "two of three." It received silence. Guessing failure will hide two real refunds. Guessing success will pretend line 3 moved. The honest description of this call is that some of the intended work happened and the set is unknown until something reads the card processor by an id the caller already chose.`,
      rubric: [
        'Line 1 and line 2 are named as done, and line 3 is named as not done.',
        'The caller is stuck because the timeout carries no prefix, not because the service returned an error code.',
      ],
      myth: [
        'A timeout means the whole request rolled back and nothing changed.',
        'The timeout means the caller stopped waiting. Refunds that already reached the card processor stay refunded.',
      ],
      context:
        'This is the gap between a handler commit and a response, stretched across several effects inside one call. Logs on the server can show two refunds while the client shows a spinner that gave up.',
      tradeoff: 'Doing all three refunds before acknowledging is faster to code and leaves a wider unknown prefix when the process dies.',
      mistake: 'Showing the user a clean failure and offering an immediate second refund of all three lines.',
      followUp: 'What would be different if the service had written "line 1 and line 2 done" and the connection died during that body?',
      extension: 'Which of the three refunds can still land after the caller has already timed out?',
      alternative: 'Returning a stored result for a client-generated refund id on the next call does not shrink the first timeout. It gives the caller a way to learn the prefix instead of guessing it.',
    },
    evening: {
      title: 'The caller treats the result as unknown',
      why: 'After a timeout, the next move is a lookup the caller can repeat. Treating the call as failed or as finished both invent a fact the timeout did not contain.',
      explain: `The caller is the only place that can choose the next move, and it has to choose without a verdict. Give the work a client-generated id and send that id on the first call. When the deadline fires, leave the user on "still confirming" and read by that id. A full record means the call finished. A missing record means the retry can use the same id. A half-built record means the caller continues only the missing step.

A second id would start a second piece of work beside whatever the first call managed to do. A banner that says the call failed will be wrong if the first call is still completing. The read is the move that replaces both guesses. If the read also times out, the state stays confirming. Silence is not a license to start over.`,
      question:
        'The workspace client calls provision(workspace id w-14), which creates a project and then a billing account. The call times out. Design the caller next move without treating w-14 as fully failed or fully finished.',
      hints: [
        'w-14 was chosen by the caller, so a retry and a read can refer to the same attempt.',
        'The screen can say the provision is still confirming while the read is unanswered.',
      ],
      outline: [
        'Keep w-14. Do not allocate a second workspace id after the timeout.',
        'Read the workspace by w-14 before creating anything else.',
        'If both the project and the billing account exist, show that record.',
        'If only the project exists, create the billing account under w-14. If neither exists, retry provision with w-14.',
      ],
      solution: `The caller keeps w-14 and does not decide yet. It shows "still confirming" and calls a read for w-14. If the read returns a project and a billing account, the caller shows that workspace. The timed-out call had finished. If the read returns a project and no billing account, the caller creates only the billing account, again with w-14, and does not create a second project.

If the read says there is no such workspace, the caller sends provision again with the same w-14. The server has to treat that id as the identity of the work, so a retry after a lost response returns the original workspace instead of a twin. If the read times out too, the caller stays on "still confirming" and repeats the read. It does not show a failure page, and it does not show a finished workspace. Both of those would turn an unknown prefix into a fact.`,
      rubric: [
        'The next move is a read or a same-id retry, and the UI stays unknown until that read returns.',
        'A partial record continues only the missing billing account, and a second workspace id is not created.',
      ],
      myth: [
        'If the client gave up, the server cannot have created the project.',
        'The client deadline and the server effects are different clocks. The project may exist before the client decides the call is over.',
      ],
      context:
        'The same pattern shows up in any button that times out at two seconds while the server keeps working. The button needs an id it can look up, or every retry is a new workspace.',
      tradeoff: 'Staying on "confirming" is honest and annoying. Jumping to a failure page is quick and sometimes wrong.',
      mistake: 'Generating w-15 because w-14 timed out, and then billing both.',
      followUp: 'What should the screen do if the read shows a project whose billing account is still listed as in progress?',
      extension: 'How does the server respond if provision(w-14) arrives while the first attempt is still creating the project?',
      alternative: 'A server-generated id returned in the first bytes, before the work, also gives the caller something to read. It fails when the connection dies before those bytes, which is why the client-generated id is the sturdier handle.',
    },
  },
  'failure-detection': {
    morning: {
      title: 'A timeout is a local guess',
      why: 'The caller cannot see the other process. The only event a timeout records is that this caller stopped waiting, which several remote conditions share.',
      explain: `A timeout fires when a local timer expires before the reply this caller was waiting for. That observation is real. It is not an observation of the other process. The process may have crashed. It may be paused in garbage collection or on a frozen machine. The reply may be sitting on a slow link. The request may never have arrived, or the response may have been lost after the work finished. From the caller, those histories are one missing message.

Failure detectors built on timeouts are therefore guesses. In a network that can delay messages, no deadline separates "dead" from "slow" with certainty. Shortening the timer suspects more live processes. Lengthening it leaves a crashed process unmarked for longer. The timer is a decision about how long this caller is willing to wait, made with incomplete evidence.`,
      question:
        'A checkout service stops waiting for the ledger after 150 ms and logs "ledger dead." The ledger process is in a one-second pause and has not crashed. Explain why that log line is a guess about a process the checkout service cannot see.',
      hints: [
        'The checkout service observed its own timer, not the ledger exit.',
        'A pause, a lost reply, and a crash all withhold the next byte.',
      ],
      outline: [
        'The evidence is a local timer expiring before a response byte.',
        'The ledger may be paused, unreachable, or finished with a lost reply.',
        'Those causes are indistinguishable to the checkout service.',
        'The log states a remote death that the timer did not establish.',
      ],
      solution: `The checkout service saw its own 150 ms timer expire. It did not see the ledger process exit, and it did not see the ledger refuse the work. During a one-second pause the ledger holds the request and sends nothing. A crashed ledger also sends nothing. A ledger that already committed and lost the response packet also sends nothing. The checkout service has no field of view that separates those cases.

Calling the ledger dead promotes a local decision into a remote fact. The decision "stop waiting at 150 ms" can still be the right budget for checkout. It remains a guess about the process. Any later step that fences the ledger, fails over, or tells the user the debit did not happen is acting on that guess, not on a witnessed crash.`,
      rubric: [
        'The timeout is described as the caller stopping its wait, not as a view of the ledger process.',
        'Pause, loss, and crash are named as lookalikes from the caller side.',
      ],
      myth: [
        'A timeout is the remote process telling you it crashed.',
        'Nothing arrived from the remote process. The caller invented the crash when its own timer fired.',
      ],
      context:
        'Health checks, election timeouts, and request deadlines are the same guess with different costs. Each one converts missing bytes into an action.',
      tradeoff: 'A short timeout frees the caller and suspects live peers. A long timeout avoids that suspicion and stalls the caller when the peer really is gone.',
      mistake: 'Paging an incident for a dead ledger because one caller logged a timeout during a pause.',
      followUp: 'What second observation would move this from a guess to evidence the process exited?',
      extension: 'How does a lost response after a successful debit differ, to the caller, from a ledger that never received the request?',
      alternative: 'An end-to-end probe that writes and reads a canary key still times out when the network delays that probe. It checks a path. It does not see the process table.',
    },
    evening: {
      title: 'Pick the suspicion timer',
      why: 'The timer is a product choice. Too short and a live primary is treated as dead. The cost shows up as aborted work and a second primary, not as a tidy log line.',
      explain: `Choose the timer from the delays you have measured, not from a round number that feels alert. Add the longest ordinary pause, plus a few heartbeat intervals for a lost packet and for scheduling noise. A timer under that sum will fire while the peer is alive. That false suspicion is the expensive direction if the reaction is a failover.

The other direction has a price too. Every extra second of the timer is a second a crashed primary stays unmarked. Name both prices, then pick the side that matches the reaction. A timer that only logs can be short. A timer that aborts transfers and elects a new primary has to sit above the pauses you already know about.`,
      question:
        'A primary emits a heartbeat every 200 ms. Pauses last up to 1 second, and a single heartbeat can be lost. Failover aborts in-flight transfers and takes about 5 seconds. Choose a suspicion timeout and say what a false suspicion costs.',
      hints: [
        'The timeout has to clear a 1 second pause plus more than one 200 ms interval.',
        'False suspicion here runs the failover path against a primary that is only paused.',
      ],
      outline: [
        'Set the timeout above 1 second plus several heartbeat intervals.',
        'A concrete choice around 3 seconds leaves room for one pause and a lost heartbeat.',
        'A 500 ms timeout treats the known pause as death.',
        'The cost is aborted transfers, a 5 second failover, and a second primary if the paused process keeps acting.',
      ],
      solution: `Choose 3 seconds. A 1 second pause plus one lost 200 ms heartbeat already passes 1.2 seconds, and a couple more intervals cover scheduling delay. Three seconds sits above that sum. A primary that pauses for a second and drops a heartbeat is still inside the timer. A primary that actually stops is suspected after 3 seconds, and then the 5 second failover starts.

False suspicion is what you buy with a timer of 500 ms. The 1 second pause looks like a missing peer. Failover aborts the in-flight transfers and spends about 5 seconds electing a replacement for a process that is not dead. If that process resumes and still takes writes, you have two primaries until something stops the old one. The cost is real money movement interrupted, plus a second writer, spent on a pause you already knew could happen. Stretching the timer to 30 seconds would avoid that and leave a real crash unmarked for half a minute. Three seconds is the choice that respects the measured pause without hiding a crash for a full incident.`,
      rubric: [
        'The chosen timeout is above the 1 second pause plus heartbeat loss, with the arithmetic visible.',
        'False suspicion is priced as aborted transfers and a needless failover, including two primaries if the paused node keeps writing.',
      ],
      myth: [
        'The safest timeout is the shortest one, because you detect crashes faster.',
        'The shortest timer detects pauses as crashes. The detection is fast because it is often wrong, and the failover is the expensive part.',
      ],
      context:
        'Election timeouts and load-balancer health checks use the same sum. A check shorter than garbage collection will eject a replica that is only paused.',
      tradeoff: 'Three seconds of silence on a real crash delays failover. Five hundred milliseconds of eagerness manufactures failovers during ordinary pauses.',
      mistake: 'Setting the timer to one missed heartbeat because the dashboard looked more responsive in a demo.',
      followUp: 'What should the old primary do with a write that arrives after it wakes, if a new primary may exist?',
      extension: 'How does the choice change if a false suspicion only removes the node from a read pool and does not elect a new writer?',
      alternative: 'Requiring three failed probes in a row, each 1 second apart, also clears a single pause. It detects a crash more slowly than one 3 second timer and ignores one lost packet the same way.',
    },
  },
  cap: {
    morning: {
      title: 'The theorem is about a partition',
      why: 'The theorem is a statement about a cut in communication. Quoting it on a quiet day, when the nodes can talk, answers a question the theorem does not ask.',
      explain: `During a partition, some nodes cannot exchange messages. The theorem says a system in that situation cannot guarantee both linearizability and availability. Linearizability means a read sees the latest completed write, ordered with real time. Availability, in the theorem, means a node that has not crashed and that received a request still produces a response even though it cannot reach the other side of the cut. If both sides respond, a write on one side and a read on the other can disagree. If they must not disagree, the side that cannot see the latest write has to withhold the response.

A quiet day is the case where that cut is absent. Messages arrive. The theorem does not then require stale reads, and it does not require the system to refuse work. A quorum can be reached and the answer can be linearizable. What remains on a quiet day is a latency choice: wait for the quorum, or answer from one replica and accept staleness. That choice is real, and it is not the theorem. A crashed machine is also a different event. If a majority can still communicate, that majority can keep one order and keep answering. The theorem binds the side that is cut off.`,
      question:
        'Two replicas can exchange messages right now. A teammate says the theorem forces the service to give up either linearizability or availability for the life of the product. State what the theorem says during a partition, and what it does not say on this quiet day.',
      hints: [
        'The hypothesis of the theorem is that messages between the sides are not getting through.',
        'A quiet day can still trade latency for a fresher read. That trade is not a partition.',
      ],
      outline: [
        'During a partition, linearizability and availability cannot both be guaranteed.',
        'Availability here means a non-crashed node answers without the other side.',
        'On a quiet day the nodes can talk, so a quorum read can be linearizable and still complete.',
        'The theorem does not choose a permanent product label or a latency target.',
      ],
      solution: `During a partition the theorem is in force. Replicas that cannot communicate cannot both answer every request and promise that every answer is linearizable. If the cut side answers from its local state, a reader there can miss a write the other side already completed. If the cut side refuses to answer until it can see that write, that request is not available in the sense the theorem uses. One of those two has to give.

On this quiet day the two replicas can exchange messages, so the theorem does not force that choice. They can wait for each other and return a linearizable read, and the request still completes. They can also skip the wait and return a local value, and then the staleness is a latency choice someone made, not a partition they suffered. Nothing in the theorem picks that policy for the life of the product, and nothing in it says a later crash of one replica is itself the partition. If the surviving replica is alone because the other crashed, you have a replication problem. If it is alone because messages stopped, you have the case the theorem names.`,
      rubric: [
        'The forced choice is placed inside a partition, with linearizability and the theorem sense of availability named.',
        'The quiet day is described as a case where a quorum read can still complete, and the theorem is not used as a permanent label.',
      ],
      myth: [
        'The theorem says a distributed system must permanently abandon either consistency or availability.',
        'The choice is forced while a partition is in progress. When the nodes can communicate, a linearizable response can still be sent.',
      ],
      context:
        'People quote the theorem to end a design review. The review still needs an operation, a failure, and the anomaly that operation allows during that failure.',
      tradeoff: 'Waiting for a quorum on a quiet day adds latency and avoids a stale answer. Answering from one replica cuts the latency and will be stale even though no partition exists.',
      mistake: 'Declaring the service unavailable to writes every day because a partition might happen later.',
      followUp: 'During a partition, which side can keep answering linearizable reads if a majority is still connected on that side?',
      extension: 'What does a single-node database owe the theorem, given that it has no internal cut?',
      alternative: 'Writing every request to one primary and failing the request when the primary is unreachable keeps linearizability and gives up the request when the primary cannot be reached. That is a concrete policy. It is not a slogan about the whole product.',
    },
    evening: {
      title: 'Reject the label in the design doc',
      why: 'A database nickname is not a decision about the last unit of stock. The theorem does not fill in that decision, on a partition or on a quiet day.',
      explain: `Read the slogan as a missing design. If it says the system is "AP" and therefore stale answers are settled, it has skipped the request that matters. Name the request. Name the partition. Say whether the side that cannot talk still answers. Then say what the user can observe, and how you repair it after the cut heals. Those sentences are the design. The letters are not.

On a quiet day the same slogan is doing extra damage. It pretends ordinary reads must be stale because of a theorem that is not currently applying. A quorum read on a Tuesday is allowed. Refusing a minority warehouse during a later partition is also allowed. The label tried to be a substitute for both choices.`,
      question:
        'A design doc says: "Stock counts are AP. The theorem says we cannot have consistency and availability, we need availability, so stale counts are the design and no further choice is required." Reject that slogan. State the choice it skipped.',
      hints: [
        'Ask what one partitioned warehouse should do with a sale of the last unit.',
        'Ask what a stock read should do on a day when every replica is reachable.',
      ],
      outline: [
        'The slogan is rejected as a substitute for an operation-level choice.',
        'During a partition, the warehouse either sells from a local count or refuses the sale.',
        'Selling can oversell the last unit. Refusing makes that request unavailable.',
        'On a quiet day a quorum read can still return one count. The theorem does not forbid it.',
      ],
      solution: `Reject the slogan. It uses the theorem as a label so the doc can stop early. During a partition, a warehouse that cannot reach the others has a specific choice on the sale of the last unit. It can answer from its local count. Both sides of the cut can then sell that unit, and someone has to repair the oversell after the partition heals. Or it can refuse the sale until it can see a quorum, in which case that request is unavailable for the duration of the cut. The doc has to pick one and name the repair. "AP" does not contain the pick.

On a quiet day the replicas can talk, and the theorem does not require the count a customer reads to be stale. The service can read a quorum and return one figure. It can also read one replica and return faster, and then the staleness is a latency policy for ordinary traffic. The slogan erased that policy and erased the partition policy in the same sentence. A stock service can use a quorum on Tuesday and refuse a cut-off warehouse during a partition. That pair of choices is the design the label was standing in for.`,
      rubric: [
        'The slogan is rejected, and the partition choice is sell-and-oversell versus refuse-the-sale.',
        'A quiet-day quorum read is left available as a real option the theorem does not close.',
      ],
      myth: [
        'Calling the database AP records the consistency choice, so the design is done.',
        'The nickname skips the request. Someone still has to say what a cut-off warehouse does with the last unit, and what a normal day reads.',
      ],
      context:
        'The same substitution shows up when a review says "we are CP" and never says which requests fail during a partition or what a quiet-day read waits for.',
      tradeoff: 'Answering on the cut side keeps that warehouse selling and creates a repair problem. Refusing the cut side keeps one stock count and turns the partition into failed checkouts at that site.',
      mistake: 'Accepting "AP" in a review because the product page says availability matters.',
      followUp: 'After the partition heals, what do you do with two sales of the same last unit?',
      extension: 'Which request in this product could refuse during a partition while the product page still answers from a cache?',
      alternative: 'Per-warehouse stock with a human cap on oversell is a concrete staleness bound. It still needs a sentence about the partition. It is a design, where the label was not.',
    },
  },
  'consistency-models': {
    morning: {
      title: 'Three session promises',
      why: 'These names get stacked as if each one included the last. They constrain different pairs of reads, and a session can have one without the others.',
      explain: `Start with the smallest promise. Eventual visibility says that if writes stop, replicas later agree on the last value. Until then a read can miss a write that already happened, and a later read can return an older value than the one this client already saw. Nothing in that promise is about a session.

Monotonic reads add a limit for one client: once a read has returned a version, a later read by that client does not return an older version. Time, as this client observes it, does not step backward. The client can still sit on an old version forever, and the client that just wrote can fail to see its own write on the next read. Read-your-writes is that other promise: the client that performed a write, on a later read in the same session, sees that write or something newer. It does not stop a different client from moving backward, and it does not by itself stop this client from moving backward across a version it only observed and did not write. A session that needs all three has to ask for all three.`,
      question:
        'Order read-your-writes, monotonic reads, and eventual visibility in plain language for one client reading one key. Say which promises do not include the others.',
      hints: [
        'Eventual visibility allows a later read to show an older value.',
        'A client can avoid going backward and still miss the write it just submitted.',
      ],
      outline: [
        'Eventual visibility: replicas later agree if writes stop, and a session can go backward before that.',
        'Monotonic reads: one client does not observe an older version after a newer one.',
        'Read-your-writes: the writer session sees its own write on a later read.',
        'The last two do not include each other, and neither is implied by eventual visibility.',
      ],
      solution: `Put eventual visibility first, as the thinnest promise. If new writes stop arriving, replicas eventually show the same last value. Before that, this client can read version 5 and later read version 4, and the client that wrote version 5 can read the key and still get version 4.

Monotonic reads is the next sentence for that client: after it has seen version 5, it will not see version 4. It may keep seeing version 3 if that is all it has ever seen. Read-your-writes is a different sentence: the client that wrote version 5 sees version 5 or newer on its own later read. A system can offer monotonic reads and still show the writer the old value on the first read after the write, because staying on the old value does not step backward. A system can show the writer its own write and still let a second client step from version 5 back to version 4. Order them as eventual visibility, then the two session limits. Do not tell the writer that buying one of the session limits includes the other.`,
      rubric: [
        'The three promises are stated in plain language, with eventual visibility allowing a step backward and the two session promises distinguished.',
        'Read-your-writes and monotonic reads are not described as implying each other.',
      ],
      myth: [
        'Read-your-writes is just a stronger monotonic read, so one setting covers both.',
        'One stops the writer from missing its own write. The other stops a client from stepping backward. A session can have either one alone.',
      ],
      context:
        'Session guarantees are usually implemented by pinning a client to a replica or by tracking a version the client has seen. The pin is per session, which is why a second device does not inherit it.',
      tradeoff: 'Pinning a session to one replica gives these promises and pins a hot user to one machine. Reading any replica spreads load and drops the promises.',
      mistake: 'Promising "read your writes" in a review and then load-balancing every read, including the writer next refresh, across all replicas.',
      followUp: 'A user writes on a phone and immediately reads on a laptop. Which of the three promises covers that pair?',
      extension: 'Which promise does a client break by caching a value and then reading an older replica?',
      alternative: 'A single primary for this key gives you a stronger order than these three session promises, at the cost of sending every read and write through that primary.',
    },
    evening: {
      title: 'A photo and a balance',
      why: 'The same product can afford a stale picture and still mislead someone with a stale balance. The promise belongs to the object, not to the database logo.',
      explain: `Pick from the harm, not from a cluster-wide setting. A profile photo that lags a few seconds shows someone the previous face. The damage is embarrassment and a confused refresh. A balance that lags lets the person who just withdrew money act as if the money were still there. Those are different promises because the readers and the damage differ.

The writer of the photo is a special reader for a moment. Everyone else can run behind. The writer of the balance is the person most likely to make the next decision from the number on the screen. A promise that only stops the number from flickering backward, after the new number has been seen once, does not put that new number on the screen.`,
      question:
        'A user uploads a profile photo that other people may see late. The same app shows a balance after that user submits a withdrawal. Pick one promise for the photo and one for the balance, from read-your-writes, monotonic reads, and eventual visibility.',
      hints: [
        'A stranger looking at a photo can tolerate a short delay. The withdrawer is about to trust the number.',
        'Monotonic reads still allow the first read after a write to return the old value.',
      ],
      outline: [
        'The photo can use eventual visibility for viewers other than the uploader.',
        'A few seconds of the previous photo is the accepted damage.',
        'The balance needs read-your-writes for the session that submitted the withdrawal.',
        'Monotonic reads alone can keep showing the pre-withdrawal balance on the next read.',
      ],
      solution: `Give the profile photo eventual visibility. A viewer can see the previous photo until replicas catch up, and a later refresh can in principle step backward. For this object the harm is a stale face for a short time. You can add monotonic reads later so a photo does not flip back, and the uploader will want read-your-writes on their own screen. The promise that matches "other people may see it late" is eventual visibility.

Give the balance read-your-writes for the session that submitted the withdrawal. The next read in that session has to show the withdrawal or a later balance. Eventual visibility allows that refresh to show the old balance, which is how someone spends money the withdrawal already took. Monotonic reads do not fix that first refresh: a session that has not yet observed the new balance can keep reading the old one without ever stepping backward. Say the limit out loud. Read-your-writes does not stop a second device, which did not perform the write, from reading the old balance and submitting another withdrawal. That second device needs an order across clients, and none of these three promises is that order.`,
      rubric: [
        'The photo gets eventual visibility, with staleness named as acceptable for other viewers.',
        'The balance gets read-your-writes, and monotonic reads are rejected as the pick because the new withdrawal can stay invisible.',
      ],
      myth: [
        'One consistency setting on the database covers the photo and the balance, because they live together.',
        'The objects have different readers and different damage. A stale face and a stale spendable balance are not the same promise.',
      ],
      context:
        'Products often keep the photo on a cache or a replica and the balance on a primary. The split is the consistency choice, even when both rows sit in the same brand of database.',
      tradeoff: 'Read-your-writes on every balance read may pin that session to the primary and raise its load. Eventual visibility on the photo lets you serve it from any replica.',
      mistake: 'Using eventual visibility for the balance because the photo was fine that way in the same app.',
      followUp: 'The uploader refreshes and still sees the old photo. Which extra promise fixes that without changing what strangers see?',
      extension: 'Two devices both read the old balance and both withdraw. Which of the three promises fails to even talk about that pair?',
      alternative: 'Monotonic reads on the photo, so a new face does not flip back to the old one, is a stricter and still reasonable pick. It does not replace read-your-writes on the balance.',
    },
  },
  linearizability: {
    morning: {
      title: 'One object, or the whole transaction',
      why: 'A total order of single-key operations and a serial order of multi-statement transactions stop different bugs. Buying the first name does not purchase the second.',
      explain: `Linearizability is an order on one object. Each operation appears to take effect at a single point between when the client sent it and when the client received the response. If a write of a password completes, a read of that same password that starts afterward sees the new password or a later one. The order matches real time for that object. It says nothing about a client that reads two keys and writes one of them as a single piece of work.

Serializability is an order on transactions. A transaction can contain several statements, and the effect is the same as some serial execution of those transactions, one after another. That is what keeps an invariant across two balances honest. The serial order does not have to match the wall clock. A transaction that starts after another commit can still be placed earlier in the serial order and miss that commit. Linearizability on a single key would forbid that miss for that key. Serializability alone does not.`,
      question:
        'One promise gives a single order to operations on a password key. Another gives a serial order to a transfer that reads two balances and writes both. Separate the two promises, including what each does not order.',
      hints: [
        'The password case is one object and one operation at a time, with real time.',
        'The transfer case is several statements that have to look atomic together.',
      ],
      outline: [
        'Linearizability orders operations on the password key and respects real time for that key.',
        'A completed password write is visible to a read that starts after it completes.',
        'Serializability orders the whole transfer with other transactions, possibly across two keys.',
        'The serial order need not match wall-clock order, so a later transaction can miss a commit that already returned.',
      ],
      solution: `The password key is the linearizable object. Writes and reads of that key sit in one order, and a read that starts after a write completes cannot return the old password. A second key has its own order if all you bought was per-key linearizability. The pair of keys is not one operation, so a client that reads both and writes one is outside what that promise said.

The transfer is the serializable transaction. Its read of both balances and its writes have to appear as one step in some serial order with other transfers, which is what stops two transfers from each believing the same funds are still there. That promise does not say the serial order follows the wall clock. A transfer that the client started after another transfer committed can still be ordered first and can fail to see the committed one. Call that gap what it is. The single-object order prevents a stale password after a completed write. The transaction order prevents a multi-statement interleaving. Neither name is a nickname for the other.`,
      rubric: [
        'Linearizability is limited to a real-time order of operations on one object, using the password key.',
        'Serializability is limited to some serial order of multi-statement transactions, and that order is not claimed to match the wall clock.',
      ],
      myth: [
        'Linearizability is serializability for people who only have one row.',
        'One orders single operations on one object in real time. The other orders multi-statement transactions, and the serial order can disagree with real time.',
      ],
      context:
        'A database can ship both and document them as different isolation and consistency settings. Turning on the single-key order does not turn on the transaction order.',
      tradeoff: 'A linearizable primary for one key is easier to place and does nothing for an invariant that spans two keys. Serializable transactions cover the invariant and cost more coordination.',
      mistake: 'Testing one password overwrite, seeing a fresh read, and concluding a two-account transfer is safe.',
      followUp: 'A friend is told on the phone that the password write committed, then reads the old password. Which promise did that read break?',
      extension: 'Which promise does a per-key compare-and-swap give you, and which invariant across two keys can it still break?',
      alternative: 'Strict serializability keeps the transaction order and also respects real time, so a transaction that starts after a commit sees that commit. You pay for both guarantees, which is a different purchase from either one alone.',
    },
    evening: {
      title: 'Both flags cleared',
      why: 'An invariant over two rows can die while every individual row looks perfectly ordered. The bug is in the pair, so the guarantee has to see the pair.',
      explain: `Look at the invariant before you look at the isolation label. "At least one of these two people stays on call" talks about two rows and about a transaction that reads both before it writes one. An order that only sequences the writes to each row can accept both writes. Each row then has a tidy history and the roster is empty.

The guarantee that sees the pair treats each coordinator action as one transaction. In a serial order, one of them runs first and clears a flag. The other then reads the result and cannot clear the remaining person. That is the bug one promise prevents. The per-row order does not.`,
      question:
        'The rule is that at least one of Alex or Bian stays on call. Two coordinators each read both flags, see both true, and clear their own flag. Each flag write is linearizable, and both transactions commit. Which guarantee prevents the empty roster, and which does not?',
      hints: [
        'Each flag, read alone afterward, shows a single last write. The damage is the pair.',
        'A serial order of the two transactions cannot run both reads before both clears.',
      ],
      outline: [
        'Per-key linearizability allows both clears, because each key has its own order.',
        'Both coordinators read the old pair before either write is visible to the other.',
        'The roster ends with both flags clear, which breaks the rule.',
        'Serializability prevents it by ordering one whole transaction before the other.',
      ],
      solution: `Linearizability of each flag does not prevent the empty roster. The clear of Alex is one ordered write on the Alex flag. The clear of Bian is one ordered write on the Bian flag. A later read of either flag sees the clear, in real time, for that flag. Both coordinators read both flags while they were still true, then each wrote their own. Nothing in a per-key order looks at that combination. The roster has nobody on call, and every individual key still has a legal history.

Serializability prevents this bug. Each coordinator action is one transaction: read both flags, clear one, commit. A serial order runs one transaction to completion before the other. The second reads a flag that is already clear and aborts, so one person remains on call. State the boundary the other way so the names stay honest. Serializability does not, by itself, force that serial order to match the wall clock. It stops the empty roster. It is not the guarantee that stopped it because someone said the word linearizability about each row.`,
      rubric: [
        'The empty roster is shown to survive per-key linearizability because each flag write is legal alone.',
        'Serializability is the guarantee that prevents it, by ordering one full transaction before the other.',
      ],
      myth: [
        'If every row is linearizable, transactions over those rows are serializable.',
        'Each row can have a perfect real-time order while two transactions interleave their reads and writes and break a rule that mentions both rows.',
      ],
      context:
        'This is write skew. It shows up in on-call rosters, in "at least one admin remains," and in two accounts that together must stay above a minimum.',
      tradeoff: 'Taking a lock on both flags prevents the bug and blocks coordinators that touch disjoint pairs if the lock is coarse. Serializable snapshot isolation finds this conflict and aborts one side with less blocking, and it can still abort more than a hand-written lock would.',
      mistake: 'Adding a linearizable compare-and-swap on each flag and shipping the roster rule as if it were covered.',
      followUp: 'What does the second coordinator have to read, and when, so it can see the first clear without a full serializable transaction?',
      extension: 'How would you rewrite the rule as one linearizable operation on a single roster object?',
      alternative: 'Putting both flags in one row, and writing that row with one compare-and-swap, makes the roster one object. Linearizability of that object then prevents the empty roster, and you gave up the two-row schema.',
    },
  },
  quorums: {
    morning: {
      title: 'Read sets and write sets overlap',
      why: 'A quorum is a counting rule. It only helps when every read set shares a node with every successful write set, and the reader can tell which copy is newer.',
      explain: `You have N replicas. A write is acknowledged only after it is stored on W of them. A read consults R of them and keeps the copy with the highest version. If R + W is greater than N, every such read set intersects every such write set. At least one replica in the read holds the write you acknowledged, so the highest version the reader sees is at least that write.

The arithmetic is not a suggestion. R + W equal to N can miss: for three replicas, a write on two nodes and a read on the remaining node do not overlap. The reader also needs versions. Intersection does not help if the reader accepts an arbitrary reply from the set instead of the newest one. And the sets have to be drawn from the same N nodes. A count that is true on a whiteboard and false of the nodes you actually contacted is a different configuration.`,
      question:
        'You have replicas A, B, and C, so N is 3. Compute an R and a W that intersect. Show the arithmetic, and name one R and W that do not.',
      hints: [
        'The test is R + W greater than N, not R + W equal to N.',
        'List the two-node subsets and see which pairs share a member.',
      ],
      outline: [
        'Choose R = 2 and W = 2, because 2 + 2 is greater than 3.',
        'Every two-node write set shares a node with every two-node read set.',
        'The reader keeps the highest version in the read set.',
        'R = 1 and W = 1 do not intersect: a write on A and a read on B can miss.',
      ],
      solution: `Choose R = 2 and W = 2. Then R + W = 4, which is greater than N = 3. A successful write is on two replicas, and a read looks at two replicas and keeps the highest version. Any write pair meets any read pair. A write to A and B meets a read of B and C at B, meets a read of A and C at A, and meets a read of A and B at both. A write of version 5 acknowledged on A and B cannot be invisible to a read that includes B.

R = 1 and W = 1 do not intersect, because 1 + 1 is not greater than 3. A write acknowledged only on A and a read served only by B have an empty intersection, and B can return an older version. R = 1 and W = 2 also fail, because a write on A and B and a read of C do not meet, and 1 + 2 is equal to 3 rather than greater. R = 1 and W = 3 does intersect, since every write waits for every replica, and it cannot complete while any replica is down. The majority pair is the one that still completes with one replica down.`,
      rubric: [
        'R = 2 and W = 2 are computed from R + W greater than 3, with the overlapping pairs identified.',
        'A non-overlapping pair is named, and the reader is said to keep the highest version.',
      ],
      myth: [
        'Any majority-sounding pair of numbers is a quorum, even when R + W equals N.',
        'Equal to N is not enough. A write on two of three nodes and a read of the other node do not share a replica.',
      ],
      context:
        'Leaderless replication uses this count so a read can reconstruct the latest acknowledged write without a single primary. The version number is part of the mechanism, not a comment.',
      tradeoff: 'W = 2 tolerates one failed replica on the write and forces every read to pay for two responses. W = 3 lets a read use one response and stops writes whenever any replica is down.',
      mistake: 'Acknowledging the write when the first replica stores it, while telling readers to query two, because the average of those habits sounded like a quorum.',
      followUp: 'For N = 5, what R and W still intersect after two replicas are unreachable?',
      extension: 'Why can two concurrent writes with W = 2 both be acknowledged and still leave the reader to compare versions?',
      alternative: 'W = 3 and R = 1 also intersect for N = 3. Writes then require every replica, so one outage blocks acknowledgements, and reads get cheaper.',
    },
    evening: {
      title: 'The read misses the acknowledged write',
      why: 'Stale reads here are counting failures. Either the sets do not overlap, or the nodes that took the write are not the nodes the reader treats as the quorum.',
      explain: `Take a configuration whose sets can miss and watch one value hide. If the write is allowed to succeed on a single replica, a read of a different single replica never has a chance to see it. The caller was told the write was stored. The next caller is shown the old value. No clock skew is required. The sets are disjoint.

A second miss happens when the arithmetic looked fine and the nodes were the wrong ones. A write acknowledged by fallback nodes outside the replica set does not intersect a read that only contacts the home replicas. The writer of that value is not in the quorum the reader calls latest. The formula was applied to a different N than the one the read used.`,
      question:
        'N is 3 and the service uses R = 1 and W = 1. A write sets the price to 12 on replica A only and is acknowledged. A read is then served by replica B, which still has 10. Show the stale read. Then show a stale read where R and W are 2 but the write landed outside the home set.',
      hints: [
        'Compare the set {A} with the set {B} before you talk about timing.',
        'A fallback node that is not A, B, or C cannot satisfy a read of A and B.',
      ],
      outline: [
        'The write quorum is {A} and the read quorum is {B}, which do not intersect.',
        'The reader returns 10 even though 12 was acknowledged.',
        'With R = 2 and W = 2, a write on fallback nodes D and E is outside {A, B, C}.',
        'A home read of A and B still returns the old price, because the writer nodes are not in that quorum.',
      ],
      solution: `The sets do not intersect. The acknowledged write of 12 lives only on A. The read asks only B and gets 10. The intersection of {A} and {B} is empty, so the replica that holds 12 is not in the read. The price is stale, and the acknowledgement is why the staleness is a bug rather than an unfinished write. R + W is 2, which is not greater than 3. The configuration allowed this pair of quorums.

Now set R = 2 and W = 2 and aim them at different nodes. The home replicas are A, B, and C. During a partition the coordinator acknowledges a write of 12 on fallback nodes D and E, which are not in the home set. A later read uses the home quorum A and B, both still at 10. Those two nodes intersect each other and would intersect a write quorum taken inside {A, B, C}. They do not intersect {D, E}. The nodes that accepted the write are not in the quorum the reader treats as latest, so 12 is invisible. The inequality 2 + 2 greater than 3 was about one set of three. It said nothing about a write that left that set.`,
      rubric: [
        'The stale price is traced to disjoint quorums {A} and {B}, with 12 acknowledged and 10 returned.',
        'The second stale read puts the acknowledged write on nodes outside the home set that the R = 2 read consults.',
      ],
      myth: [
        'Once R + W is greater than N on the diagram, a reader cannot see a stale value.',
        'The inequality applies to quorums drawn from the same N, with versions. Writes acknowledged on some other set of nodes are invisible to a home read.',
      ],
      context:
        'Sloppy quorums in leaderless stores accept writes on fallback nodes so the write can return during a partition. The cost is exactly this miss until the value is handed back to the home replicas.',
      tradeoff: 'Refusing the write when the home quorum is unreachable keeps reads inside the set honest and makes the write unavailable during the partition. Accepting it on fallback nodes does the opposite.',
      mistake: 'Raising R and W and also enabling fallback acknowledgements, then telling readers the inequality covers them.',
      followUp: 'What has to happen to D and E before a home read of A and B is guaranteed to be able to see 12?',
      extension: 'A write reaches only A, and W is 2, so it is not acknowledged. Can a read of A and B still return it if the reader takes the max version?',
      alternative: 'A single primary with W equal to a majority, and reads only from that primary, avoids picking a read set that misses the write. You then depend on the primary and on failover.',
    },
  },
  'leader-election': {
    morning: {
      title: 'A lease is a promise with an expiry',
      why: 'The lease is what lets a leader act without asking, and it is also a clock. When the clock and the process disagree, the leader belief is false.',
      explain: `Followers that grant a lease promise not to elect another leader before time T. Until T, the leader can do the work that requires a single leader, without a round trip to confirm it is still alone. For a shard primary, that work includes answering a linearizable read from local state: no other primary should exist yet, so the local state is still the latest. The lease is not a license to acknowledge a replicated write that has not reached a majority. It covers the exclusive action the followers promised to withhold.

The lease lies when the leader acts on a check that is no longer true. The leader reads its clock, sees time left, then pauses past T in garbage collection or on a frozen machine, then acts without reading the clock again. Followers, whose time reached T, have elected someone else. A leader clock that runs behind the followers produces the same lie without a pause: the leader still sees T in the future, and the followers already see T in the past. In both cases the local sentence "I hold the lease" is false.`,
      question:
        'A shard primary holds a lease until time T and uses it to answer reads from local state. What does the lease let the primary do, and when is the primary wrong about the lease still being valid?',
      hints: [
        'The followers promised not to grant a conflicting lease before T. That is the whole permission.',
        'A check of the clock that happened before a long pause is not a check after the pause.',
      ],
      outline: [
        'The lease lets the primary serve the exclusive local read without a round trip until T.',
        'It does not replace a majority acknowledgement for a replicated write.',
        'The lease lies after a pause that crosses T if the primary does not recheck the clock.',
        'The lease also lies when the primary clock is behind the followers and T has passed for them.',
      ],
      solution: `The lease lets the primary answer a linearizable read from its local state until T, without asking the followers on that read. The permission is the followers promise that they will not grant another lease before T, so a second primary should not exist while the lease is valid. The primary can also refuse to step down before T. It cannot use the lease to pretend a write is committed when a majority has not stored it. The exclusive read is the action the promise covers.

The primary is wrong when it still behaves as leader after that promise has ended. If it checked the clock, paused past T, and served the read on the strength of the old check, the followers were free to elect a replacement during the pause. The local belief is stale. If its clock is behind theirs, it can see remaining time while they already elected someone else, with no pause required. A lease that the primary does not recheck after a pause, or that ignores bounded clock drift, will be acted on after it has expired. That is the lie.`,
      rubric: [
        'The lease is tied to a local exclusive action until T, and it is not described as a majority commit.',
        'The lie is a pause past T or a lagging clock, so the primary acts after followers may have elected someone else.',
      ],
      myth: [
        'A leader keeps the lease until another node successfully tells it that it has been replaced.',
        'The lease ends at T whether or not a message arrives. Followers may elect a new leader while the old one is paused or slow-clocked.',
      ],
      context:
        'Coordinated reads on a primary use this pattern so the common read does not pay a round trip. The expiry is the safety boundary, which is why the pause matters.',
      tradeoff: 'A long lease avoids elections during brief blips and widens the window in which a paused primary can still believe it leads. A short lease shrinks that window and causes more elections.',
      mistake: 'Checking the lease once when the process becomes primary and then serving reads for the life of the process.',
      followUp: 'After a pause, where does the primary have to read the time, relative to the read it is about to serve?',
      extension: 'What extra margin do you subtract from T if the primary clock may run up to 100 ms behind the followers?',
      alternative: 'Confirming leadership with a round trip to a majority before each read does not depend on the local clock. It costs a round trip on every read and still fails if the majority itself is partitioned after the confirmation returns.',
    },
    evening: {
      title: 'Two schedulers assign the same job',
      why: 'The damage is not the election. The damage is two nodes that each believe they are the only assigner and each hand the job to someone.',
      explain: `Apply the lease to a process that acts alone. A scheduler with a valid lease is allowed to assign jobs because every other scheduler promised not to assign until the lease ends. When the lease lies, a second scheduler has a newer lease and the first one still assigns. The job system now has two assigners. Each one is locally consistent with the last check it made.

You do not need a network cut for this pair. A pause that crosses the expiry is enough. The lock service or the lease votes can be correct the whole time: only one lease is valid. The bug is the paused process acting on the expired one.`,
      question:
        'Scheduler A holds a lease until 12:00:10. The machine freezes A at 12:00:09 for 20 seconds. Scheduler B becomes leader at 12:00:11 and assigns order 551 to driver X. Describe how A and B can both think they are the leader.',
      hints: [
        'B waited until the lease time the followers were honoring. B can be the real leader.',
        'A last looked at the clock before the freeze and assigns when it wakes.',
      ],
      outline: [
        'Before the freeze, A is the only leader and the lease is valid.',
        'The freeze crosses 12:00:10, so the promise that kept others from leading has ended.',
        'B takes a new lease at 12:00:11 and assigns order 551.',
        'A wakes at 12:00:29, does not recheck the expiry, and assigns order 551 as well.',
      ],
      solution: `B is the leader the lease votes would name. The freeze kept A from acting and from renewing, and it crossed 12:00:10. Followers were free to grant a new lease. B received it at 12:00:11 and assigned order 551 to driver X. From B side, and from the lease service, there is one leader.

A also thinks it is the leader. Its last clock check was at 12:00:09, when the lease had a second left. The freeze is not a clock update. At 12:00:29 the process resumes between the check and the assignment and still has "I am leader" in hand, so it assigns order 551 to some other driver. Two nodes now believe they hold the lease, and the order has two assigners. The lease service does not share that confusion: A lease ended at 12:00:10. A is wrong because it acted on a check from before the pause. Any later worker that accepts an assignment because the caller says it is the leader will accept both.`,
      rubric: [
        'B holds the lease that was granted after 12:00:10, and A acts on a check made before the freeze.',
        'Both assign order 551, so the two beliefs produce two assignments.',
      ],
      myth: [
        'Two leaders can exist only when the network is cut in half.',
        'A pause past the lease expiry produces two believers with no cut. One of them holds a valid lease. The other holds a stale check.',
      ],
      context:
        'Job schedulers, cron standbys, and shard primaries that also enqueue work all have this shape. The duplicate is the job, not only the row that says who leads.',
      tradeoff: 'A longer scheduler lease survives a short freeze and assigns duplicate work when the freeze is longer than the lease. A shorter lease fails over during ordinary garbage collection.',
      mistake: 'Letting workers accept an assignment from any peer that claims leadership, with no expiry on the claim.',
      followUp: 'What should a worker store with the assignment so a late assignment from A can be rejected?',
      extension: 'How does the story change if A clock jumps forward on wake and A rechecks the lease before assigning?',
      alternative: 'A database unique constraint on order 551 assignment lets both schedulers try and allows only one insert to win. You stop needing the lease for this particular job, and you still need a story for the side effect that happened before the insert.',
    },
  },
  'raft-operators': {
    morning: {
      title: 'Term, majority, commit index',
      why: 'Operators see terms and commit indexes during an incident. Those two numbers tell you who can lead and which log entries a client was allowed to be told about.',
      explain: `A term is a number that goes up when a node campaigns to become leader. Followers that stop hearing the current leader before the election timeout can start a campaign. A candidate that receives votes from a majority of the voters in that term is the leader. The others reject messages from an older term once they have seen the new one. Randomized election timeouts make one candidate likely to get the majority, instead of two candidates splitting the votes and both timing out. What you look for in the log is a new term and one leader, then heartbeats from that leader.

A log entry is committed when the leader commit index moves past it. The leader advances that index when a majority has stored an entry from the leader current term, which also covers the entries before that point. An entry you can see on a majority of disks, left over from an older term, can still sit below the commit index. A newer leader is allowed to overwrite an older-term entry that the commit index never covered. Trust the commit index the cluster reports. A count of files on disks you opened is a different number.`,
      question:
        'In a three-node group the term moves from 4 to 5 and a new leader appears. One entry is stored on two disks, and the reported commit index is still behind that entry. Describe the election, and say when the entry is committed.',
      hints: [
        'A leader in term 5 exists because a majority voted for it in term 5.',
        'Two copies on disk are not the same fact as a commit index that covers the entry.',
      ],
      outline: [
        'Followers that missed the leader started an election, and term 5 is that campaign.',
        'A majority of the three voters granted the vote, so one node leads term 5.',
        'The entry is committed only when the commit index moves over it.',
        'Copies from term 4 on two disks can still be overwritten if the commit index never reached them.',
      ],
      solution: `The election is the move from term 4 to term 5. Followers did not hear the old leader before the election timeout, and at least one of them campaigned in term 5. It became leader because a majority of the three voters granted it their vote for that term. Nodes that have seen term 5 reject a leader that still speaks as term 4. In the operator log you should see one leader for term 5 and the other reachable nodes following it. Repeated elections with no winner mean candidates are splitting the three votes and timing out together, which is a timeout problem, not a committed write.

The entry on two disks is not committed while the commit index is behind it. It becomes committed when the leader of the current term advances the commit index over it, which the leader does after a majority has stored an entry from its own term. If this entry was replicated in term 4 and never covered, the term 5 leader may replace it even though two disks held it. Tell a client the write succeeded when the commit index covers it. Do not tell them because you personally saw two copies.`,
      rubric: [
        'The new leader is explained as a majority vote in term 5, without a recipe for building the protocol.',
        'Commit is defined as the commit index covering the entry, and a majority of disks from an older term is not treated as sufficient.',
      ],
      myth: [
        'An entry stored on a majority of disks is committed, whatever term wrote it.',
        'Committed means the commit index covers it. An older-term entry on a majority of disks can still be replaced if that index never reached it.',
      ],
      context:
        'Dashboards that show a leader and a commit index are the operational surface. Disk copies you copy by hand during a rescue are how committed entries get mistaken for uncommitted ones, and the reverse.',
      tradeoff: 'A short election timeout fails over quickly and can start needless elections when a leader pauses. A long one avoids those elections and extends the outage when a leader really stops.',
      mistake: 'Declaring a write durable because two nodes have the file, while the commit index the clients use is still behind it.',
      followUp: 'What should a client do with a write it sent to the term 4 leader if term 5 is now leading and the commit index never covered that write?',
      extension: 'How many voters of a five-node group have to be reachable before a new term can elect a leader?',
      alternative: 'A single primary with synchronous replication to one standby is easier to explain and loses the majority rule that lets a three-node group lose one node and still commit.',
    },
    evening: {
      title: 'Do not shrink the remaining majority',
      why: 'An impaired group can still commit if a majority of voters remains. The usual way to lose that is an operator touching one more voter, or replacing the log with an older copy.',
      explain: `Count the voters before you restart anything. A three-node group commits with any two. If one node is already unreachable, the other two are the only majority left. Stopping one of them, or restarting both, drops the group below a majority. Writes that need a commit index stop. The impairment was tolerable. The extra restart is what makes it an outage.

Restoring data is the other way to damage a quorum that still works. A snapshot from yesterday is behind the commit index those two nodes may already have advanced. Putting that snapshot in place of the surviving majority replaces committed entries with older ones. A new empty node does not repair that. It has no log until the surviving quorum gives it one.`,
      question:
        'A three-node group has node C unreachable. Nodes A and B still elect a leader and advance the commit index. What should the operator not do to this quorum?',
      hints: [
        'Majority of three is two, and those two are A and B.',
        'A snapshot from yesterday is not a substitute for the commit index A and B have now.',
      ],
      outline: [
        'Do not stop or patch B while C is down. A and B are the only majority.',
        'Do not restart A and B together.',
        'Do not restore an older snapshot over A and a blank replacement.',
        'A new voter has to receive the log through a change the current majority commits.',
      ],
      solution: `The operator should not take B down, and should not restart A and B at the same time. C is already gone. Majority of three is two. A and B are those two, and they are still committing. Patching B removes the majority. The group cannot elect a leader that can advance the commit index until two voters are back, so every write that waits on commit stalls. Leave the surviving pair in place until C is returned or a replacement has caught up.

The operator also should not restore the snapshot from yesterday onto A and a new empty node and call that pair the cluster. The commit index on A and B may be ahead of that snapshot. Overwriting A with the snapshot, then letting the blank node form a new majority with that older A, drops every entry committed since the snapshot. If a rescue really requires starting from one node, that node has to be one whose log includes the highest commit index you can find, and you accept that this is a last resort that discards any newer committed entries you failed to find. While A and B are up, you do not need that resort. Add a replacement by a membership change those two commit, after the new node has their log.`,
      rubric: [
        'Stopping another voter is rejected because A and B are the only remaining majority of three.',
        'Restoring an older snapshot over that majority is rejected because it can discard entries the commit index already covered.',
      ],
      myth: [
        'Once a node is down, the helpful move is to restart the rest and restore a snapshot so the group is symmetric again.',
        'The remaining majority is what still commits. Restarting it or rolling it back to an older snapshot is how committed entries and write availability are lost.',
      ],
      context:
        'This shows up as a rolling patch that was safe at full strength and is unsafe one failure in. The patch procedure has to read the current voter count, not the diagram from last quarter.',
      tradeoff: 'Waiting to patch B leaves a known hole on B for longer. Patching B immediately turns a single failure into a commit outage.',
      mistake: 'Bootstrapping a fresh one-node group from whichever disk you could log into, without comparing its log to the commit index.',
      followUp: 'C comes back with a longer log than A and B. What do you compare before you let C lead?',
      extension: 'A five-node group already has two nodes down. Which additional stop removes the ability to commit?',
      alternative: 'Placing the third voter in a different failure domain does not help this incident, and it makes the next single-node patch less likely to coincide with a network cut of a partner. It is a placement choice you make before the outage.',
    },
  },
  'split-brain': {
    morning: {
      title: 'The minority leader still answers',
      why: 'A partition stops the old leader from hearing that it lost. It does not stop a client on that side from sending a write, and it does not stop a careless leader from accepting it.',
      explain: `Draw the cut first. Leader A is on one side. Followers B and C are on the other, and they can talk to each other. They stop hearing A, wait out the lease or the election timeout, and elect B in a new term. A does not learn this. The messages that would tell it are the messages the partition dropped. A last belief is still "I am the leader."

A client that can reach A then submits a write. A applies it locally and returns success, because its rule is "I am leader, so I accept." That is the write it should not accept. The entry is not on a majority, so it is not committed. B can commit a different entry at the same position. When the partition heals, the diverged tail on A is discarded. The client was told the write happened. The log the majority kept does not contain it. Anything that client did next, on the strength of that success, has no basis in the cluster.`,
      question:
        'A partition isolates leader A from B and C. B and C elect B. A client that can still reach A submits a withdrawal, and A applies it locally and returns success. Explain how that write was accepted, and why it should not have been.',
      hints: [
        'A has not seen the new term. Silence is not a message that says "you are replaced."',
        'Success returned from one node is not a majority commit.',
      ],
      outline: [
        'B and C elect B because they cannot hear A and the old lease or term has ended for them.',
        'A still believes it leads, because the partition hid the new election.',
        'A acknowledges the withdrawal from its local log.',
        'The withdrawal is not on a majority, so B history can diverge and A success was unwarranted.',
      ],
      solution: `A accepted the withdrawal because it still considered itself leader and the client could reach it. The partition prevented B and C from telling A about the new term, and A did not require a majority of acknowledgements in a term it could still prove. It wrote the withdrawal to its local log and returned success. From the client point of view the call looks like any other committed withdrawal.

It should not have been accepted because A is a stale leader. B was elected by the majority, and A entry never reached B or C. The withdrawal is not committed. B can commit a different change at that position, including a conflicting one. On heal, A diverged entries are thrown away. The client holds a success for a withdrawal the cluster did not keep. If the client handed out cash on that success, the cash left and the ledger did not change. The partition made the stale belief possible. The acceptance rule on A, which answered without a majority, made the false success.`,
      rubric: [
        'A accepts the write because it still believes it is leader and a client can reach it across the cut.',
        'The write is uncommitted because it never reached a majority, so the success A returned is unwarranted.',
      ],
      myth: [
        'The minority side of a partition cannot accept a write, because it cannot reach the majority.',
        'It cannot replicate to the majority. It can still accept a write from a local client if it answers without one.',
      ],
      context:
        'Split brain is this pair: two leaders, and a client that believed the one the majority will abandon. The heal does not call the client back.',
      tradeoff: 'Requiring a majority acknowledgement before success stops A from lying and makes writes unavailable on the minority side for the whole partition. Answering locally keeps that side "up" and creates withdrawals the cluster will forget.',
      mistake: 'Treating a successful response from the nearest replica as a commit, without a term or a majority in the response.',
      followUp: 'What does the client still have in its hands after the partition heals and A log is discarded?',
      extension: 'Which clients can still reach A during the cut, and which are correctly talking to B?',
      alternative: 'Refusing every write that cannot be placed on a majority makes the minority side fail the withdrawal instead of acknowledging it. The user sees an error. The ledger does not see a ghost success.',
    },
    evening: {
      title: 'The replica rejects the old term',
      why: 'The stale leader will still try. The mechanism that matters is on the receiver: a number the replica has already moved past, which makes the late write unacceptable.',
      explain: `Give every leadership period a number that only increases. Raft calls it a term. A replica stores the highest term it has seen. An append, a vote, or a write tagged with a lower term is rejected, not stored and not acknowledged. Once a majority has seen the new term, the stale leader cannot collect a majority of acks in the old one.

A fencing token is the same check when the number is handed out with a lock grant instead of with an election. The storage system remembers the highest token it has accepted and refuses a smaller one. In both designs the stale writer may still send the write. The receiver is what makes it unacceptable. A number that nobody checks does not change the outcome.`,
      question:
        'A stale leader sends a withdrawal tagged with term 7. The replica has already voted in term 8. Name the mechanism that makes this write unacceptable, and say what the replica does.',
      hints: [
        'The replica stores the highest term it has seen, and 8 is already stored.',
        'Rejection has to happen before an acknowledgement, not after the heal.',
      ],
      outline: [
        'The mechanism is the term, which increased when the new leader was elected.',
        'The replica compares 7 with the term 8 it has already seen.',
        'It rejects the append and does not acknowledge it.',
        'The stale leader cannot form a majority of acks in term 7.',
      ],
      solution: `The mechanism is the term. The replica has seen term 8, so term 7 is a stale leadership period. It rejects the withdrawal, does not write it as committed, and does not send an acknowledgement. The stale leader can repeat the attempt against every replica it can reach. Any replica that has seen term 8 answers the same way. Without a majority of acks, the stale leader has no success to return to the client.

A fencing token would play this role if the number came from a lock service: the store would reject a write whose token is below the highest token already accepted. Name the term for this replica, because the number came from the election. Either mechanism lives on the receiver. If the replica accepted term 7 after seeing term 8, the stale write would land and the election would not have protected the ledger. The unacceptable part is the rejection, not the hope that the stale leader notices it has been replaced.`,
      rubric: [
        'The term is named as the mechanism, and term 7 is rejected because the replica has seen term 8.',
        'The replica withholds the acknowledgement, so the stale leader cannot return a committed success.',
      ],
      myth: [
        'Once you know a split brain happened, repair can merge the two withdrawals into one true history.',
        'The client may have acted on a success already. Rejection at the replica is what stops the success from being issued. A merge later does not pull cash back.',
      ],
      context:
        'Operators see this as a follower log line that says it rejected a message from an old term. That line is the mechanism working, not a second outage.',
      tradeoff: 'Checking the term on every write rejects stale leaders and costs a comparison and a stored integer. Skipping the check makes the common write cheaper and makes the stale acknowledgement possible.',
      mistake: 'Accepting the write onto the local disk "just in case" and acknowledging it, with the term check left for a background scrub.',
      followUp: 'A replica that has not yet heard term 8 still accepts term 7. What stops that single acceptance from becoming a commit?',
      extension: 'How does a fencing token on a lock differ in who issues the number, if the rejection rule is the same?',
      alternative: 'A short lease that the leader must renew with a majority before each write also stops the stale leader, by ending its permission without a term on the data. You then depend on the clock and the renewal round trip.',
    },
  },
  'idempotent-writes': {
    morning: {
      title: 'The same attempt in both services',
      why: 'A retry across two services doubles the work unless both services recognize the attempt. Convergence means one charge and one grant, including when the crash landed between them.',
      explain: `The caller picks one attempt id and sends it to both services. Each service stores that id in the same local transaction as its own effect, with a unique constraint. A retry that finds the id returns the original row and does not insert a second one. A retry that does not find the id inserts the single row. Both paths end at one local effect.

Across the pair, the coordinator may die after the charge commits and before the grant is acknowledged. The retry calls both services with the same id. The charge service returns the original charge. The grant service either returns the grant it already stored or creates the one grant it never received. The end state is one charge and one grant. Different ids generated inside each service would not meet on that retry, and the second call would be a second operation.`,
      question:
        'Buying a seat calls billing and then entitlements, both with attempt id seat-88. The coordinator crashes after billing commits and before entitlements responds. How does a retry make the two services converge?',
      hints: [
        'Billing has to find seat-88 and return the original charge, not insert another.',
        'Entitlements may never have seen seat-88. The retry is what creates the single grant.',
      ],
      outline: [
        'seat-88 is the caller id stored with each service effect under a unique constraint.',
        'The retry presents seat-88 to billing, which returns the charge it already committed.',
        'The retry presents seat-88 to entitlements, which creates the grant once or returns it.',
        'The end state is one charge and one grant, which is the convergence.',
      ],
      solution: `The retry calls billing with seat-88. Billing finds the attempt row it stored in the same transaction as the charge and returns that charge. The unique constraint stops a second insert. The customer is not billed again. The coordinator now knows the charge id it may have missed when it crashed.

The retry then calls entitlements with the same seat-88. If the first call never arrived, entitlements inserts one grant tied to seat-88 and commits it with the attempt row. If the first call arrived and the response was lost, entitlements finds the row and returns the same grant. Either way there is one grant. Together the two services show one charge and one grant, which is the state a single successful purchase would have produced. If nobody retried, the charge could sit forever without a grant. The retry is what closes that gap without a second charge. An attempt id that billing minted on its own, and a different one that entitlements minted on its own, would not find those rows.`,
      rubric: [
        'Both services key off seat-88, and billing returns the original charge instead of creating another.',
        'Entitlements ends with exactly one grant whether or not the first call arrived, so the pair converges.',
      ],
      myth: [
        'Each service can mint its own attempt id on receive, and the coordinator retry will still match.',
        'A locally minted id is a new operation to the other attempt. Both services have to store the id the caller reused.',
      ],
      context:
        'This is how a coordinator crosses a process boundary without a shared transaction. Each side has its own commit. The shared id is the only reason a retry is the same work.',
      tradeoff: 'Storing the attempt row inside the effect transaction couples retention of ids to that table and makes the duplicate check atomic with the write. Storing ids in a side cache can forget the id and redo the effect.',
      mistake: 'Retrying entitlements with a fresh id because the first response was lost, while correctly reusing the id for billing.',
      followUp: 'What should entitlements return if seat-88 is stored and the grant insert is still in progress?',
      extension: 'The caller retries seat-88 with a different seat count. What do you return, and why is that not a second grant?',
      alternative: 'One database transaction that inserts the charge and the grant together converges without attempt ids and without two services. You only have that option while both rows live in one database.',
    },
    evening: {
      title: 'The bank accepted and the row does not say so',
      why: 'The attempt row converges the local write. The duplicate is the effect outside that transaction, in the gap before success is recorded.',
      explain: `Put the outside call next to the row and look at the crash points. Inserting an attempt row as started, before the call, stops two retries from both deciding they are first. It does not record that the outside system accepted. If the process dies after the acceptance and before the row says succeeded, a retry that treats "started" as "call again" repeats the outside effect.

That gap is the window. The local unique key is doing its job. The second payment still happens because the payment does not live in the local transaction. Closing the window means asking the outside system about the same attempt id, not calling the action endpoint again while the row says started.`,
      question:
        'A payout row for pay-17 is committed as started. The bank moves the money and the response is lost. The process dies before marking pay-17 succeeded. Show the window where the retry still pays twice.',
      hints: [
        'The started row proves the attempt began. It does not prove the bank outcome.',
        'The duplicate is a second bank call, not a second local primary key.',
      ],
      outline: [
        'pay-17 is durable as started before the crash, so the local insert will not be repeated.',
        'The bank has already moved the money, and the payer does not have that fact stored.',
        'A retry that sees started and calls the bank again creates the second payment.',
        'The window is the time between bank acceptance and a durable succeeded mark.',
      ],
      solution: `The window opens when the bank applies the transfer and closes when pay-17 is durable as succeeded, or as failed, with the bank reference stored. In this crash the process is inside that window. The local row exists, so a unique constraint will not create a second payout row. The bank has moved the money once. The row still says started, because the response never got written.

The retry reads started and takes it as unfinished work. It calls the bank action endpoint again with pay-17, or worse, with a new bank reference because it thinks the first call did not count. The bank, which already accepted the first transfer, accepts another. That second transfer is the duplicate. The local table still shows one payout row, which is why the dashboard looks idempotent while the customer was paid twice. The window stays open for as long as the retry policy treats an unknown bank result as a reason to send the money again. A status read to the bank, keyed by pay-17, is the call that can close it. The action endpoint cannot.`,
      rubric: [
        'The duplicate is a second bank transfer, while the local pay-17 row stays a single started attempt.',
        'The window is placed after the bank acceptance and before the succeeded mark is durable.',
      ],
      myth: [
        'A unique attempt row means a retry cannot duplicate work, wherever the work happens.',
        'The unique row stops a second local insert. Repeating the bank call while the outcome is unknown moves the money again.',
      ],
      context:
        'Any call to a vendor that takes money, sends mail, or ships a box has this window if the vendor commit and your commit are two transactions. The vendor status endpoint is part of the design.',
      tradeoff: 'Leaving the row started until a human looks stops the double pay and stalls the payout. Calling the bank again clears the queue and duplicates the transfer.',
      mistake: 'Coding the retry as "if status is not succeeded, post the transfer again."',
      followUp: 'The bank status endpoint also times out. What do you write on the row, and what must the next retry refuse to do?',
      extension: 'How does the window change if the bank stores pay-17 itself and treats a second action call as the same transfer?',
      alternative: 'Skipping the started row and inserting only after the bank responds removes the local record of an in-flight transfer. Two concurrent retries can then both see nothing and both pay.',
    },
  },
  'distributed-locks': {
    morning: {
      title: 'The grant is not the critical section',
      why: 'A lock service can keep one grant outstanding in its own state. The work protected by the lock happens somewhere else, and a pause lets that work outlive the grant.',
      explain: `What the lock service can guarantee is about its own record. At the time it grants the lock, it has not granted an overlapping unexpired lease to anyone else, and it will not do so until this grant is released or expires. If the lock service is backed by a quorum, that grant record has the order the quorum provides. Cooperating clients can use it as a mutex for the lease interval.

The guarantee does not include the holder body. The critical section runs in the holder process and writes to some other system. If that process pauses longer than the remaining lease, in a long garbage collection or a frozen machine, the lock service expires the grant and gives the lock to someone else. That second grant is correct. The first holder then wakes, still inside the section, and writes. Two writers overlap. A client that never took the lock can write the whole time, because the lock is advisory. The pause breaks the step the lock service cannot see: the holder stopping when the lease ends.`,
      question:
        'A lock service gives worker A a 10 second grant, backed by a quorum. A pauses for 30 seconds inside the section. What did the lock service guarantee, and what does the pause break?',
      hints: [
        'The guarantee is about overlapping grants in the lock service, for the lease interval.',
        'The writes A performs after waking go to a different system, which never saw the lease.',
      ],
      outline: [
        'The service guaranteed one unexpired grant at a time in its own record.',
        'After 10 seconds it can grant the lock to worker B, and that grant is valid.',
        'A wakes still inside the section and writes after B has the lock.',
        'The pause broke the assumption that the holder stops writing when the grant ends.',
      ],
      solution: `The lock service guaranteed its own grant record. For those 10 seconds it would not hand a second unexpired grant to another worker, and the quorum ordered that decision. When the 10 seconds pass, the service is free to grant the lock to worker B. Doing so does not violate the guarantee. The lease ended. B is the holder the service will name if you ask it.

The pause breaks the critical section, not the grant record. A is stopped while it believes it holds the lock, including past the expiry. On wake it continues the section and writes to the database or the file the lock was meant to protect. Those systems do not know about the lease. B may be writing at the same time, also believing it is the only holder. The overlap is real even though the lock service never had two unexpired grants. A client that ignores the lock service can overlap them too. The quorum made the grant linearizable. It did not make A pause shorter than 10 seconds.`,
      rubric: [
        'The guarantee is one unexpired grant in the lock service, not an exclusive critical section after the lease.',
        'The pause lets A write after B has a valid grant, because the write happens outside the lock service.',
      ],
      myth: [
        'A lock backed by consensus makes the critical section safe for as long as the holder takes.',
        'Consensus orders the grant. If the holder pauses past the lease, a new grant is issued and the old holder can still write.',
      ],
      context:
        'This is why a long task protected only by a 10 second lock fails in production during a stall that nobody reproduced in a demo. The stall is longer than the lease, so the lease works and the task does not.',
      tradeoff: 'A long lease gives a slow section time to finish and widens the damage if the holder dies and the lock sits until expiry. A short lease fails over faster and loses to ordinary pauses.',
      mistake: 'Renewing the lease in a background thread that the same pause freezes, and treating the renewal as proof the section is still exclusive.',
      followUp: 'What does the database have to check on A write if it is to reject A after B has been granted the lock?',
      extension: 'A third worker never calls the lock service and writes the same row. What in the lock guarantee was supposed to stop it?',
      alternative: 'A compare-and-swap on the row the workers are editing checks exclusion at write time. It does not depend on the holder staying awake, and it only works for a store that can do the compare.',
    },
    evening: {
      title: 'Claim the day in the table',
      why: 'A lock around a job is an extra system that can be wrong about time. A unique key checked at write time makes the second worker stop without a lease.',
      explain: `Prefer the design that does not take the lock when the store you are writing can reject the duplicate itself. Insert the identity of the work first, under a unique constraint, and do the rest of the job only if the insert won. The loser sees the constraint failure and exits. There is no lease to outlive, because exclusion is decided at the insert, not at the start of a long critical section.

Keep the lock, and fence it, when the side effect goes to a system that cannot reject a duplicate. A device or a vendor that acts on the first request it sees will do the work twice if two holders both reach it. The lock is then the mutex, and the downstream system still has to refuse the holder whose grant is no longer current. For a row you control, that extra machinery is the long way around.`,
      question:
        'Two workers build the daily settlement file for a calendar day. Prefer a design that does not need a distributed lock. Say what you would do instead if the only effect was a device that cannot reject duplicates.',
      hints: [
        'The calendar day can be a primary key the second insert will lose.',
        'Claim that row before uploading the file, not after.',
      ],
      outline: [
        'Insert a settlement row keyed by the day before doing the rest of the job.',
        'The worker that loses the unique constraint exits and does not upload.',
        'The winner uploads the file. A lock service is not in the path.',
        'A device that cannot reject a second command would instead need a lock plus a fence.',
      ],
      solution: `Insert the settlement row for that calendar day first, with the day as the primary key, in the database you already have. Exactly one worker insert commits. The other gets a constraint failure and stops, and it does not upload a file. The winner builds the file and uploads it. If the winner crashes after the insert, a retry sees the row and finishes or resumes. It does not start a second settlement for the same day. No lock service, no lease, and no paused holder that still thinks it owns the day. The check happens at the write, so a pause before the insert only delays a worker. It does not let two uploads both believe they won.

If the effect is a device that prints or pays on every command and has no conditional write, the unique key is not there to lose. Then take the lock, and make the device reject commands that carry an expired grant. The lock alone is the design you just left behind for the file: two holders can still send two commands if one of them paused past the lease. For the settlement file you do not need that pair. The table can refuse the second day.`,
      rubric: [
        'The settlement is claimed by a unique key on the day before the upload, and the lock service is not required.',
        'The device case is separated as the one that still needs a lock and a fence, because the device cannot reject the duplicate.',
      ],
      myth: [
        'Any job that must run once needs a distributed lock around the whole job.',
        'A unique key on the work identity runs the job once when the store you write can enforce it. The lock is for the effect that cannot.',
      ],
      context:
        'Daily jobs, invoice numbers, and "send the Tuesday mail" are usually a row you can claim. The lock shows up when people wrap that row in a lease out of habit.',
      tradeoff: 'The unique row serializes the job and leaves a started row to clean up if the winner dies. A lock leaves a lease to expire, and a paused winner can still emit a second file.',
      mistake: 'Uploading the file first and inserting the day row afterward, so two workers both upload before either insert loses.',
      followUp: 'The winner dies after inserting the row and before the upload. How does a later worker know it may finish that row?',
      extension: 'What unique key would you use if two regions can both settle the same day for the same customer?',
      alternative: 'A single worker process, with no standby, also avoids the lock. You then wait for a human when that process is down, which is the availability you traded away.',
    },
  },
  'fencing-tokens': {
    morning: {
      title: 'Put a rising number on the write',
      why: 'The lock grant has to show up in the write itself. Otherwise the store will accept whoever still remembers an old grant and happens to wake up last.',
      explain: `The lock service returns more than a yes. It returns a token that increases on every grant: 40, then 41, then 42. The holder did not choose the number, and a restart of the lock service must not hand out a smaller one. Every write the holder sends to storage includes the token it was given. Storage remembers the highest token it has accepted for that object and rejects a write whose token is lower.

The check has to live in storage. A token that only the lock service understands does not travel with the write, and the database will store whatever arrives. The same holder reuses its token for later writes in the same grant, so storage rejects a strictly older token and accepts the current one again. Once storage has seen 41, a paused holder still carrying 40 cannot overwrite that object.`,
      question:
        'A lock grant returns a monotonic token, and the holder writes invoices. How do you attach the token so a paused former holder cannot overwrite a newer grant?',
      hints: [
        'The token has to be part of the write the database sees, not only part of the lock request.',
        'Storage needs the highest token it has already accepted, and it rejects a lower one.',
      ],
      outline: [
        'The lock service issues the token, and the number only rises.',
        'Each invoice write from the holder carries that token.',
        'Storage records the max token accepted for the invoice.',
        'A write with a lower token is rejected, which stops the paused holder after the newer token has been stored.',
      ],
      solution: `Attach the token to the invoice write. If the grant came back as 41, the holder sends 41 with every save of that invoice. The invoice row stores the highest token it has accepted. The update is conditional: apply the body only when the stored token is less than or equal to the token on the write, and then keep the greater of the two. A holder whose grant is 41 can save twice with 41. A holder that woke up holding 40 fails the condition once 41 is stored, and the body from the newer grant remains.

The token has to be issued by the lock service and only increase, including across a failover of that service. A holder that picks its own timestamp can collide or go backward. And the newer holder has to land token 41 in storage before the paused holder write is the one you are trying to stop. Until storage has seen 41, a write with 40 still satisfies "40 is the highest so far" and will be accepted. The attachment is the token on the write plus the memory in the row. A token that stays inside the lock client does not fence the invoice.`,
      rubric: [
        'The monotonic token from the lock grant is included on the holder writes, and storage persists the max it has seen.',
        'Storage rejects a lower token, with the limit that the higher token must already be stored.',
      ],
      myth: [
        'Holding a fencing token is enough, because the old holder will notice it lost the lock and stop writing.',
        'The old holder is paused and will not notice. The store has to reject the write. The token is for the store, not for the holder conscience.',
      ],
      context:
        'The number can be a lock-service sequence or a version the quorum already maintains. The important part is that storage, not the worker, compares it.',
      tradeoff: 'Checking the token on every write rejects stale holders and adds a condition to every update. Skipping it keeps the write path smaller and admits the paused holder.',
      mistake: 'Logging the token in the worker and sending a plain invoice write with no token column.',
      followUp: 'Storage has seen token 41. The same holder sends another write with 41. Why is that one accepted?',
      extension: 'The lock service restarts and grants token 1 again. What does the next write from a new holder do to an invoice that already stores 41?',
      alternative: 'A single-threaded writer process, with storage that only accepts connections from that process, removes the second holder. You have to fence the connection instead of the token, and a paused process can still hold the socket.',
    },
    evening: {
      title: 'The row refuses the old save',
      why: 'The interesting moment is the late write, not the lock call. Storage has already seen the new token, and the former holder is writing the previous one.',
      explain: `Walk the two grants in time order so the rejection has something to compare. The first holder gets token 40 and starts the save. It pauses past the lease. The second holder gets token 41, writes the invoice, and the row now stores 41. The first holder wakes and sends its save with 40. This is the write that has to fail.

The store does not need to know who paused. It needs the condition on the row. If the stored token is greater than the token on the write, the update matches nothing and the previous body stays. The former holder sees a rejected write. The reader sees the body that token 41 stored.`,
      question:
        'Holder 40 pauses past the lease. Holder 41 writes invoice 9, and the row stores fence 41. Holder 40 then sends its save. Show the storage system rejecting that write.',
      hints: [
        'The rejection is a conditional update that compares the stored fence with 40.',
        'Holder 41 has already stored 41, so the comparison has a number to beat.',
      ],
      outline: [
        'The invoice row has fence 41 and the body from holder 41.',
        'Holder 40 sends a write with token 40 after waking.',
        'The update condition requires the stored fence to be at most 40, which fails.',
        'The write is rejected and the body from token 41 remains.',
      ],
      solution: `The row for invoice 9 currently has fence 41 and the body holder 41 wrote. Holder 40 sends an update that sets the body to its older contents and sets fence to 40, with the condition that the stored fence is less than or equal to 40. The stored fence is 41, so the condition matches zero rows. The store rejects the write. The body on the row is unchanged. A reader after this attempt still sees the invoice holder 41 saved, not the one holder 40 was holding in memory through the pause.

The order is the reason this attempt loses. Holder 41 checked its token into the row before the late save. If holder 40 had flushed token 40 before holder 41 wrote anything, the row would have accepted 40, because 40 would have been the highest token stored at that moment. Fencing stops the former holder from winning after the new token is on the row. It does not rewind a write that got in first. The storage rejection you can show here is the conditional update matching nothing, with fence 41 left in place.`,
      rubric: [
        'The row already stores fence 41, and holder 40 write carries token 40.',
        'The conditional update matches nothing, so the write is rejected and the newer body remains.',
      ],
      myth: [
        'The lock service rejects the late write, because it knows the lease expired.',
        'The lock service is not on the write path. The invoice store rejects it by comparing tokens. If the store never sees the token, the late body lands.',
      ],
      context:
        'You can see this as an update count of zero in the database log, next to a worker error that says the fence was stale. That pair is a prevented split write, not a failed invoice.',
      tradeoff: 'Rejecting the stale save protects the newer body and forces the old worker to surface an error. Accepting it is quiet and puts the paused worker data back on the invoice.',
      mistake: 'Retrying the rejected save in a loop with the same token 40, which will keep matching zero rows.',
      followUp: 'Holder 41 has the lock and has not written yet. Holder 40 writes token 40 first. What does the row contain, and what must holder 41 still do?',
      extension: 'How would you fence a file in object storage that has no conditional update on a numeric column?',
      alternative: 'A generation column that storage bumps on every write, with the holder sending the generation it read, also rejects a stale save. It fences against any stale reader, not only against lock holders, and it does not tie the number to the lock grant.',
    },
  },
  backpressure: {
    morning: {
      title: 'Stop the sender that can slow down',
      why: 'Overload has to become visible to the process that is creating the work. A buffer inside the receiver hides the signal until the receiver runs out of memory.',
      explain: `Backpressure is a limit pushed toward the caller that can reduce the rate. The resize service has 32 workers. When all 32 are busy, it does not accept an unbounded queue of extra images. It returns 429 to the uploader, or it stops reading the socket so the uploader write blocks when the TCP window fills. The uploader is the process that can slow down. It sees the limit while the work is still in its hands.

A queue inside the resize process that accepts every upload does the opposite. The uploader keeps sending, because every call looks successful, and the process memory holds the work the workers cannot finish. The caller that could have waited or shed a thumbnail never heard a signal. Push the limit out to that caller. An internal retry that re-queues the same image is not backpressure. It is more load.`,
      question:
        'The resize service has 32 workers, all busy, and uploaders are still sending. How do you push that overload back to the caller that can slow down?',
      hints: [
        'The uploader can reduce its send rate only if the send blocks or fails quickly.',
        'An internal queue that returns success immediately does not reach the uploader.',
      ],
      outline: [
        'Cap in-flight resizes at 32 and do not queue the rest inside the process.',
        'Return 429, or stop reading so the uploader write blocks.',
        'The uploader then slows its own send loop.',
        'An internal unbounded queue would hide the limit until memory is gone.',
      ],
      solution: `Refuse the 33rd image at the edge of the process. Return 429 with a short Retry-After, and do not read a request body you cannot hand to a worker. Or stop reading the connection and let the TCP window close, so the uploader next write blocks in its own socket. Either way the uploader learns, on this send, that the service is full. A well-behaved uploader then reduces its rate or delays the next image. That is the caller that can slow down. The 32 workers keep finishing the images they already have.

What does not push back is accepting the body, putting it on an in-process queue, and returning 200. The uploader will send another, and the queue will grow for every uploader at once. The signal appears only when the process is out of memory and dies, which slows everyone by failing, not by asking them to wait. Also do not let the resize service retry against itself. The extra attempt is load generated inside the overloaded process. The backpressure belongs on the uploader send.`,
      rubric: [
        'The 33rd request is rejected or the socket stops being read, so the uploader observes the limit.',
        'An internal queue that returns success is rejected as hiding the overload from the sender.',
      ],
      myth: [
        'A big internal buffer is backpressure, because it absorbs bursts so callers do not see errors.',
        'Absorbing the burst hides the limit from the caller that can slow down. Backpressure is the caller feeling the limit.',
      ],
      context:
        'TCP already has this mechanism in the receive window. Application code that reads everything into a queue throws that signal away and builds a second, unbounded one.',
      tradeoff: 'Returning 429 makes the overload visible and drops some images at the sender. Buffering them inside the service keeps the sender happy until the service falls over.',
      mistake: 'Adding more internal queue length after an out-of-memory restart, so the next overload lasts longer before it fails.',
      followUp: 'The uploader ignores 429 and sends faster. Where does the limit have to move?',
      extension: 'What changes if the "caller" is a mobile client on a flaky network rather than a backend uploader you operate?',
      alternative: 'A fixed-size queue in front of the 32 workers, which blocks the accept path when the queue is full, also pushes back. It adds a small burst cushion and still has to block or reject when that cushion is gone.',
    },
    evening: {
      title: 'The queue that fails all at once',
      why: 'A durable queue can take the success path for a long time while consumers are already behind. When it finally fills, every producer fails together.',
      explain: `Watch the success code, not the consumer lag. While the queue has room, every publish returns success, including publishes from producers that could have slowed down. Consumer lag is the overload. It is invisible to the producer. The queue is converting a rate problem into a storage problem and promising the producers that storage is fine.

The storage ends. At the cap, the broker starts rejecting publishes. It does not reject only the producer that caused the spike. Every producer gets the error, including ones that send a trickle, because they share the full queue. The messages already accepted are minutes old and still have to drain before new work is fresh. The queue hid the overload until the failure was total.`,
      question:
        'Producers publish 1,000 messages per second onto a queue capped at 50,000. Consumers handle 100 per second. Explain how the queue hides the overload, and what happens when it is full.',
      hints: [
        'For most of the fill time, the publish call returns success.',
        'The cap is shared, so the rejection is not limited to the noisiest producer.',
      ],
      outline: [
        'The surplus is about 900 messages per second, so the cap is reached in roughly a minute.',
        'During that minute every publish succeeds, so producers do not slow down.',
        'When the queue is full, publishes fail for every producer at once.',
        'The 50,000 queued messages are already stale and still drain at 100 per second.',
      ],
      solution: `The queue hides the overload for about a minute. Producers outrun consumers by about 900 messages per second, and 50,000 divided by 900 is under a minute. In that minute every publish receives success. A producer that could have cut its rate, or a caller in front of that producer, sees a healthy write path. Dashboards of publish errors stay quiet. Consumer lag is the only honest graph, and the producers are not looking at it.

When the 50,000th message lands, the broker rejects publishes. The rejection hits every producer, not only the one that jumped to 1,000 per second. A heartbeat publisher that sends one message a second fails too, because the queue they share is full. Then the consumers spend 50,000 divided by 100, about eight minutes, draining messages that are already late, while new publishes still fail or compete with that drain. The overload was real at second one. The queue postponed the signal until it could only fail everyone, and the postponed work is still in the pipe.`,
      rubric: [
        'Publish success during the fill is what hides the overload from producers that could have slowed.',
        'A full queue then fails every producer, and the accepted backlog is still minutes of stale work.',
      ],
      myth: [
        'A queue protects the system from overload by decoupling producers from consumers.',
        'It decouples their latency until the cap. Then it couples them again as a shared failure, after the backlog has aged.',
      ],
      context:
        'Log pipelines and event buses fail this way. The publish graph is green on the way up and red for everyone at the cap, which is an unpleasant page if lag was not paged first.',
      tradeoff: 'A smaller cap surfaces the rejection sooner, when producers can still shed load, and it drops more publishes during a short burst. A larger cap rides out bursts and fails later, harder.',
      mistake: 'Alerting only on publish errors, which fire after the queue is already full and the backlog is old.',
      followUp: 'Which signal would you page on during the quiet minute, before the cap is hit?',
      extension: 'What happens to a low-rate producer if it has its own queue and its own cap, instead of sharing this one?',
      alternative: 'Rejecting publishes once lag passes a few seconds, while the queue is still mostly empty, returns the signal early. You give up some of the burst capacity the cap was bought to provide.',
    },
  },
  'circuit-breakers': {
    morning: {
      title: 'Closed, then a probe',
      why: 'The three states are a policy for one caller. They are defined by an error rate and by whether a probe is allowed through, not by how the dependency feels about itself.',
      explain: `Closed is the normal path. Calls go to the dependency, and the breaker counts failures over a window of calls or a stretch of time. When the error rate crosses the threshold, the breaker opens. A threshold of half of the last 20 calls, for example, opens it. A single unlucky call does not, unless you chose a threshold that small.

Open means the caller does not send the call. The breaker returns an error immediately and leaves the dependency alone. After a cooldown, the breaker becomes half-open. Half-open allows a small number of probe calls and still fails the rest at the breaker. If the probes succeed, the breaker closes and ordinary traffic resumes. If a probe fails, it opens again and the cooldown restarts. Half-open is not a fraction of production traffic. It is the probe.`,
      question:
        'Define closed, open, and half-open for a client of the shipping-rate service, in terms of error rate and a probe.',
      hints: [
        'Closed is the only state that sends ordinary traffic and measures its error rate.',
        'Half-open lets a few trial calls through after the cooldown, not half of all calls.',
      ],
      outline: [
        'Closed: calls go through, and an error rate over the threshold opens the breaker.',
        'Open: calls fail at the breaker without reaching the rate service, until the cooldown ends.',
        'Half-open: a few probes are sent. Success closes the breaker. Failure opens it again.',
        'The rest of the traffic during half-open still fails fast at the breaker.',
      ],
      solution: `Closed: the client sends shipping-rate calls to the service and counts failures, timeouts included, over a window such as the last 20 calls. If the error rate crosses the threshold you set, the breaker opens. Below the threshold it stays closed and traffic is unchanged. The rate is the client observation, not a status page inside the rate service.

Open: for the cooldown, this client does not call the rate service. The user request fails at the breaker, or takes a fallback you defined, without waiting for the dependency. When the cooldown ends, the breaker becomes half-open. Half-open sends a probe, say one or two calls, and no more. If those probes succeed, the breaker closes and the next ordinary calls go through. If a probe fails, the breaker opens and the cooldown starts again. During the probe, every non-probe call still fails at the breaker. You have not turned on half the traffic. You have asked a question, and you are waiting for the answer before you close.`,
      rubric: [
        'Closed measures an error rate and opens when the threshold is crossed. Open fails calls without sending them.',
        'Half-open is defined as a small probe after the cooldown, with success closing and failure reopening.',
      ],
      myth: [
        'Half-open means about half of the requests are allowed through to test the water.',
        'Half-open allows a few probe calls. The other calls still fail at the breaker until the probes succeed and the state closes.',
      ],
      context:
        'The breaker is local to each client process. Ten clients each with a closed breaker are ten independent error-rate windows, which is why one hot client can open while another stays closed.',
      tradeoff: 'A long cooldown protects a sick dependency from probes and keeps users failing after the dependency has recovered. A short cooldown probes quickly and can hammer a service that is still falling over.',
      mistake: 'Counting ordinary user 404s in the error rate, so missing data opens the breaker on a healthy service.',
      followUp: 'The probes succeed and the breaker closes. The next 20 calls then fail. What state do you end in, and why?',
      extension: 'Why can one client be open while another client of the same rate service is still closed?',
      alternative: 'A concurrency limit without a breaker keeps sending the allowed calls during the outage, so users wait. It protects threads and does not give the dependency a quiet cooldown.',
    },
    evening: {
      title: 'The breaker becomes the outage',
      why: 'A breaker that opens on a tiny sample, and then stays open, fails traffic the dependency would have served. Users experience the breaker.',
      explain: `Look at the threshold and the cooldown together. A handful of timeouts is not an error rate over a meaningful window. If that handful opens the breaker, one blip redirects every later call to an immediate error. The dependency can be healthy for the whole cooldown. The only component returning errors is the breaker.

The probe does not save you if it is late and easy to fail. A cooldown of a minute means a minute of user-facing failure after three unlucky calls. A single probe that hits one more timeout opens the minute again. The breaker was added to limit an outage. With these numbers it is the outage.`,
      question:
        'The shipping-rate breaker opens after 3 failures in any window of 5 calls, then stays open for 60 seconds. A 2 second stall causes 3 timeouts, and the service then returns 200. Show how the breaker becomes the outage.',
      hints: [
        'After the third timeout the rate service is healthy again. The client has stopped calling it.',
        'Checkout treats a breaker error as "cannot price," so the user cannot buy.',
      ],
      outline: [
        'Three timeouts in five calls cross the threshold during a short stall.',
        'The breaker opens for 60 seconds and does not send ordinary rate calls.',
        'Checkout fails pricing for that minute even though the rate service would return 200.',
        'A probe that also times out restarts the 60 seconds, so the breaker keeps the outage going.',
      ],
      solution: `The stall produces three timeouts. Three failures in a window of five crosses the threshold, so the breaker opens. The stall is already over, and a direct call would get 200. The client does not make that call. For 60 seconds every checkout that needs a rate fails inside the client. The user sees a pricing error. The rate-service graphs show a quiet minute and a healthy process. The errors on the purchase path are manufactured by the open breaker. That is the outage.

The sample is what made it eager. Five calls is small enough that one stall, or one noisy customer, opens a shared breaker for every user of that client. The 60 second cooldown is what keeps it the outage after the dependency has recovered. If the half-open probe then lands on a single slow call, the breaker opens for another 60 seconds and the quiet dependency stays uncalled. Raise the window and require a real rate, shorten the cooldown, and do not count a failure mode the dependency is using to reject bad input. A breaker that trips on three calls is not limiting an outage. It is converting a two-second stall into a minute of failed checkouts.`,
      rubric: [
        'Three timeouts open the breaker, and the following minute of checkout failures happens while the rate service would succeed.',
        'The small window and the long cooldown are what turn the breaker into the outage, including a probe that reopens it.',
      ],
      myth: [
        'If the breaker is open, the dependency is down, so the user errors are the dependency outage.',
        'Open means the client stopped calling. The dependency can be healthy, and the user errors are then the breaker itself.',
      ],
      context:
        'This is a common incident review: the downstream service was green, and the client pool was red, because every instance opened on the same small threshold during a brief stall.',
      tradeoff: 'A sensitive breaker protects a dependency from a retry storm and creates false outages. A dull breaker avoids false outages and keeps sending traffic into a dependency that is actually failing.',
      mistake: 'Setting the threshold from a test that sent five requests, then using that threshold for the whole checkout path.',
      followUp: 'How would you change the window so one stall of three calls cannot open the breaker?',
      extension: 'One route returns 500 for a bad SKU and shares this breaker. What happens to the other routes?',
      alternative: 'Failing only the requests that time out, with no breaker, avoids turning the stall into a minute of synthetic errors. You then keep calling a dependency that might be truly down, which is the load the breaker was meant to shed.',
    },
  },
  bulkheads: {
    morning: {
      title: 'One dependency gets its own limit',
      why: 'A slow call occupies a worker until it returns. If every route shares the workers, the slow dependency takes the process, not only its own feature.',
      explain: `Threads, connections, and in-flight slots are the resource a slow dependency consumes. The reviews service starts taking two seconds. Every request that calls it holds a worker for those two seconds. If login, checkout, and reviews share one pool of 40 workers, the reviews calls occupy all 40. Login has no worker left, even though login never calls reviews.

A bulkhead is a separate limit for that dependency. Put reviews behind a semaphore of 4, or a pool of 4 connections, and leave the other workers unable to enter that call. When reviews is slow, at most 4 workers sit in it. The rest of the process keeps serving routes that do not need it. The slow dependency can fail its own feature. It cannot spend the whole process.`,
      question:
        'One process serves login and also calls a reviews service. Reviews become slow. How do you isolate that dependency so it cannot consume every worker?',
      hints: [
        'The shared resource is the worker pool, not the reviews SLA.',
        'A separate small limit for reviews leaves the other workers free of that call.',
      ],
      outline: [
        'Shared workers let slow reviews calls occupy the whole pool.',
        'Login then waits even though it does not call reviews.',
        'Give reviews its own semaphore or connection pool, smaller than the process pool.',
        'At most that many workers block in reviews. Login keeps the others.',
      ],
      solution: `Split the limit. Keep the process pool for routes, and allow only 4 of those workers, or 4 outbound connections, to be inside the reviews call at once. The fifth reviews call does not take a fifth worker into that wait. It fails or degrades at the bulkhead. When reviews takes two seconds, four workers are slow and the other workers stay available for login. Login no longer lines up behind a reviews stall it does not use.

Without the split, each reviews request checks out a worker from the only pool and holds it for the whole slow call. Forty such requests, or a mix that fills the pool, leave login with nothing to run on. The process looks busy and the dependency that is actually slow is reviews. Isolation means the slow call has a ceiling you chose, and the ceiling is smaller than the pool the rest of the process needs. A timeout alone does not do this. Forty workers can still sit inside a two-second timeout together.`,
      rubric: [
        'Reviews is given a limit smaller than the shared worker pool, so a slow reviews call cannot take every worker.',
        'Login keeps workers that are not allowed to enter the reviews call.',
      ],
      myth: [
        'A timeout on the reviews call isolates it, because the worker is released when the timer fires.',
        'Until the timer fires, the worker is held. Enough concurrent slow calls hold every worker. The bulkhead caps how many can be held.',
      ],
      context:
        'Process pools, database connection pools, and outbound HTTP clients are the usual places a dependency borrows a slot. The bulkhead is a separate pool or semaphore around the risky borrow.',
      tradeoff: 'A tiny reviews limit protects login and starts rejecting reviews while the dependency is only somewhat slow. A large limit isolates less and leaves login exposed.',
      mistake: 'Adding a timeout and a retry on the shared pool, which holds workers for the timeout and then holds more of them for the retry.',
      followUp: 'Reviews is fast again. What keeps the semaphore from still limiting a traffic spike that login does not care about?',
      extension: 'Name a second resource, besides threads, that a slow database dependency can exhaust in this process.',
      alternative: 'Running reviews in a separate process isolates it even when the bulkhead number is wrong, and it costs a deploy, a network hop, and its own failure mode.',
    },
    evening: {
      title: 'Split the outbound pools',
      why: 'The bulkhead has to name a real pool. The rejected work needs a defined result, or the limit is only a comment above a shared client.',
      explain: `Pick the pool that the slow dependency actually checks out. If shipping rates and reviews share one outbound HTTP pool, reviews slowness holds the connections rates needs. Split that client pool. Rates keep enough connections for checkout. Reviews get a small pool you can afford to see blocked.

Then decide what the rejected reviews call returns. The caller is inside a page load. It should hear a local rejection immediately, skip the snippets or fill in a default, and finish the page. It should not sit until a shared timeout, and it should not fail the rate quote that was using a different pool.`,
      question:
        'Checkout calls shipping rates and also fetches review snippets, through one outbound HTTP pool. Name the pool or limit you would split, and say what the rejected reviews work sees.',
      hints: [
        'The shared resource is the outbound connection pool, which both calls check out from.',
        'Rejected reviews can omit snippets. They should not wait on a connection rates still needs.',
      ],
      outline: [
        'Split the outbound HTTP pool into a rates pool and a reviews pool.',
        'Give rates enough connections to serve checkout, and give reviews a small cap.',
        'When the reviews cap is full, the next reviews call is rejected locally.',
        'That call sees an immediate rejection and the page omits snippets. Rates calls still have their pool.',
      ],
      solution: `Split the outbound HTTP pool. Give shipping rates its own pool of 16 connections, and give reviews its own pool of 4. Checkout rate quotes check out from the 16. Review snippets check out from the 4. When reviews is slow, it can block at most those 4 connections. The 16 rate connections stay available, so a reviews stall does not empty the pool checkout uses to price shipping.

The fifth reviews call does not wait for a connection. It sees an immediate rejection from the bulkhead, in the process, without a socket to the reviews service. The page handler catches that rejection, omits the snippets, and still returns the hotels and the rate quote. The user sees a page without reviews, not a hung checkout and not a shipping error. If you instead queue the rejected call on the shared pool, it waits behind the slow reviews traffic and the split was only a name. The rejected work has to observe the local limit, and the rates pool has to be a different set of connections.`,
      rubric: [
        'The outbound HTTP pool is split into a rates pool and a smaller reviews pool, with sizes that keep rates independent.',
        'Rejected reviews work sees an immediate local rejection and a page without snippets, not a wait on the rates connections.',
      ],
      myth: [
        'A bulkhead that rejects work should fail the whole request, so the user does not see a partial page.',
        'The rejection is the reviews call. The page can omit snippets and still return rates. Failing the whole request spends the isolation on a feature the limit was meant to protect.',
      ],
      context:
        'Browsers already do this when a slow third-party widget is not allowed to block the document. The server-side version is a separate connection pool and a handler that tolerates its rejection.',
      tradeoff: 'Omitting snippets keeps checkout up and hides review outages from the user. Failing the page makes the reviews outage obvious and takes checkout with it.',
      mistake: 'Creating two pool names that still share one connection manager, so the cap is not real.',
      followUp: 'What does the rate quote see if its own pool of 16 is exhausted while reviews is healthy?',
      extension: 'Which limit would you split if rates and reviews shared a database connection pool instead of an HTTP pool?',
      alternative: 'A deadline of 50 ms on reviews, with no separate pool, also stops a slow call from holding a worker for long. Forty calls can still occupy forty workers for those 50 ms, which the separate pool of 4 would have capped.',
    },
  },
  'retry-amplification': {
    morning: {
      title: 'Three loops, one tap',
      why: 'Each layer retry looks small on its own diagram. Nested, they multiply, and the bottom service receives the product, not the sum.',
      explain: `Count attempts, not retries, and multiply across layers. The app tries the gateway up to 3 times: the first call plus two retries. For each of those, the gateway tries the shipment service up to 3 times. For each of those, the shipment service tries the carrier up to 3 times. The carrier is the bottom. It does not retry. It just receives the product.

One user action that uses every retry is 3 times 3 times 3 carrier calls, which is 27, if every layer resets its own counter. If the app only tries twice and the other two layers try three times, the product is 18. Write the tree. A mental model of "we retry twice, so the load doubles" misses the layers underneath and undercounts by a lot when the bottom service is already the one timing out.`,
      question:
        'The app tries the gateway up to 2 times, the gateway tries the shipment service up to 3 times per attempt, and the shipment service tries the carrier up to 3 times per attempt. Trace one user tap-plus-retry down to the carrier.',
      hints: [
        'The app 2 includes the original call and one retry. Each of those enters the gateway loop.',
        'Multiply the attempts. Do not add the retry counts.',
      ],
      outline: [
        'One user action sends 2 requests from the app to the gateway.',
        'Each gateway request makes up to 3 shipment calls, so 6 shipment calls.',
        'Each shipment call makes up to 3 carrier calls, so 18 carrier calls.',
        'The carrier sees the product of the three loops, from a single tap that retried once.',
      ],
      solution: `Start at the app. The user taps once, the first request times out, and the app sends one retry. That is 2 requests into the gateway. Take the first of those. The gateway calls the shipment service, gets a 503 or a timeout, and uses both of its extra tries. That is 3 shipment calls for the first app request. Each of those 3 runs the shipment loop: the first carrier call plus two retries, so 3 carrier calls. The first app request therefore causes 9 carrier calls. The numbers are 1 app request, times 3 shipment attempts, times 3 carrier attempts.

The retry from the app does the same work again, because the gateway and the shipment service do not know they already spent their loops on the first request. Another 3 shipment calls, another 9 carrier calls. The tap-plus-retry produces 18 carrier calls. If any layer stops early because a try succeeds, the live number is smaller. The capacity you have to plan for is the product, 2 times 3 times 3, since the outage is when they all fail and every loop runs to its end.`,
      rubric: [
        'The trace multiplies 2 app attempts, 3 gateway-to-shipment attempts, and 3 carrier attempts.',
        'The result is 18 carrier calls for one user tap that retried once, not the sum of the retry settings.',
      ],
      myth: [
        'If every layer retries twice, the downstream load is about twice the user traffic.',
        'Independent loops multiply. Two times three times three is eighteen carrier calls, and the bottom service sees every one of them.',
      ],
      context:
        'Meshed services with a default retry policy do this without a design review. Each team turns on two retries because two feels modest, and the carrier dashboard takes the product.',
      tradeoff: 'Retries at every layer hide a single dropped packet from the user and multiply load during the outage you are retrying through. Retries only at the edge do less hiding and less damage.',
      mistake: 'Setting each layer retry count by looking at that layer dashboard alone, during a quiet week.',
      followUp: 'If the shipment service stops calling the carrier after the first timeout, how many carrier calls does the same tap-plus-retry produce?',
      extension: 'What does the carrier see if all 18 calls are in flight together because every timeout is longer than the gap between retries?',
      alternative: 'A single retry at the app, and no retries in the gateway or the shipment service, caps this tap at 2 carrier calls. You lose the ability for a middle layer to mask a one-off 503.',
    },
    evening: {
      title: 'One budget for the whole chain',
      why: 'Each layer having its own retry counter is how eighteen becomes the plan. A shared budget is a number that gets spent, not reset, as the call moves down.',
      explain: `Put the remaining attempts on the request and decrement them at every outbound call, including retries. When the counter hits zero, a layer returns the error upward instead of starting another try. The client retry must continue the same budget, not reset it to the original number. Otherwise the user tap and the user retry are two full trees.

Pick a cap that cannot become dozens. Three carrier calls for one tap is a budget. Eighteen is a bug. The deadline travels with the count: a layer does not start a try that cannot finish before the deadline, even if the count has attempts left. Count and time together stop one request from fanning out.`,
      question:
        'The same app, gateway, and shipment service all want to retry carrier calls for one photo-unrelated shipment tap. Put a budget on the chain so one tap cannot become dozens of carrier calls.',
      hints: [
        'The budget has to be shared. A fresh counter at each hop multiplies again.',
        'The app retry has to send the remaining budget, not a new full budget.',
      ],
      outline: [
        'Start the user action with a small attempts-left, such as 3, on the request.',
        'Every carrier call decrements that shared counter, whichever layer initiates it.',
        'At zero, layers return the error instead of retrying.',
        'The app retry continues the leftover count and also stops when the deadline cannot fit another try.',
      ],
      solution: `Attach attempts-left: 3 to the user action, and pass that header through the app, the gateway, and the shipment service. Every call to the carrier decrements it, no matter which layer decided to try. When the header is 0, the shipment service returns the carrier error and the gateway does not schedule another shipment call. The worst case for one tap is 3 carrier calls, not 2 times 3 times 3. A layer may spend a retry only by spending this counter. Nobody keeps a private loop.

The app retry has to send the leftover, not 3 again. If the first request used 2, the retry sends attempts-left: 1. If the first request used 3, the retry sends 0 and the gateway fails it locally without touching the carrier. Also send the deadline. A layer that sees attempts-left above 0 and sees less time remaining than one carrier timeout does not start the call. It returns the error and leaves the count unspent or spent, but it does not add a call that cannot finish. One tap then stays inside a handful of carrier calls even when every layer would have preferred to be helpful on its own.`,
      rubric: [
        'A single attempts-left budget is shared across the app, the gateway, and the shipment service, and it is not reset per hop.',
        'The cap keeps one tap at a handful of carrier calls, and the client retry continues the leftover budget.',
      ],
      myth: [
        'Exponential backoff at each layer is a budget, because the calls spread out in time.',
        'Backoff spaces the calls. It does not stop each layer from running its full loop. The product can still be dozens, only slower.',
      ],
      context:
        'The header is a simpler cousin of a deadline that every hop already understands. The attempt count is there because a deadline alone still allows a tight loop of tiny retries.',
      tradeoff: 'A budget of 3 saves the carrier during an outage and gives up some of the packet-loss hiding that three independent loops provided on a healthy day.',
      mistake: 'Adding the shared header and also leaving each layer private retry loop on, so the header is only logged.',
      followUp: 'The first request is still in flight and has used 1, and the app retry sends attempts-left: 3 by mistake. What does the carrier see?',
      extension: 'How would a cluster-wide cap of ten percent extra calls differ from this per-tap budget when one user retries forever?',
      alternative: 'Disabling retries below the app, and allowing the app one retry, also caps the tap at 2 carrier calls. Middle layers cannot mask a blip, and the multiplication is gone.',
    },
  },
  'delivery-illusions': {
    morning: {
      title: 'Once in your state, twice outside it',
      why: 'A transaction around your own row and your offset makes your state transition once. The email or the charge you already handed to someone else is a different claim.',
      explain: `Exactly-once processing means the consumer state changes once for a message. You get that by committing the state change and the "this message id is done" record in one transaction. A crash rolls both back, and a redelivery applies them once. If the effect you wanted was another write inside that same transaction, including a log append the transaction covers, that write is in the same claim.

Exactly-once effects means the outside world changed once. A webhook, a card charge, or an email is not inside the consumer transaction. If you send the webhook and then crash before the commit, the transaction rolls back, the message is delivered again, and the webhook fires again. The local counter does not double. The partner already saw two calls. Ordering the webhook after the commit avoids the duplicate and risks never sending it if you crash in between. Neither order is exactly-once for an outside effect that does not itself dedupe.`,
      question:
        'A worker increments a local ledger counter and sends a partner webhook for the same message. Separate exactly-once processing of the counter from exactly-once effects at the partner.',
      hints: [
        'The counter and the message id can commit in one transaction.',
        'The webhook is already visible to the partner even if your transaction later rolls back.',
      ],
      outline: [
        'Processing: the counter update and the processed message id commit together, so the counter moves once.',
        'A crash before that commit redelivers the message and retries the local transaction.',
        'Effects: the webhook is a second system, outside that commit.',
        'A crash after the webhook is sent and before the commit sends the webhook again on redelivery.',
      ],
      solution: `Exactly-once processing is the counter. Put the increment and the insert of the message id in one database transaction, and commit the offset with them or store the id in the same place the offset lives. If the worker crashes before that commit, the transaction does not stick and the message is redelivered. The retry increments once. If the worker crashes after the commit, the redelivery sees the message id and does not increment again. The ledger counter moves one time. That is a real property, and it is about your state.

Exactly-once effects is the webhook, and this transaction does not give it to you. The partner is another system. Send the webhook before the commit, crash, and the partner has the call while your transaction rolls back. Redelivery sends the webhook a second time. The counter is still correct. The partner saw two effects. Send the webhook after the commit and a crash in between leaves the counter updated and the webhook unsent, which is at most once for the effect. The partner can make the effect exactly once only by deduping on the message id itself. A transactional write to another topic you control is closer to the counter: it is inside a transaction you coordinate. The webhook is not.`,
      rubric: [
        'The counter is exactly-once processing because its update and the message id commit together.',
        'The webhook is separated as an outside effect that can fire twice if it is sent before that commit, or not at all if it is sent after.',
      ],
      myth: [
        'Committing the consumer offset transactionally gives exactly-once effects for the work the consumer does.',
        'It gives exactly-once changes to state inside that transaction. A webhook or a charge outside it can already have happened when the transaction rolls back.',
      ],
      context:
        'Log systems that advertise exactly-once processing mean the consume-transform-produce path they can commit. The phrase gets copied onto email and payments, which are the effects outside that path.',
      tradeoff: 'Sending the webhook before the commit favors delivery and allows duplicates. Sending it after favors the counter and can drop the webhook on a crash.',
      mistake: 'Marking the message done, sending the webhook, and calling the pair exactly-once because the offset commit succeeded in a test that did not crash.',
      followUp: 'The partner stores the message id and ignores a second webhook. What claim can you now make about the effect?',
      extension: 'A crash happens after the commit and after the webhook. Why is that case not a duplicate?',
      alternative: 'Writing the webhook to an outbound table in the same transaction as the counter, and having a sender dedupe by message id, moves the effect toward at-least-once delivery with a stored intent. The partner can still observe two HTTP calls if the sender crashes after a successful post.',
    },
    evening: {
      title: 'Keep one duplicate, stop the other',
      why: 'Some doubles waste a chart. Some doubles move money or boxes. The design is choosing which duplicate is allowed to exist, not banning the word duplicate.',
      explain: `List the effects of one message and ask who can see two of them. A second location point on a map is ugly and cheap. A second fare capture moves money. The first can be at-least-once with no store of message ids. The second needs a dedupe record that commits with the charge, or a receiver that enforces the id.

The choice is per effect, including two effects of the same message. You can tolerate a duplicate map update from a message you must not apply twice to the wallet. One consumer policy for the whole payload is how the tolerable duplicate and the forbidden one get the same retry behavior.`,
      question:
        'A trip message updates the driver location on the map and also captures the fare. Choose the duplicate you can tolerate and the one you must deduplicate.',
      hints: [
        'A second map point misplaces the car briefly. A second capture charges the rider again.',
        'The fare dedupe has to be enforced where the money moves, not only in the map cache.',
      ],
      outline: [
        'Tolerate a duplicate location update. The map can show a repeated or slightly stale point.',
        'Do not spend a dedupe store on the location if loss or duplication is acceptable there.',
        'Deduplicate the fare capture using the trip id at the payment write.',
        'A retried message may apply the location twice and must apply the capture once.',
      ],
      solution: `Tolerate a duplicate location. The map consumer can apply the point every time the message is delivered. Two deliveries draw the same car twice, or briefly move it backward if an older point arrives later, and the next point fixes it. You do not need a processed-message table for that effect. At-least-once delivery is acceptable because the duplicate is a picture, not a charge. If an older point overwriting a newer one bothers the product, that is an ordering fix, not a money dedupe.

Deduplicate the fare. The capture has to commit with a unique trip id, or the payments system has to ignore a second capture for that trip. A retry after a lost response must return the original capture and must not create another. The duplicate you cannot tolerate is a second charge for one trip. The message can still be delivered twice. The location effect may run twice. The money effect must not. Putting both effects behind one "exactly once" switch either spends dedupe effort on the map or, worse, leaves the fare as exposed as the map. Split them.`,
      rubric: [
        'The location duplicate is explicitly tolerated as a cheap, visible map glitch.',
        'The fare capture is the effect that must be deduped at the payment write, keyed by the trip.',
      ],
      myth: [
        'The whole message is either exactly-once or at-least-once, so every field gets the same delivery treatment.',
        'Fields have different damage. The location can run twice. The fare has to be idempotent even when the message is delivered twice.',
      ],
      context:
        'Event payloads that mix telemetry with billing create this trap. The consumer that was correct for the telemetry gets reused for the charge because the message id is the same.',
      tradeoff: 'Deduping every location point costs a write per point and protects a map that did not need it. Skipping dedupe on the fare saves that write and double-charges.',
      mistake: 'Deduping the map update in a cache and assuming the fare handler, which runs second, is covered by the same key.',
      followUp: 'The fare dedupe row commits and the response to the rider is lost. What does the retry charge?',
      extension: 'A duplicate "trip completed" email is a third effect. Which side of this choice does it sit on?',
      alternative: 'Splitting the location and the fare into two messages lets each one have its own delivery policy. You then have two streams to operate, and the fare stream can be the only one with a dedupe table.',
    },
  },
  'partial-failure-design': {
    morning: {
      title: 'Four calls, four ways to be alone',
      why: 'A function that looks like one booking is four network calls. Any one of them can commit while the function the user is waiting on still has no answer.',
      explain: `Read the function as a list of effects that do not share a commit. The insert of the hold, the payment capture, the calendar reserve, and the final status update each talk to a system that can succeed and then fail to deliver the reply. The book function sees a timeout. That timeout does not say which prefix committed.

A call "succeeds alone" when its effect is durable and the calls after it have not run, or have not been acknowledged, and the caller of book cannot see the difference. List them before you add a new component. The list is the design review. A diagram with one arrow labeled "book" hides every row in it.`,
      question:
        'Review book(): insert a row as HOLD, capture the fee, reserve the calendar slot, then update the row to BOOKED. List the calls that can succeed alone while book() sees only a timeout.',
      hints: [
        'Each downstream call can commit and lose its response before the next call starts.',
        'The user is waiting on book(), which has one timeout for four effects.',
      ],
      outline: [
        'The HOLD insert can commit and the response can be lost before any fee is captured.',
        'The fee capture can succeed with the slot still unreserved and the row still HOLD.',
        'The calendar reserve can succeed with the row still not BOOKED.',
        'The BOOKED update can commit and the response to the user can still be a timeout.',
      ],
      solution: `The insert can succeed alone. The HOLD row commits and the reply to book() is lost, or book() crashes before calling payments. There is a hold, there is no fee, there is no slot, and the user sees a timeout. The row is real.

The capture can succeed alone. Payments takes the fee and the response dies. book() does not call the calendar, or it calls and you still do not know. The row may say HOLD. The user sees a timeout. The fee is real and the slot may be free. The reserve can succeed alone. The calendar has the slot, the response dies before the status update, and the row still says HOLD. The user sees a timeout and the slot is gone. The BOOKED update can succeed alone. The row says BOOKED, every earlier effect may have happened, and the response to the user is still a timeout. The user cannot tell a finished booking from a HOLD that never captured a fee. Each of the four calls can be the last one that landed.`,
      rubric: [
        'All four calls are listed as able to commit while book() observes a timeout.',
        'At least one case names an earlier effect present and a later effect absent, so "alone" is concrete.',
      ],
      myth: [
        'If book() returns a timeout, the HOLD row, the fee, the slot, and the status all roll back together.',
        'They are four effects in four systems. A timeout on the outer call rolls back none of the ones that already committed.',
      ],
      context:
        'Appointment booking, trip settlement, and license renewal are this shape whenever the fee and the record live in different services. One function name does not make one commit.',
      tradeoff: 'Doing the four calls inline is easy to read and creates four unknown prefixes. Collapsing the row updates into one database does not collapse the payment or the calendar.',
      mistake: 'Drawing one box called booking service and ending the review because the box has a single timeout setting.',
      followUp: 'Which of the four effects is the one a user will notice even if the row was never updated?',
      extension: 'The calendar reserve is still in flight when book() times out. Can that reserve still succeed after the user has been shown an error?',
      alternative: 'A single database transaction for the HOLD row and the BOOKED update removes the gap between those two writes only. The payment and the calendar remain calls that can succeed alone.',
    },
    evening: {
      title: 'Write unknown on the row you have',
      why: 'The handling for "maybe charged" is a state on the license you already store. A new workflow product would have the same unknown, one service further away.',
      explain: `Add one explicit unknown, in the table that already holds the license. Before you call payments, store the attempt id and mark the license renewal unknown. On a timeout, leave it unknown. The next request reads the charge by that attempt id. A recorded charge extends the license once. A recorded absence charges once with the same id. A timeout on the read stays unknown.

That is the whole handling. You do not add an orchestrator, a bus, or a second service whose job is to remember the attempt. The license row is the memory. Extending the date while the charge is unknown, or posting a fresh charge because the first call timed out, both invent a result.`,
      question:
        'License renewal charges a card and then extends the license date. Add one uncertainty handling for a charge timeout. Do not add a new product.',
      hints: [
        'The license row can hold an attempt id and a status the process already knows how to read.',
        'A second product that records the charge result can itself time out after the bank has moved the money.',
      ],
      outline: [
        'Before the charge call, store attempt id ren-19 and status RENEW_UNKNOWN on the license.',
        'On timeout, leave RENEW_UNKNOWN. Do not extend the date and do not start a second attempt id.',
        'Resolve by reading the charge for ren-19.',
        'Extend once if the charge exists. Charge once with ren-19 if it is absent. Stay unknown if the read times out.',
      ],
      solution: `Use the license row. In one update, before the payments call, set status to RENEW_UNKNOWN and store attempt id ren-19. Then call payments with ren-19. If that call returns success, extend the date and mark the license renewed in one update. If it returns a definite decline, mark the renewal failed and do not extend. If it times out, do nothing else. The row stays RENEW_UNKNOWN. The user sees "renewal confirming," not a new expiry and not a failure.

The next retry reads the charge by ren-19. If payments has it, extend the license once and clear the unknown. If payments has no such charge, call payments again with ren-19 and the same amount. If that read times out, stay unknown and do not post a charge. You added no service, no queue, and no workflow engine. The uncertainty is a status the license table can already store. A new product would have to record the same unknown, and the call to that product could succeed at the bank and fail on the way back, which is the problem you already have.`,
      rubric: [
        'The handling is RENEW_UNKNOWN plus attempt id ren-19 on the existing license row, written before the charge call.',
        'A timeout does not extend the license and does not start a new charge id. Resolution is a read of ren-19.',
      ],
      myth: [
        'Uncertain charges require a saga product or an orchestration platform before they can be handled safely.',
        'They require a durable unknown and a later read by attempt id. The license row can hold both. A new product recreates the same timeout.',
      ],
      context:
        'This is the partial-failure list turned into one state. The charge is the call that can succeed alone. The row is where that fact becomes visible to the next attempt.',
      tradeoff: 'Leaving the license unknown blocks a second renewal attempt and avoids a double charge. Clearing it on a timer without a successful read reopens the double charge.',
      mistake: 'Adding a workflow service that calls payments and then calls the license service, so the unknown now sits between three systems.',
      followUp: 'The read says the charge succeeded and the process dies before extending the date. What does the next retry do?',
      extension: 'What do you show a user who starts a second renewal while the first is still RENEW_UNKNOWN?',
      alternative: 'Not charging inside the request, and only extending the license from a statement you import later, removes the timeout from this path. The user waits longer for the extension, and you operate the import.',
    },
  },
};
