import type { LessonPair } from './publish';

export const messagingLessons: Record<string, LessonPair> = {
  'why-queues': {
    morning: {
      title: 'What the depth is holding',
      why: 'A queue is added because a caller is slow or a graph spiked. It only helps when the consumer can catch up. Otherwise it is a delay in front of the same shortage.',
      explain: `A queue sits between a producer and a consumer and holds records the consumer has not taken yet. It can absorb a spike: arrivals jump above the consume rate for a short time, then fall below it, and the extra depth drains because the workers have spare rate. It can also absorb a slow consumer in the request path: the caller returns after the enqueue, and the slow work happens later, as long as the consumer's average rate still meets the average arrival rate. In both cases the queue is spending buffer that a later surplus refills.

The buffer is finite. It is memory, disk, or a configured maximum length. If the arrival rate stays above the consume rate, depth grows until that bound. Then the producer blocks, the enqueue fails, or the broker drops records. An unbounded queue only moves that moment to an out-of-memory kill. Name the mismatch before you add the queue. A spike has an end and spare rate after it. A consumer that is slower than the average arrival rate does not.`,
      question:
        'Checkout enqueues a receipt email and returns. For two minutes, 1000 emails per second arrive, and workers send 100 per second. Arrivals then fall to 5 per second and the depth returns to zero. A fraud queue receives 25 reviews per second all day and scores 10 per second, so depth climbs until the broker rejects. What does the receipt queue absorb, and what is the fraud queue failing to absorb?',
      hints: [
        'After the email burst, compare 5 arrivals per second with 100 sends per second.',
        'A consumer absorbs only while a later surplus can drain what the burst stored.',
      ],
      outline: [
        'The receipt queue absorbs a two-minute spike, then drains because workers have spare rate.',
        'Checkout no longer waits on the mail send, which is the slow work being absorbed.',
        'The fraud queue never has spare rate, so it is not absorbing the slow scorer.',
        'When the fraud queue hits its bound, producers block or get a reject.',
      ],
      solution: `The receipt queue absorbs a spike. During the two minutes the workers finish 12,000 sends while 120,000 arrive, so depth grows, and that growth is the point of the buffer. Afterward 5 arrive per second and 100 can be sent, so the surplus drains the depth back to zero. The slow consumer it absorbs is the mail send on the checkout request: the API returns at enqueue time, and the send happens on a worker that is fast enough for the rest of the hour.

The fraud queue is a throughput deficit. Twenty-five arrive and ten are scored, all day, so every second adds about fifteen reviews. Nothing later pays that back. The queue holds the deficit until its maximum length, then the broker rejects or the producer blocks. That is the fraud check failing late, not a slow consumer being absorbed. A queue absorbs a temporary surplus of arrivals, or latency the average rate can still pay for. It does not absorb a consumer that loses to the average.`,
      rubric: [
        'The receipt queue is named as a spike that drains because later send rate exceeds arrivals.',
        'The fraud queue is described as a growing deficit that ends in reject or blocking, not as absorption.',
      ],
      myth: [
        'If a slow worker has a queue in front of it, the system has absorbed that slowness.',
        'The queue absorbs slowness only when the worker can catch the average rate and then drain. A permanent deficit fills the bound.',
      ],
      context:
        'This is the same arithmetic as a thread pool with a bounded handoff queue. The pool's throughput is the capacity. The queue is only the waiting room.',
      tradeoff: 'A deeper queue rides out a longer spike and hides a deficit for longer. A shallow queue fails the producer sooner, while the caller can still slow down.',
      mistake: 'Declaring the fraud path fixed because checkout latency dropped after the enqueue was added.',
      followUp: 'What measurement tells you the receipt depth will drain before the next campaign burst?',
      extension: 'How large a two-minute spike can the receipt workers absorb if the idle send rate is 100 per second and the queue holds 50,000?',
      alternative: 'Rejecting checkout email when the queue is already deep keeps the request honest and drops the receipt. The charge can still commit. The user gets no email until a later repair.',
    },
    evening: {
      title: 'The sale the queue postponed',
      why: 'Teams put a queue in front of a saturated service and call the API fast again. The service is still saturated. Callers find out when the buffer is full or the work is too old.',
      explain: `Take a warehouse that completes 40 stock reserves a second. A sale sends 90 a second for an hour. Putting a queue between the shop and the warehouse does not change 40. While the queue has room, the shop can enqueue faster than the warehouse works, so the API looks healthy and the oldest reserve gets older. Net depth grows by about 50 a second. The overload is the same pair of rates. The queue is spending its length to delay the moment someone has to say no.

When the length is used up, enqueue fails or blocks, and the shopper sees an error much like the timeout this queue replaced. Reserves already accepted are still unfinished. They will not finish faster than 40 a second. If the API returned success at enqueue time, those shoppers were told yes for work the warehouse has not done. A queue absorbs this sale only if arrivals later fall below 40 for long enough to drain the depth. An hour at 90 never does that.`,
      question:
        'The shop used to call the warehouse and time out above 40 reserves a second. It now enqueues and returns success when the enqueue works. The queue holds 10,000 messages. A sale runs at 90 a second for an hour, and workers still finish 40 a second. What does the shopper see before the queue fills and after it fills, and why did the queue fail to absorb the sale?',
      hints: [
        'Depth grows by the gap between 90 and 40 until 10,000 is reached.',
        'Success at enqueue time is not a completed reserve. The warehouse rate never changed.',
      ],
      outline: [
        'Before the cap, the shopper sees success while the reserve waits in the queue.',
        'The queue fills in a few minutes because fifty extra reserves arrive every second.',
        'After the cap, enqueue fails and the shopper sees an error again.',
        'The warehouse is still at 40 a second, so the queue only delayed the overload.',
      ],
      solution: `Before the cap, the shopper sees success. The API returned when the broker took the message. The warehouse is still completing 40 reserves a second, so a shopper who arrives as the queue approaches 10,000 waits on the order of 10,000 divided by 40 seconds, a few minutes, for a reserve that was already called done. The queue reaches 10,000 because the unused gap is 50 a second, which is 200 seconds of sale, a little over three minutes. It does not take the hour.

After the cap, the enqueue fails and the shopper sees an error. That is the old overload, moved from the warehouse timeout to the broker reject. Reserves already queued drain at 40 a second only. The queue failed to absorb the sale because there is no later period where workers outrun arrivals. Ninety against forty for an hour is a deficit of about 180,000 reserves. A room of 10,000 delays the failure by about three minutes and then fails the same excess. Returning success at enqueue also admitted orders the warehouse had not reserved.`,
      rubric: [
        'The shopper sees enqueue success, then errors after the 10,000 cap, while the warehouse stays at 40 a second.',
        'Absorption is rejected because the arrival rate never falls below the worker rate long enough to drain.',
      ],
      myth: [
        'Once the slow call is behind a queue, extra traffic is absorbed instead of failing.',
        'The queue stores the surplus until it is full. The worker rate is unchanged, so a lasting surplus becomes delay and then the same failure.',
      ],
      context:
        'Hiding a saturated dependency behind a fast enqueue is how a checkout stays green while the warehouse is already losing the hour. Age of the oldest message is the real latency.',
      tradeoff: 'Returning success at enqueue makes the shop fast and lies about the reserve. Waiting for the warehouse to finish is slower and tells the shopper the truth.',
      mistake: 'Raising the queue from 10,000 to a million and calling the sale handled.',
      followUp: 'If the sale dropped to 20 a second after ten minutes, would this same queue start to absorb, and what would still be late?',
      extension: 'What should the API return when the queue depth means the reserve cannot finish inside the promise you showed the shopper?',
      alternative: 'Blocking the shop request once depth crosses a limit pushes the overload back to the caller. The queue stops growing, and the shopper waits or fails while the warehouse is still the bottleneck.',
    },
  },
  'delivery-guarantees': {
    morning: {
      title: 'What the retry will repeat',
      why: 'Brokers are described as exactly-once and then a retry sends a second email. The words name who retries, and what the handler does with the copy.',
      explain: `At-most-once means the machinery tries one delivery and does not retry an ambiguous result. The producer does not resend a publish it is unsure about, or the consumer records its position before it does the work. A crash can drop the message. This path prefers a loss to a duplicate from its own retry.

At-least-once means the opposite choice. The producer retries until the broker acknowledges, or the consumer does the work and only then records its position. If the acknowledgement is lost, or the process dies after the work and before the record, the message is delivered again. Effectively-once is not a third setting on the socket. It means the delivery is at-least-once and the effect is idempotent, so a second delivery does not repeat the outcome. Kafka can append to its own log once for an idempotent producer, and a consume-transform-produce can be atomic inside its transactions. That promise stops at the Kafka write. Mail, a bank, and a counter outside the transaction can still see two deliveries. The handler has to make the second one a no-op.`,
      question:
        'Define at-most-once, at-least-once, and effectively-once for a broker delivery. Where does a Kafka transaction stop covering you if the handler also sends mail or increments a counter outside the cluster?',
      hints: [
        'Start from who retries, and from whether the position is recorded before or after the work.',
        'A transaction that commits two Kafka writes does not include the SMTP session.',
      ],
      outline: [
        'At-most-once does not retry, so a crash can lose the message.',
        'At-least-once retries, so a lost acknowledgement can deliver the message again.',
        'Effectively-once is at-least-once plus an effect that ignores the duplicate.',
        'A Kafka transaction covers Kafka writes. Mail and external counters sit outside it.',
      ],
      solution: `At-most-once is a single attempt with no retry of an uncertain send or an uncertain process. The message is applied zero times or one time. You get a loss if the process dies at the wrong moment, and you do not get a duplicate from this retry loop. At-least-once retries until something acknowledges. The message is applied one or more times. A lost acknowledgement, or a crash after the side effect, is a second delivery of the same work.

Effectively-once is a name for the outcome, not for the packet. You accept at-least-once delivery and you store enough to make the second delivery do nothing, usually the producer-supplied id. A Kafka idempotent producer stops a retried append from becoming a second log record, and a transaction can make several Kafka writes commit together. If the handler then talks to a mail server or increments a counter in another database, those effects are not in that transaction. Two handler runs can both send and both increment. Effectively-once for those effects is a dedupe record next to the effect, not a broker checkbox.`,
      rubric: [
        'At-most-once is tied to no retry and possible loss, and at-least-once is tied to retry and possible duplicates.',
        'Effectively-once is described as an idempotent effect, and Kafka transactions are limited to Kafka writes.',
      ],
      myth: [
        'Exactly-once delivery means the handler runs once no matter what it talks to.',
        'The broker can dedupe its own append. A side effect outside that write still runs once per delivery unless the handler remembers the first one.',
      ],
      context:
        'The same split shows up on a retried HTTP POST. The proxy can promise another attempt. Only the handler can promise one charge.',
      tradeoff: 'At-most-once avoids duplicate effects and loses work on any crash. At-least-once keeps the work and forces every effect to tolerate a second run.',
      mistake: 'Turning on a broker transaction and then calling SMTP inside the handler with no stored id.',
      followUp: 'What does the handler store so the second delivery of the same id becomes a no-op?',
      extension: 'Why can two consumers in different groups both apply one log record even when the producer was idempotent?',
      alternative: 'A single-threaded handler that never retries is at-most-once for its own crashes. You lose the message on a crash after the read and before the effect, and you still share the log with other groups.',
    },
    evening: {
      title: 'The mail and the view counter',
      why: 'One pipeline copies a setting called at-least-once onto every consumer. A second password email and a doubled view count are different failures.',
      explain: `A password-reset email has a bad loss and a bad duplicate. If the send is dropped, the person cannot sign in. If a retry mints a new code and sends again, the inbox has two codes and the first may already be dead. The delivery you want is at-least-once, and the effect you want is one SMTP call per reset id. That combination is effectively-once, and it lives in a row keyed by the reset id, not in the broker's delivery flag.

A page-view counter on a dashboard is a different tolerance. A lost increment is a missing sample. A retried increment looks like a second visitor and can draw a spike that never happened. Paying for a unique row on every view is often the wrong cost. At-most-once, an increment that is not retried, matches that counter. A billing meter does not. A meter that becomes an invoice has the email's problem: loss and duplication are both wrong, so it needs an idempotent add. Do not copy the dashboard choice onto the invoice.`,
      question:
        'Pick a delivery approach for a password-reset email and a different one for a dashboard page-view increment. Say what the user or the chart sees if you swap the two choices.',
      hints: [
        'A lost reset email blocks sign-in. Two codes for one reset are a product bug.',
        'A retried view increment is indistinguishable from another view unless you store an id.',
      ],
      outline: [
        'The email is at-least-once delivery with one send stored per reset id.',
        'That is effectively-once for the mailbox, built in the sender, not granted by the broker.',
        'The view counter increments once and does not retry, accepting a lost sample.',
        'Swapping them drops a reset or draws a fake spike on the chart.',
      ],
      solution: `Send the password-reset email at-least-once, and make the effect effectively-once. Store the reset id, the code, and a sent flag in the same place you decide to send. A redelivery finds the id and does not open a second SMTP call or mint a second code. At-most-once is the wrong pick: a crash after you publish and before SMTP leaves the person with no mail. At-least-once without the stored id is also wrong: the retry sends another code. The broker is not the thing that keeps the mailbox to one message.

Increment the page-view counter at-most-once. Publish the increment or apply it without a retry. A lost sample leaves the chart a little low, which this dashboard can stand. A retry makes one view into two, and during an outage those retries become a spike. Effectively-once would also be correct and costs a durable id per view. For this counter, skip that write. If you swap the choices, the reset email can vanish on one crash, and the chart gains visitors every time a consumer retries. A usage meter that is billed is not this counter. That one follows the email: at-least-once delivery and an idempotent add.`,
      rubric: [
        'The email is effectively-once via a stored reset id, with at-most-once rejected because the mail would be lost.',
        'The view counter is at-most-once so retries cannot invent views, and a billed meter is not given that choice.',
      ],
      myth: [
        'At-least-once is the safe default for every consumer, because duplicates are harmless.',
        'A duplicate email is a second code, and a duplicate increment is a fake view. Harmless depends on the effect, not on the broker.',
      ],
      context:
        'The reset id is an idempotency key for SMTP. The dashboard skips the key because a wrong extra count is worse than a small loss, and the write would dwarf the counter.',
      tradeoff: 'Storing a sent row per reset keeps one email and adds a write on the login path. Skipping retries on views keeps the chart honest and under-counts a blip.',
      mistake: 'Using one consumer setting for the reset mailer and the view counter because they share a cluster.',
      followUp: 'What do you store if the reset id is redelivered after the email was sent and the sent flag update crashed?',
      extension: 'Which pick changes if the view increment is a billable metered API call instead of a dashboard sample?',
      alternative: 'Generating the reset code once, and letting the user request a new email that shows the same code, survives a second send without a second secret. Two messages still arrive if the sender does not remember the first SMTP success.',
    },
  },
  'consumer-groups': {
    morning: {
      title: 'One member owns the partition',
      why: 'A group is how several processes share a topic. The failure mode is the moment membership changes and a record is still in flight on the member that lost it.',
      explain: `Consumers with the same group id share the topic. The group coordinator, a broker, tracks who is alive from heartbeats and from poll timing. An assignment strategy maps partitions to members so that each partition is given to one member. Range, round-robin, and sticky strategies differ in which member moves when the set changes. Sticky and cooperative sticky try to leave partitions where they are. With more members than partitions, the extra members get nothing. With fewer members, some hold several partitions.

A rebalance runs when a member joins, leaves, crashes, misses its max poll interval, or the partition count changes. An eager rebalance revokes every partition and pauses the group, then assigns again. A cooperative rebalance revokes only the partitions that must move, so the others keep being read. What the rebalance interrupts is work on a revoked partition. The member has to stop fetching it. Records already fetched and not finished are the hazard. If that member keeps applying them after the new member starts at the last commit, two processes write the same key, and a late write can land out of offset order.`,
      question:
        'A topic has 12 partitions and the group has 3 members. A fourth member joins and one old member loses partitions. Who decides the new map, and what must the member that lost a partition do with a record it has already fetched but not finished?',
      hints: [
        'Only one member of the group should own a given partition when the assignment is steady.',
        'The last committed offset is where the new owner will start, which may be the record still in flight.',
      ],
      outline: [
        'The coordinator tracks membership, and the assignor gives each partition to one member.',
        'The fourth member receives partitions taken from members that had more than one.',
        'The losing member must stop that partition and not keep applying fetched records afterward.',
        'Uncommitted in-flight work will be read again by the new owner from the last commit.',
      ],
      solution: `The group coordinator knows the four living members. The assignment strategy then builds the map. In the classic protocol the group leader runs that strategy and the coordinator distributes the result. Each of the 12 partitions goes to one of the four members. A typical end state is three partitions each. The fourth member does not read a copy beside an old member. It reads partitions the strategy moved.

The member that lost a partition has to treat the loss as a hard stop for those partitions. It should finish only what it can still safely commit, commit offsets for records whose effects are done, and drop or fence anything still in flight. The new owner starts at the last committed offset, not at the record the old member happened to be looking at. If the old member applies a fetched record after that, both members run the effect. Waiting for in-flight work before giving the partition up holds the order, and it holds the rebalance. Fencing a late write is how you stop the effect if the call cannot be cancelled.`,
      rubric: [
        'Assignment is one partition to one member, recomputed because membership changed.',
        'The losing member must stop or fence in-flight records, because the new member rereads from the last commit.',
      ],
      myth: [
        'Adding a consumer gives every partition an extra reader and makes the group faster.',
        'Inside one group a partition has one owner. Extra members help only until every partition already has a member.',
      ],
      context:
        'A second group, with a different id, is not a fourth member. It is another set of owners reading the same log from its own offsets.',
      tradeoff: 'Eager rebalances are simple and pause every partition. Cooperative rebalances keep stable partitions moving and take another round to finish the move.',
      mistake: 'Processing a revoked partition to completion in the background and committing those offsets after the new owner has started.',
      followUp: 'What happens to the extra member if you add a fifth and the topic still has 12 partitions? What if you had 2 partitions?',
      extension: 'Which partitions does an eager rebalance interrupt that a cooperative rebalance would leave alone?',
      alternative: 'Assigning partitions statically in config avoids a rebalance and freezes the map. You then reassign by hand when a member dies, or those partitions sit unread.',
    },
    evening: {
      title: 'Suspend lands after reactivate',
      why: 'Per-partition order is an assignment promise. It breaks while the previous owner still has a call in flight and the new owner is already reading the same offsets.',
      explain: `Account 17 lives on one partition because its records share a key. Offset 70 is suspend. Offset 71 is reactivate. The promise operators repeat is that one member applies that partition in offset order, so the account ends active. The promise is true only while one member owns the effects as well as the reads.

A rebalance cuts the promise at in-flight work. Member A has applied suspend through a slow account service and has not committed past 70. The max poll interval expires, or a deploy leaves the group, and the partition moves to member B. B starts at the last commit, reads 70 and 71, and applies them in order, so the account goes suspended and then active. A's suspend call returns late and writes suspended again. Nobody reordered the log. The late effect from the revoked owner landed after a higher offset. The account is suspended even though the last record says reactivate.`,
      question:
        'Member A writes suspend for offset 70 and has not committed. A rebalance gives the partition to member B, which applies offsets 70 and 71 and leaves the account active. A's suspend call then completes and writes the account. What ordering promise did the group make, and how did the rebalance break it?',
      hints: [
        'B starts from the committed offset, so it will apply suspend and then reactivate itself.',
        'The log order never changed. The late write from A is the reorder.',
      ],
      outline: [
        'The promise was one owner, applying suspend and then reactivate, with the account ending active.',
        'B legally rereads offset 70 because A never committed past it.',
        'B finishes both records and the account is active.',
        'A late suspend from the revoked member overwrites that and breaks offset order.',
      ],
      solution: `The group promised that partition order would be effect order for account 17. One member would apply suspend and only then reactivate, and a steady owner would leave the account active. That promise holds when the member that reads an offset is the only member whose write is still allowed to land.

The rebalance breaks it at the handoff. B did the right thing with the log: the commit had not passed 70, so B applied 70 and then 71 and the stored account was active. A was no longer the owner, and its suspend write still went through. The effect order became suspend, reactivate, suspend. The account contradicts offset 71. Stopping the call on revoke would have held the promise if the call were still waiting. This call was already in flight, so the account service has to reject a write from a generation that no longer owns the partition. Otherwise the revoked member gets the last word.`,
      rubric: [
        'The promise is per-partition effect order under a single owner, with the account ending active.',
        'The break is A's late suspend after B has already applied the higher offset, not a reorder inside the log.',
      ],
      myth: [
        'Records on one partition are applied in order because only one consumer runs at a time.',
        'Only one member should run. During a rebalance the previous member can still complete a write after the new member has moved on.',
      ],
      context:
        'The commit says where the next owner starts. It does not recall an RPC the previous owner already sent. Ownership has to be enforced at the write.',
      tradeoff: 'Waiting for every in-flight call before finishing a rebalance preserves order and stretches the pause. Cancelling and fencing is faster and needs the account service to understand generations.',
      mistake: 'Committing offset 72 as soon as the records are fetched so the rebalance looks clean, while suspend is still running.',
      followUp: 'What should the account service store so it can reject A after B has become the owner?',
      extension: 'How does the outcome change if A had committed past 71 before the suspend write finished?',
      alternative: 'Handling revoke by finishing the in-flight suspend and reactivate before acknowledging the revoke holds order for calls you can wait on. A call that outlives that wait still needs a fence.',
    },
  },
  'message-ordering': {
    morning: {
      title: 'Order is a property of one key',
      why: 'A topic is treated as a single sequence. It is not. Order is the offset order of one partition, which a key occupies only while the mapping stays put.',
      explain: `A partition is ordered by offset. Records that share a key share that order when they are appended to the same partition. The usual partitioner hashes the key and takes a modulus of the partition count, so one key keeps landing on one partition while the count and the partitioner stay the same. A single idempotent producer then has its sends for that key appended in send order. The consumer sees them in that order only if it applies the partition one record at a time.

Order stops at the boundary of that partition. Two keys are two hashes, usually two partitions, read by different members with no shared sequence. A null key is not pinned to an entity at all. If you add partitions, the modulus changes and a key's new records can land somewhere else while the old ones stay behind, so that key no longer has one sequence. A producer that retries without idempotence, with more than one request in flight, can append a later batch and then retry an earlier one, so even one partition diverges from send order. Two producer processes writing the same key get leader-append order, which is arrival order at the broker, not a business clock.`,
      question:
        'Cart events are keyed by cart id and written by one idempotent producer. Inventory events are keyed by sku on the same topic, which has 24 partitions. Where do two events for one cart stay in order, and where does order stop?',
      hints: [
        'Same key and a stable partition count means one partition and therefore one offset order.',
        'A sku and a cart id do not share a hash, so nothing waits for the other.',
      ],
      outline: [
        'Two events for the same cart id share a partition and stay in offset order.',
        'That holds for this producer while the topic stays at 24 partitions.',
        'Order stops between carts, and between a cart event and a sku event.',
        'Order also stops for that cart if the partition count changes or a second producer writes it.',
      ],
      solution: `Two events for one cart stay in order on the partition the cart id hashes to. Offsets on that partition are the order. One idempotent producer does not reorder its own retries, and a consumer that applies the partition sequentially sees the cart in the order it was appended. That is the whole region where the promise holds.

Order stops as soon as the key changes. Another cart is another hash and can be read at the same time on another member. A sku is a different key on purpose, so an inventory event and a cart event have no order even if a person thinks of them as one checkout. Order for the same cart also stops being a single sequence if the topic grows past 24 partitions and the hash moves, and if a second producer writes that cart id. The log will still be ordered per partition. It will not match "things that belong together," because belonging is the key you chose, not the topic name.`,
      rubric: [
        'Same cart id is tied to one partition and offset order for one idempotent producer at a stable partition count.',
        'Order is refused across carts, across cart and sku, and after a partition-count or second-producer change.',
      ],
      myth: [
        'A topic delivers events in the order they were produced, for the whole business operation.',
        'The topic is many partitions. Order is offset order inside one of them, and only keys that hash there share it.',
      ],
      context:
        'Choosing the key is choosing the lock. A cart key orders the cart and spreads load. A key of a single popular sku piles that sku onto one partition.',
      tradeoff: 'One partition for a key keeps order and caps that key at one consumer. Spreading a key at random gains throughput and removes the sequence.',
      mistake: 'Adding partitions during a sale to go faster, then expecting a cart's newer events to follow its older ones.',
      followUp: 'What happens to order if the consumer handles a partition with a pool of ten workers?',
      extension: 'How would you key a checkout so the payment event cannot leap ahead of the cart event?',
      alternative: 'Writing every cart to partition 0 preserves a global order and makes one member the throughput ceiling for all carts. The other 23 partitions sit idle.',
    },
    evening: {
      title: 'Print when both facts exist',
      why: 'A badge printer that waits for payment and then arrival will stall or misprint. Those records do not share a key, so arrival order is not a sequence you can wait on.',
      explain: `TicketPaid is keyed by ticket id. GuestArrived is keyed by guest id. They are different partitions, often different topics, and nothing in the log lines them up. For guest 9 and ticket 9, the arrival can be stored first because the guest reached the door while payment was still on another partition's backlog. A consumer that prints inside the TicketPaid handler, assuming the arrival is already there, misses that guest. A consumer that blocks the GuestArrived handler until payment shows up holds every later guest on that partition behind one missing ticket.

Correctness has to ignore which handler ran first. Each handler stores its own fact, keyed by the id in the payload, and then checks whether the other fact is already stored. Printing is allowed when both exist, and a unique row for the ticket id makes a second attempt a no-op. The offset commits after the fact is stored, not after the other key arrives. The missing half is ordinary state, not a hole in the partition.`,
      question:
        'A badge should print only after TicketPaid and GuestArrived, and those messages use different keys. Design the consumer so either message can arrive first, the badge prints once, and one late payment does not block other guests.',
      hints: [
        'Persist each fact by its own id and decide from the rows, not from which handler ran.',
        'Do not leave the GuestArrived offset uncommitted while you wait for a ticket on another partition.',
      ],
      outline: [
        'Store TicketPaid by ticket id and GuestArrived by guest id as separate facts.',
        'After either write, print only if the matching fact is already stored.',
        'A unique print row per ticket id makes the second order a no-op.',
        'Commit once the fact is durable so a missing pair does not stall the partition.',
      ],
      solution: `Give each message a table it can write alone. TicketPaid upserts the ticket as paid and records the guest id from the payload. GuestArrived upserts the guest as arrived. After either upsert, look for the pair: a paid ticket whose guest has arrived, or an arrived guest with paid tickets. If the pair is incomplete, commit the offset and stop. The other message will perform the check when it arrives, whichever partition that is. Do not compare timestamps to guess which event really happened first. The badge rule is both rows, not a sequence.

Claim the print with a unique row on ticket id in the same transaction as the decision. If TicketPaid and GuestArrived are handled concurrently and both see a complete pair, one insert wins and the other finds the row and does not print. Commit the messaging offset after that database transaction, not after standing around for the other key. A payment that never arrives leaves an arrival row in place and does not pin the guest partition. A replay of either message sees the stored fact and the print row and does not print a second badge.`,
      rubric: [
        'Each key is stored independently, and the print runs only when both facts are present, in either order.',
        'The offset commits without waiting for the other key, and a unique ticket row prevents a second print.',
      ],
      myth: [
        'If both events are produced by one checkout, the consumer will see payment before arrival.',
        'Different keys are different partitions. The consumer can see either one first, or only one of them, for as long as the other is delayed.',
      ],
      context:
        'This is a join on ids across partitions. The log will not do the join. The database rows are the join, and they stay correct when one side is replayed.',
      tradeoff: 'Writing a row per fact adds a database round trip and lets the partition move. Holding the message in memory until the pair arrives uses no extra table and stalls the partition on one missing key.',
      mistake: 'Sleeping in the GuestArrived handler until a TicketPaid for that guest has been seen.',
      followUp: 'What cleans up arrival rows whose payment never arrives, and why must that cleaner not rewind the partition?',
      extension: 'How does the check change if one guest can hold several tickets that are paid at different times?',
      alternative: 'Keying both events by guest id puts them on one partition in producer order, if a single producer writes them. The arrival consumer then has a sequence, and a popular guest becomes a hot partition.',
    },
  },
  'kafka-log': {
    morning: {
      title: 'Append the record, keep the offset',
      why: 'People approach a partition as a queue that forgets a message once a worker takes it. Readers then cannot rebuild, and a retry looks like a new fact.',
      explain: `A partition is an append-only log. The leader writes each record at the end and stamps an offset, a number that only increases for that partition. Consumers read by asking for an offset. Reading does not delete. A second group can read the same offsets at its own pace, because the record is still there. Retention deletes old segments by age or size, whether or not anyone read them. Compaction is the other retention: it keeps the latest record for a key and drops older ones, and the survivors stay in offset order.

The consumer's place in the log is not part of the record. It is a pointer the group stores. Moving the pointer backward is a rewind, and it reads what retention has not yet removed. Moving it forward skips. Neither motion changes the bytes already appended. A producer that retries a timed-out append, without idempotence, can add the same logical event at two offsets. Both are real records. The log does not know they were one attempt.`,
      question:
        'An operator has used a queue that deletes a message when the worker acknowledges it. Describe one partition of the audit topic: what is stored, what an offset names, and what removes bytes.',
      hints: [
        'The audit record remains after every consumer has read it.',
        'Retention is age or size of the log, not the set of groups that finished.',
      ],
      outline: [
        'The partition stores an append-only sequence of audit records.',
        'The offset is the position the leader assigned that record on this partition.',
        'Consumers keep their own pointers and do not delete on read.',
        'Bytes leave when retention deletes old segments, or compaction drops an older key.',
      ],
      solution: `The partition stores every audit record the leader accepted, in the order it appended them, until retention says otherwise. The offset is the position of one record in that sequence. It identifies the record. It is not a count of how many consumers have seen it, and it is not removed when a group commits. Two groups, or one group that seeks back, read the same offset and get the same bytes.

What removes bytes is the retention rule on the broker. Time or size deletes whole old segments from the start of the log, including records nobody has consumed and records everyone has consumed. A compacted audit key would instead keep the latest record for that key. Acknowledgement from a consumer does neither. If you need a delete-on-success queue, this partition is the wrong shape. If you need to rebuild a projection, the offsets still being inside retention are what make the rebuild possible.`,
      rubric: [
        'The partition is described as an append-only sequence, and the offset as a position in it.',
        'Deletion is retention or compaction, not consumer acknowledgement.',
      ],
      myth: [
        'Once every consumer group commits an offset, the broker deletes that record.',
        'The commit moves a pointer. The record stays until retention or compaction removes it, which is why another group can still read it.',
      ],
      context:
        'A queue that deletes on ack cannot rebuild a search index from the messages. This log can, until the segment ages out.',
      tradeoff: 'Long retention makes rewind and new groups possible and stores bytes you may never read again. Short retention saves disk and makes an old offset invalid.',
      mistake: 'Treating a committed offset as proof the audit record can be deleted to save disk.',
      followUp: 'What does a consumer see if it asks for an offset older than the log start?',
      extension: 'Why can two groups show different lag on a partition whose bytes have not changed?',
      alternative: 'A compacted topic keyed by entity id keeps the latest audit snapshot and drops the history. You can rebuild current state, and you cannot replay the steps that got there.',
    },
    evening: {
      title: 'The rebuild reads the duplicate',
      why: 'A rewind feels like a time machine back to the true events. It is a second read of whatever was appended, including a producer retry that the log stored twice.',
      explain: `A search indexer reads the listing topic and writes documents. After a bad mapping deploy, the fix is to seek the group back to an older offset, or start a new group there, and fill the index again from the log. That is a rewind. It does not ask producers to resend. It reads retained offsets a second time. Every index write on that path has to tolerate seeing a listing it already stored.

Separately, the listing producer is not idempotent. It timed out, retried, and the first append had actually succeeded. The leader stored two records for one update of listing 55, at two offsets, with no producer id and sequence number to reject the second. The rewind will project both, because both are in the log. An idempotent producer would have made the broker drop the retried sequence so the second offset would not exist. This producer did not. The indexer cannot tell that pair from two genuine edits unless the payload carries an id and a version the index can overwrite.`,
      question:
        'The indexer seeks back to yesterday to rebuild after a bad deploy. The listing producer retries without idempotence, and listing 55 was appended twice for one update. What does the rewind read, and why is the duplicate already in the log?',
      hints: [
        'Seeking back changes the consumer pointer, not the partition.',
        'A timeout does not prove the first append failed. A non-idempotent retry appends again.',
      ],
      outline: [
        'The rewind rereads retained offsets and writes the index again.',
        'Listing 55 appears at two offsets because the producer retried a successful append.',
        'Without a producer id and sequence, the broker had no duplicate to reject.',
        'The index stays correct only if the same listing version overwrites instead of inserting twice.',
      ],
      solution: `The rewind reads the log as it is. Yesterday's offsets are still inside retention, so the indexer sees every listing event again, including both copies of listing 55. It will write the index twice for that update unless the document id and version make the second write the same document. The rewind did not invent the extra record. It is a second read. Genuine updates are in there too, so the index path has to be safe to run again even when the producer did everything right.

The duplicate is in the log because the producer retried without idempotence. The broker had already assigned an offset to the first append when the producer gave up waiting and sent the same bytes again. Those are two appends. An idempotent producer attaches a producer id and a per-partition sequence, and the leader rejects a retry of a sequence it has stored. That keeps the retry out of the log. It does not make the indexer's rewind a no-op. The rewind still replays every real update, so the sink remains responsible for applying one listing version twice without creating two documents.`,
      rubric: [
        'The rewind is a second read of retained offsets, including both copies of listing 55.',
        'The duplicate is traced to a non-idempotent retry of a successful append, not to the seek.',
      ],
      myth: [
        'Rewinding a consumer replays each real event once, because the log is a clean history.',
        'The log replays what was appended. A producer retry without idempotence was appended twice, so the rebuild sees both.',
      ],
      context:
        'Idempotent produce cleans the append. It does not clean a sink that inserts on every read. The rewind is when you find that out.',
      tradeoff: 'Enabling producer idempotence adds a sequence check on the broker and stops this duplicate. It does not dedupe a bug that published two logical updates on purpose.',
      mistake: 'Deleting and rebuilding the index from a rewind while the index insert treats every offset as a new document.',
      followUp: 'How does the indexer tell the retried listing 55 from a later genuine edit of listing 55?',
      extension: 'What is missing from the rebuild if retention has already deleted the segment the seek asked for?',
      alternative: 'Restoring last night's index snapshot and applying only offsets after the snapshot avoids a full rewind. It misses any duplicate that was appended before the snapshot and already baked into it.',
    },
  },
  'offsets-replay': {
    morning: {
      title: 'Advance the pointer after the work',
      why: 'The offset looks like a broker cursor that moves as records are read. It moves when the consumer commits, and a commit before the effect is a skipped invoice.',
      explain: `Something the group trusts has to store the next offset to read. By default that is a commit to the internal offsets topic: the consumer sends the position, and a broker stores it. The act of fetching a record does not move it. Auto-commit sends the position on a timer, using how far poll has already stepped, which can be past records the handler has not finished. Manual commit sends the position you choose, at the moment you choose. The number you commit is the next offset to fetch, not the last offset you liked.

You may instead store that position in your own database, in the same transaction as the invoice, and seek to it on startup with auto-commit off. Then the invoice and the pointer commit or roll back together. Two stores at once are a bug. The broker commit and the database commit will disagree after one of them succeeds. Whoever you pick, the pointer should pass a payment event only after the effect of that event is durable. Earlier, a crash skips the payment. Later is the safe direction: a crash reads it again.`,
      question:
        'The billing group can commit offsets to the broker, or store the next offset in the billing database beside the invoice. Who advances the position, and when should it move past a payment event?',
      hints: [
        'Fetching is not a commit. The consumer decides when the stored position changes.',
        'The value stored is the offset the restart should read next.',
      ],
      outline: [
        'The consumer advances the position, either by committing to the broker or by writing its own store.',
        'The broker does not move it just because a fetch returned the payment.',
        'Move past the payment only after the invoice write is durable.',
        'Use one store. A database position means auto-commit to the broker is off.',
      ],
      solution: `The consumer advances the position. The broker stores a commit when the client sends one, and it does not treat a fetch as that commit. If the position lives in the billing database, the consumer advances it in the same transaction as the invoice and seeks on startup. Auto-commit has to be off in that design, or the offsets topic will race the database. Pick one source of truth.

Move past the payment event after the invoice is durable, and commit the following offset, the one startup should read next. If you advance first, a crash drops the payment and the restart never sees it. If you advance after, a crash reads the payment again and the invoice write must tolerate that. Committing in the same database transaction as the invoice makes "after" and "atomic" the same moment for that write. It does not cover a call to a card network that happened outside the transaction.`,
      rubric: [
        'The consumer, not the fetch, advances either the broker commit or the database position.',
        'The position moves past a payment only after the invoice is durable, and only one store is authoritative.',
      ],
      myth: [
        'The broker moves the group offset forward as soon as it delivers the record.',
        'Delivery only makes the bytes available. The position moves when the consumer commits, which can be long after the fetch or never.',
      ],
      context:
        'Auto-commit is a timer on the poll position. It is the skip you get when the handler is still on a record the poller has already passed.',
      tradeoff: 'Committing every record shrinks the crash window and adds a write per record. Committing a batch is cheaper and replays or skips the whole batch.',
      mistake: 'Storing the offset in the billing database and also leaving auto-commit on, then debugging whichever store moved.',
      followUp: 'On startup, which position do you seek to if the database says 80 and the broker says 90?',
      extension: 'What does committing 441 mean about offset 440, and what will the next fetch return?',
      alternative: 'Committing the whole poll batch after the last invoice in it reduces commit traffic. A crash in the middle of the batch replays invoices you already wrote, so those writes still have to be idempotent.',
    },
    evening: {
      title: 'Killed on one side of the commit',
      why: 'A crash report says the consumer died. Whether that purchase is missing or doubled depends on which write had already succeeded.',
      explain: `The loyalty handler does two writes that are not one transaction: it adds points for a purchase, and it commits the next offset. The process can die in the gap. Restart will trust the offset store and nothing else. If the points are saved and the offset is not, the restart reads that purchase again and adds points again. If the offset is saved and the points are not, the restart starts at the next purchase and the killed one is gone.

Neither outcome is a corrupted log. The record is still at its offset. The crash only chooses whether the pointer has passed it. You do not get to have neither risk while those two writes stay independent. Putting them in one database transaction removes the gap for the points. Leaving them separate means you pick the outcome you can stand, usually a second apply that the points update knows how to ignore, rather than a purchase that earns nothing.`,
      question:
        'The loyalty consumer adds points for offset 440, then commits offset 441. The process is killed after the points transaction commits and before the offset commit succeeds. What does the restart do? What changes if the offset is committed first and the process is killed before the points write?',
      hints: [
        'The restart reads whatever offset was actually stored, not how far the handler got.',
        'One order runs the purchase again. The other never comes back to it.',
      ],
      outline: [
        'Points saved and offset uncommitted: restart reads 440 and adds the points again.',
        'That crash processes the purchase twice.',
        'Offset 441 saved and points uncommitted: restart reads 441 and skips the purchase.',
        'The log still has 440 in both cases. The pointer is what changed.',
      ],
      solution: `In the order that shipped, the points are durable and offset 441 is not. The restart reads 440 again and adds the points a second time. The member did not skip. It processed the purchase twice. The second add is wrong unless the points transaction is keyed by purchase id so the replay hits the same row and stops. Nothing in the offset commit itself provides that key. The commit never happened.

If the offset commit is moved first and the kill happens before the points write, the stored position is 441. The restart fetches 441 and never applies 440. That crash skips the purchase, and the member has no later signal that points were missed, because it did what the pointer said. Same death, other side of the commit. The purchase is doubled or it is dropped. It is not safely done once. Closing the gap means the points row and the next-offset row commit in one transaction, or the points update is idempotent and you accept the replay on purpose.`,
      rubric: [
        'The shipped crash replays offset 440 and can add the points twice.',
        'Committing the offset first causes the same style of crash to skip the purchase, and the log record remains either way.',
      ],
      myth: [
        'A crash retries the message safely, so the points land once.',
        'Retry is safe only if the second apply is a no-op. A crash after the points write and before the commit runs the add again.',
      ],
      context:
        'This gap is why an inbox row lives next to the balance change. The offset alone cannot tell a finished purchase from one that died mid-handler.',
      tradeoff: 'Committing after the points risks a double add and keeps every purchase. Committing before the points risks a missing add and never double-counts.',
      mistake: 'Restarting the loyalty group and assuming the purchase that was in flight is either done or harmlessly pending.',
      followUp: 'What unique key makes the second points transaction for offset 440 leave the balance unchanged?',
      extension: 'If auto-commit stored 441 during the points call, which of the two outcomes do you get even though your code commits afterward?',
      alternative: 'Writing the points and the next offset in one database transaction, then seeking that offset on startup, removes this gap for the balance. A separate call that emails the member is still outside it.',
    },
  },
  'worker-retry': {
    morning: {
      title: 'Retry the failure that can heal',
      why: 'A retry loop treats every error as patience. A bad payload stays bad, and a timeout may already have done the work.',
      explain: `A transient failure can succeed later with the same bytes and no code change. A connection reset, a 503, a 429, or a broker that is mid-election is in this set. Retry it with backoff, jitter, and a cap. The cap exists because a long outage should park the record instead of hammering the dependency until the group is kicked.

A permanent failure will fail again until something else changes. A 422 for an unknown serial number, a schema the handler cannot parse, or a business rule that rejects a closed account will not pass on the fifth try. Spend the attempts and you only delay the dead letter. A timeout sits in between. The transport failed and the server may have committed. Retry that only when the operation is idempotent. If a second call registers a second device, the timeout is not a clean transient failure. It is an unknown result.`,
      question:
        'A worker registers a device with a partner API. Separate a connection reset, a 422 for an unknown serial, and a timeout where the partner may have stored the device. Which ones do you retry, and what has to be true of the timeout?',
      hints: [
        'The same bytes should be able to succeed later without a deploy or a data fix.',
        'A timeout means the response died, not that the partner rolled back.',
      ],
      outline: [
        'The connection reset is transient and can be retried with backoff and a cap.',
        'The 422 is permanent for this payload and should not wait out a retry budget.',
        'The timeout is unknown. Retry it only if the registration id is idempotent.',
        'Otherwise a retry can create a second device at the partner.',
      ],
      solution: `Retry the connection reset. The partner never accepted a response, and the same registration can work once the path is back. Use backoff and jitter so a fleet of workers does not reconnect in one wave, and stop after a fixed number of tries. Do not retry the 422 as if it were the same kind of thing. The serial is unknown. The next attempt gets the same 422 until the payload or the partner data changes. Send it to the dead letter, or return it to the producer, after you have recorded why.

The timeout is not permission to call again. You do not know whether the partner stored the device. Retry only if the request carries a registration id the partner treats as unique, so the second call returns the first device instead of creating another. If the partner has no such id, leave the result unknown and reconcile. Do not classify every non-200 as transient. The split is whether another attempt with these bytes can become the one intended device.`,
      rubric: [
        'The reset is retried with a cap, and the 422 is not, because the payload will fail the same way.',
        'The timeout is retried only when the partner dedupes the registration id. Otherwise the result stays unknown.',
      ],
      myth: [
        'Any failed call is transient if you wait long enough between tries.',
        'Waiting helps a down network. It does not fix an unknown serial, and it duplicates a timeout the partner already committed.',
      ],
      context:
        'Backoff without an idempotent registration id turns a blip into a second device. The retry policy and the partner contract are one decision.',
      tradeoff: 'A long retry cap rides out a partner incident and keeps bad payloads on the partition. A short cap parks faster and gives up on a slow recovery.',
      mistake: 'Looping the 422 with exponential backoff until the attempt counter hits the same limit as a 503.',
      followUp: 'What do you store on the unknown timeout so a person can reconcile it an hour later?',
      extension: 'How does a 429 from the partner change the delay compared with a 503?',
      alternative: 'Failing the device registration back to the user on the first 503 avoids a retry policy and makes every partner blip a user-facing error. Nothing is duplicated, and nothing rides out a one-second reset.',
    },
    evening: {
      title: 'The delay lives off the log',
      why: 'A sleep inside the handler feels like backoff. It stops the poll loop, trips the max poll interval, and makes every later record on that partition wait.',
      explain: `The geocode handler gets a 503 for one address. Sleeping for 30 seconds on the consumer thread does backoff in the worst place. The thread is not calling poll. When the pause outlasts max.poll.interval.ms, the coordinator decides the member is stuck and rebalances. The partition moves, the in-flight address is uncommitted, and the next owner hits the same 503. Even if the interval is longer than the sleep, every later address on that partition waits behind one bad record. That is head-of-line blocking.

The delay belongs where it does not hold the partition. Record the address on a retry path with a not-before time, commit the original offset, and keep reading. A different consumer, or a timer, picks up records whose time has arrived. The original partition stays current. Attempts still have a cap, and the last failure still has a dead letter. The 503 is the same failure as in a careful retry policy. Only the waiting room changed.`,
      question:
        'Geocode returns 503 for one address, and the handler sleeps 30 seconds before retrying on the same consumer. Place the wait so this address does not block the partition, and say what still has to cap the attempts.',
      hints: [
        'The consumer has to call poll inside max.poll.interval.ms to stay in the group.',
        'Committing the original offset is safe only after the retry record is durable somewhere else.',
      ],
      outline: [
        'Sleeping in the handler blocks later offsets and can exceed the max poll interval.',
        'Write the address to a delay topic or table with a not-before time.',
        'Commit the original offset after that write so the partition keeps moving.',
        'A separate reader runs due retries, and a cap still sends the address to a dead letter.',
      ],
      solution: `Take the sleep off the geocode consumer. When the 503 arrives, append the address to a delay topic or insert it with a not-before timestamp, and only then commit the next offset on the original partition. The handler returns and polls again. Later addresses are not stuck behind 30 seconds, and the member stays inside the max poll interval. The same consumer must not then block itself reading the delay topic early. Something else has to see the record when it is due.

The cap stays. Each attempt increments a count on that retry record. A 503 before the cap goes back onto the delay path with a longer not-before and jitter. After the cap, write the dead letter and stop. Without the cap, a down geocoder fills the delay topic forever. Without the durable retry write before the commit, a crash drops the address: the partition has moved on and the delay path never received it. The wait moved. The chance of losing the record did not, unless that handoff is ordered.`,
      rubric: [
        'The 503 wait is on a delay topic or table, and the original offset advances so the partition is not blocked.',
        'A separate due-time reader retries, and a cap still parks the address instead of retrying forever.',
      ],
      myth: [
        'Sleeping in the handler is backoff, and the partition is fine because the record will succeed later.',
        'The sleep occupies the only thread that can move the partition. Later records wait, and a long enough sleep is a rebalance.',
      ],
      context:
        'max.poll.interval.ms is how long the handler may go without poll. A backoff sleep is a voluntary version of the stuck member you already alert on.',
      tradeoff: 'A delay topic frees the partition and adds a second consumer to operate. Sleeping is one process and couples every address to the worst 503.',
      mistake: 'Catching the 503, sleeping in the poll loop, and raising the max poll interval so the member is not kicked.',
      followUp: 'What commits first, the delay record or the original offset, and what does a crash in between drop?',
      extension: 'How do you keep a burst of 503s from retrying in the same second once their not-before times match?',
      alternative: 'Skipping the address after the first 503 keeps the partition moving with no delay topic. You lose geocodes during a short partner blip that a delayed retry would have saved.',
    },
  },
  'dead-letter': {
    morning: {
      title: 'Keep the bytes, free the partition',
      why: 'A message that fails forever either blocks the partition or disappears. A dead letter is the third place: the bytes survive, and the main log moves.',
      explain: `A message is poison for this path when another immediate try of the same bytes will fail the same way, or when the retry budget you allowed for transient errors is spent. An unknown currency on a settlement is poison on the first handled rejection. A 503 becomes poison only after the cap. The handler understood the record well enough to decide. That is different from a parse that kills the process before any decision.

Where it goes is a dead-letter topic or queue, with the payload, the error, the attempt count, and the source topic, partition, and offset. After that write succeeds, acknowledge the original, which means commit the next offset or delete the queue message. If you copy and do not acknowledge, the source delivers it again and you have two problems. If you acknowledge and do not copy, you dropped the settlement. The dead letter is not a second worker that silently retries the same way. It is storage for a person or a job that can change something first.`,
      question:
        'A settlement consumer rejects a message with unknown currency. Define the point at which that message is poison, what you write to the dead letter, and what you do to the original offset.',
      hints: [
        'The currency will still be unknown on the next delivery of these bytes.',
        'Commit the source only after the dead-letter write has been accepted.',
      ],
      outline: [
        'The message is poison once the rejection is permanent or the retry cap is exhausted.',
        'Unknown currency is poison without spending transient retries.',
        'The dead letter stores the payload, the error, and the source coordinates.',
        'The original offset advances only after that copy is durable.',
      ],
      solution: `The settlement is poison as soon as the handler returns a permanent rejection for unknown currency. Retrying tonight will not invent the currency. You do not need to burn the transient budget first. A 503 on a different message would. This one would not. Poison here means "stop giving it to the main handler," not "the process crashed."

Write a dead-letter record that contains the original payload, the currency error, the attempt count, and the source topic, partition, and offset. When that append or enqueue is acknowledged, commit the next offset on the settlement partition. The main consumer can then read what follows. If you commit first and the dead-letter write fails, the settlement is gone and the partition looks healthy. If you write the dead letter and never commit, the next poll receives the same settlement, writes another dead letter, and the partition does not move. The copy is the memory. The commit is what frees the log.`,
      rubric: [
        'Poison is a permanent rejection or an exhausted retry budget, and unknown currency qualifies immediately.',
        'The dead letter holds payload, error, and source position, and the original offset moves only after that write.',
      ],
      myth: [
        'A dead-letter queue is where the broker puts messages after it has retried them for you.',
        'The handler classifies the failure and copies the bytes. The broker does not know which business error is permanent.',
      ],
      context:
        'The source offset on the dead letter is what a replay uses to find the original neighbors. Without it you have a payload and no provenance.',
      tradeoff: 'Parking on the first permanent error frees the partition and needs a working dead-letter writer. Retrying a permanent error a few times hides a bad deploy and delays everything behind the record.',
      mistake: 'Acknowledging the settlement as soon as the handler throws, and logging the payload only in a line that rotates overnight.',
      followUp: 'What happens to the partition if the dead-letter topic is itself unavailable?',
      extension: 'Which fields do you need later to tell a currency bug from a partner outage that used the same parking path?',
      alternative: 'Skipping the offset and emitting a metric frees the partition with no dead-letter topic. The settlement bytes are gone once retention passes, and there is nothing exact to replay.',
    },
    evening: {
      title: 'Someone has to intend the replay',
      why: 'A dead letter fills and a script copies it back onto the topic. The second attempt fails the same way unless the reason for the first one has changed.',
      explain: `A shipping-label message sits on the dead-letter topic because the carrier rejected the address, or because the carrier endpoint was down past the retry cap. The bytes are safe and useless until someone looks. The owner is the team that can change the outcome, named on the alert for that topic. For this label, that is the carrier-integration on-call, not a generic cluster channel and not the broker. They read the stored error. A growing depth with no owner is a recycle bin.

Replaying publishes the payload back to the handler. It assumes the world changed: the handler bug is fixed, the carrier is accepting calls, or the address was corrected in the replay copy. The same bytes through the same code take the same path and land on the dead letter again. Replay also assumes earlier attempts did not leave a partial label. If the carrier created the label and the response was lost, a replay creates a second label unless the request id is the same one the carrier dedupes. Putting the message back is a new offset at the end of the live partition, not a restoration of its old place.`,
      question:
        'Label requests are on a dead-letter topic after carrier failures. Who looks at them, and what has to have changed before replaying one is a reasonable thing to do?',
      hints: [
        'Name a team that can fix the handler, the carrier path, or the address. Depth alone is not an owner.',
        'A replay of an unchanged failure returns to the dead letter, and it can create a second label.',
      ],
      outline: [
        'The carrier-integration on-call owns the dead letter and reads the stored error.',
        'Replay assumes the code, the carrier, or the payload has changed.',
        'Unchanged bytes fail the same way and are parked again.',
        'Replay is a new append, and it needs the original request id so the carrier does not mint a second label.',
      ],
      solution: `The carrier-integration on-call looks. The alert names them, and the dead-letter record has the carrier error and the source offset so they can see why this label stopped. A warehouse channel that only sees depth cannot tell a bad address from an endpoint that was down. If nobody is named, the topic will sit until a disk alert, which is not a review.

Replay is reasonable after a change you can point at. The carrier endpoint is back, the parser bug is deployed, or the address fields were fixed in the copy you are about to send. Replaying because the topic felt full, with the same body and the same build, parks it again and adds noise. Check the partial-effect case first. If a previous attempt may have created the label, the replay has to send the original carrier request id so the carrier returns the existing label. The new message lands at the end of the live partition, behind current traffic, so it does not squeeze back into its old offset between neighbors that already moved on.`,
      rubric: [
        'A named owner, the carrier-integration on-call, inspects the stored error rather than an unnamed backlog.',
        'Replay is justified only after the code, dependency, or payload changes, and it must not mint a second label.',
      ],
      myth: [
        'Replaying a dead letter retries the message in its original position and is always safe.',
        'Replay appends a new record. It is safe only if the cause changed and a repeated side effect is idempotent.',
      ],
      context:
        'The dead letter bought you time to change something. Spending it as an automatic retry deletes the difference between this topic and the handler you already left.',
      tradeoff: 'Automatic replay when the carrier health check turns green saves a human and republishes payloads whose addresses were the real problem.',
      mistake: 'Copying the dead-letter topic back onto the label topic every hour with a cron job.',
      followUp: 'How do you tell a label the carrier already created from one it never saw?',
      extension: 'What order do you replay in if two dead letters for the same shipment must stay in sequence?',
      alternative: 'Fixing the address in a new message from the order service, and leaving the dead letter as an audit of the failure, avoids republishing a payload the producer has since corrected.',
    },
  },
  outbox: {
    morning: {
      title: 'One commit for the row and the intent',
      why: 'The order commits, then the process publishes and dies. The order exists and no other service ever hears about it. A later retry of the request creates a second order.',
      explain: `The outbox puts the business write and the fact that a message should exist in one database transaction. You update the order row and insert an outbox row, with a stable event id, the type, and the payload, then you commit. If the transaction rolls back, neither the order nor the event remains. If it commits, both remain. You do not call the broker inside that transaction. The broker is another system, and a network call in the middle of a database transaction holds locks for a timeout you do not control.

A relay reads committed outbox rows that are not yet marked published, appends them to the log, and then marks them. The mark happens after the broker acknowledges. The relay can crash, restart, and send the same event id again. That duplicate is expected. What the single commit removed is the lost event: an order that is durable with no outbox row, or an outbox row that survived a rolled-back order. Publish only rows you can see after commit. A relay that reads uncommitted rows will publish an order the database then undoes.`,
      question:
        'The order service commits the order and then publishes OrderPlaced on a separate call. Replace that pair with an outbox. What is inside the database transaction, and what is the relay allowed to publish?',
      hints: [
        'The broker acknowledgement cannot be a statement in the order transaction.',
        'The relay may read a row only after the transaction that inserted it has committed.',
      ],
      outline: [
        'The transaction updates the order and inserts the outbox row with a stable event id.',
        'A rollback removes both. A commit keeps both.',
        'The relay publishes only committed, not-yet-marked rows, after the database commit.',
        'It marks a row published only after the broker accepts the append.',
      ],
      solution: `Inside the transaction, write the order and the outbox row together. The outbox row carries the event id you generated with the order, the type OrderPlaced, and the payload other services need. Commit once. Do not open a broker connection while that transaction is open. If the process dies before commit, the restart's retry of the user request must hit the same order id and find the work already done or not started, not a third state where the event escaped alone.

The relay is allowed to publish a row it read after that commit, and only if the row is not already marked published. It appends the payload, waits for the broker ack, then sets the published mark. It is not allowed to publish a row from an open transaction, because that order can still roll back and the event would describe a fact that did not stick. It is also not allowed to mark the row first and publish second. A crash in that order leaves the row marked and the log empty. Mark after the ack, and accept that a crash before the mark will send the same event id again.`,
      rubric: [
        'The order update and the outbox insert commit or roll back together, with no broker call inside the transaction.',
        'The relay publishes only committed rows and marks them only after the broker acknowledges.',
      ],
      myth: [
        'The outbox publishes the event in the same moment the order commits, so listeners cannot miss it or see it twice.',
        'The commit stores the intent. A later relay performs the publish, and that second step can send the same event more than once.',
      ],
      context:
        'This is the dual write of "save, then notify" collapsed into one database commit. The notify is still a different system with its own acknowledgement.',
      tradeoff: 'Polling the outbox is simple and adds latency equal to the poll interval. A database listen/notify wakes the relay faster and is another mechanism to miss during a failover.',
      mistake: 'Inserting the outbox row in a second transaction after the order commits, which recreates the gap the pattern exists to close.',
      followUp: 'What does a second user retry see if the first transaction committed and the relay has not published yet?',
      extension: 'How does the relay keep two events for the same order in order when it publishes?',
      alternative: 'A broker transaction that includes the database, where the database supports it, can commit the order and the append together. You still need an idempotent consumer, because readers can retry.',
    },
    evening: {
      title: 'The same hold published twice',
      why: 'The outbox is treated as an exactly-once bus. The relay then crashes after the append and before the mark, and a consumer that forgets the event id books two holds.',
      explain: `The appointment transaction committed once. The outbox row for SeatHeld has event id 91. The relay appends 91 to the log, and the process dies before published_at is set. On the next pass the row still looks unpublished, so the relay appends 91 again. The log now holds two records at two offsets with one event id. That is the duplicate the outbox still allows. The database never inserted two appointments. The log did accept two publishes, because the relay's ack and its mark are not one transaction.

The calendar consumer dedupes on 91, not on the offset. It inserts an inbox row whose primary key is the event id, in the same transaction as the hold it creates locally. The first delivery inserts the hold. The second delivery conflicts on 91 and writes nothing. If the consumer minted a fresh local id and ignored 91, both deliveries would create holds. The outbox id has to travel in the payload, and the relay has to resend that same id rather than inventing a new one on the retry. Offsets will differ. The id must not.`,
      question:
        'The relay publishes SeatHeld event 91 and crashes before it marks the outbox row. Explain the duplicate that reaches the log, and how the calendar consumer avoids booking two holds.',
      hints: [
        'The outbox row is still unmarked, so a well-behaved relay sends 91 again.',
        'The consumer's unique key has to be 91, shared by both offsets.',
      ],
      outline: [
        'One outbox row produces two log records because the mark never happened.',
        'Both records carry event id 91. Their offsets differ.',
        'The consumer inserts the hold and the inbox row for 91 in one transaction.',
        'The second delivery hits the unique key and does not create a hold.',
      ],
      solution: `The duplicate is two appends of one intent. Event 91 was published, the relay died, and the outbox row was still unmarked, so the next poll published 91 again. Both records are legitimate log entries. Retention will keep both. Committing the consumer offset does not collapse them, because they are different offsets. The outbox did its job earlier: the appointment and the intent committed together. It never claimed the relay would append once. Mark-after-ack is what creates this copy, and it is still the right relay order, because mark-before-ack can lose 91 entirely.

The consumer dedupes by inserting event id 91 in an inbox table with a unique constraint, in the same transaction as the calendar hold. The first delivery commits the hold and the inbox row. The second delivery rolls back on the conflict, or catches it and commits nothing, and the hold stays singular. Deduping on offset would treat the two appends as different events and book two holds. Deduping on a new id generated at consume time does the same. The id from the outbox is the only value both publishes share.`,
      rubric: [
        'The duplicate is a second append of event 91 after the relay crashed before the published mark.',
        'The consumer's unique inbox key is event 91, so the second offset does not create a second hold.',
      ],
      myth: [
        'An outbox gives the consumer exactly one copy of each event.',
        'The outbox gives one durable intent. The relay can publish that intent twice, and the consumer has to ignore the second copy.',
      ],
      context:
        'The inbox is the other half of this crash. Without it, the safer relay order, ack then mark, becomes a double hold.',
      tradeoff: 'Marking after the ack can duplicate and does not lose the event. Marking before the ack avoids the duplicate and loses the event when the process dies in between.',
      mistake: 'Generating a new event id inside the relay on each publish attempt so the payload looks fresh.',
      followUp: 'What does the consumer commit for its offset when the second copy of 91 conflicts on the inbox?',
      extension: 'How would a second relay instance publishing the same unmarked row make this worse, and what claim stops it?',
      alternative: 'Broker idempotence dedupes a producer retry of the same sequence. The relay has to reuse the same producer sequence for event 91. A new producer process with a new sequence appends 91 again, and the inbox is still required.',
    },
  },
  'inbox-dedupe': {
    morning: {
      title: 'Remember the id in the same write',
      why: 'The handler finishes the ledger post and dies before it records that the message was handled. The redelivery posts it again.',
      explain: `An inbox is a table of message ids this consumer has already accepted. The useful form puts that row in the same database transaction as the side effect. For a ledger, you insert the message id and the posting together, with a unique key on the consumer plus the message id. Commit once. A redelivery conflicts on the id and the posting does not run again. A crash before commit rolls both back, so the retry is the first real attempt. That is the order to use when the effect lives in the same database.

If the effect is not in that database, you have a weaker order: record the id before the side effect, as its own commit, then do the call. A redelivery sees the id and does not repeat the call. A crash after the record and before the call skips the call, because the id already says the message was handled. Recording the id only after the effect is the order that doubles the work. The same transaction is available for the ledger and is not available for an external printer. Pick the strongest order the effect allows, and know which crash is left.`,
      question:
        'A ledger consumer posts a journal line for each payment message. Where do you write the processed message id relative to the journal line, and what does a redelivery do?',
      hints: [
        'The id and the journal line share one database, so they can share one commit.',
        'A unique key has to make the second transaction fail or become a no-op.',
      ],
      outline: [
        'Insert the message id and the journal line in one transaction.',
        'The unique key is the consumer plus the message id.',
        'A crash before commit leaves neither row, and the retry posts once.',
        'A redelivery conflicts on the id and does not post a second line.',
      ],
      solution: `Write the processed id in the same transaction as the journal line. One insert claims the message id for this consumer, the other insert is the posting, and one commit makes them durable together. Do not post first and insert the id later. The death between those commits is a second posting on redelivery. Do not insert the id in an earlier transaction either when you have the choice. The same commit is strictly tighter, because there is no moment where the id exists without the line or the line exists without the id.

A redelivery starts the transaction, hits the unique key, and rolls back or turns into a no-op. The journal stays at one line. You still commit the messaging offset after this database transaction, or you store the next offset in the same transaction if that is your offset design. If two deliveries run at the same time, the unique key lets one commit and makes the other lose. The loser reads the winner and moves on. It does not post.`,
      rubric: [
        'The message id and the journal line commit in one transaction, with a unique key on the id.',
        'A redelivery conflicts and does not post again, and a crash before commit retries cleanly.',
      ],
      myth: [
        'Recording the message id in a log line is enough to stop a double post.',
        'Only a unique row that the handler consults, written with the posting, stops the second transaction. A log line is not read on redelivery.',
      ],
      context:
        'This is the offset-commit gap closed for a database effect. The id is the business memory. The offset is just where to read next.',
      tradeoff: 'A unique inbox row per message adds a write and keeps a key for as long as duplicates can still arrive. Dropping keys early makes the table small and turns a late replay into a second posting.',
      mistake: 'Checking a cache for the id, posting, and inserting the id only when the handler returns success.',
      followUp: 'How long do you keep the inbox row if the payment topic can be rewound by a week?',
      extension: 'What should the unique key include if two consumer groups both legitimately post from the same message id?',
      alternative: 'Using the payment id as the primary key of the journal line is the inbox and the effect in one row. A second insert conflicts without a separate processed-message table.',
    },
    evening: {
      title: 'The badge id is stored, the printer is not',
      why: 'The inbox row committed, which is what the morning lesson asked for when the effect cannot share the transaction. The process then died before the printer answered.',
      explain: `The badge consumer cannot print inside a database transaction. The chosen order records the message id first: insert the id, commit, then call the printer. That order prevents a second print when the response is lost, because a retry finds the id and stops. It does not prevent a lost print. The window is the time after the commit and before the printer has accepted the job.

If the process is killed in that window, the restart is doing the right thing for a duplicate and the wrong thing for a missing badge. The id says handled. The printer has no job. Reversing the order, print and then insert, closes this window and opens the other one: a kill after the printer accepts and before the insert, and the retry prints a second badge. Neither order covers an external call. The same transaction would, and the printer is not in it. The remaining choice is which failure you keep, plus whatever idempotency the printer itself offers.`,
      question:
        'The consumer inserts the message id, commits, and then calls the badge printer. The process dies after the commit and before the printer responds. Where is the crash window, and what does the next attempt do with that badge?',
      hints: [
        'The inbox says the message is done even though the printer never saw it.',
        'A retry that honors the inbox will not call the printer again.',
      ],
      outline: [
        'The chosen order commits the id before the external print.',
        'The kill happens inside that gap, so no printer job exists.',
        'The next attempt sees the id and skips the message.',
        'The badge is never printed, which is the window this order still has.',
      ],
      solution: `The window is between the inbox commit and a printer response. The id is durable. The job is not. When the process dies there, nothing has been sent that you can point at, and the only record says the message was processed. The next attempt reads the inbox, treats the message as a duplicate, and does not call the printer. The attendee has no badge. The offset can advance because the handler believes it finished. That is the crash this order still has.

The reverse order would have printed and then died before the insert, and the next attempt would print again. You did not choose that, so you kept a missing badge instead of two badges. Closing this particular window needs an effect you can put in the same transaction, which the printer is not, or a printer that accepts a job id and can be asked whether that job exists. Then a retry that finds the inbox row in a started state can look the job up and send it only if the printer has never seen the id. A bare "id exists, skip" rule cannot tell a finished print from this crash.`,
      rubric: [
        'The window is the committed inbox row with no printer job, and the retry skips because the id is present.',
        'The lost badge is named as the remaining failure of record-before-call, not as a duplicate print.',
      ],
      myth: [
        'Writing the processed id before the side effect closes every crash window.',
        'It closes the double-effect window. A crash before the external call leaves the id set and the call never made.',
      ],
      context:
        'The ledger could share a transaction with the id, so it did not have this gap. The printer is a different system, and the gap moves there.',
      tradeoff: 'Record-then-print loses a badge and never prints two. Print-then-record can print two and does not forget a job the printer already has.',
      mistake: 'Treating a present inbox row as success and alerting only when the printer returns an error.',
      followUp: 'What status would you store instead of a bare id so the retry can tell a finished print from a claimed one?',
      extension: 'If the printer dedupes on job id, what does the retry send after it finds the inbox row unfinished?',
      alternative: 'Leaving the message uncommitted until the printer responds, with no inbox, avoids the skip and prints twice when the response is lost. You are back to at-least-once with no memory.',
    },
  },
  'event-driven': {
    morning: {
      title: 'A fact has no callee',
      why: 'PaymentCaptured is published and the warehouse treats a processing error as a reason to say the payment did not happen. The money has already moved.',
      explain: `A fact is past tense. It says something happened, and the service that did it is the authority. PaymentCaptured means the capture succeeded. The producer records that and moves on. It does not name the email service or the warehouse, and it does not wait for them. A consumer that is down is late. It is not a veto. When it returns, it reads the fact and catches up. Failing the consumer does not uncapture the payment.

A command is a request addressed to one handler. CapturePayment asks the payment service to capture and expects a yes, a no, or a timeout the caller has a policy for. The callee is allowed to reject it. ReserveInventory is a command to the warehouse, which can refuse when stock is short, and the caller has to hear that refusal before it captures. Publishing a fact and hoping a particular service reacts is a command with nobody obliged to answer. If the warehouse must succeed before money moves, that was a command earlier in the flow, not a subscriber on the capture event.`,
      question:
        'The payment service emits PaymentCaptured. Email and the warehouse both consume it. Is that message a fact or a command, and what is wrong with the warehouse treating its own failure as "the payment did not happen"?',
      hints: [
        'Ask whether the payment service can roll the capture back because a consumer returned an error.',
        'A command names the service that must accept or reject the work.',
      ],
      outline: [
        'PaymentCaptured is a fact. The capture has already succeeded.',
        'Email and the warehouse are listeners, not callees the producer waits on.',
        'A warehouse error means the warehouse is behind, not that the payment is void.',
        'Stock had to be reserved by a command before capture if a refusal must stop the money.',
      ],
      solution: `PaymentCaptured is a fact. The payment service is informing whoever cares that money was captured. Email can send a receipt when it is able. The warehouse can update its projection when it is able. Neither one was addressed, and the producer did not stop for their acknowledgement. A command would have been CapturePayment, sent to payments, with a failure the sender handles. This message is the result of that work, not a request to do it.

The warehouse is wrong to treat its handler error as the payment failing. The capture is durable whether or not this consumer commits its offset. Retrying the event until the warehouse is happy turns the fact into a command aimed at a service the payment flow now secretly depends on. If a stock refusal is supposed to stop the capture, the payment service had to send ReserveInventory and wait for a real answer first. A missed event means the projection is stale. It does not mean the fact is conditional.`,
      rubric: [
        'PaymentCaptured is classified as a fact that does not wait on email or the warehouse.',
        'A warehouse failure is described as lag, and a required stock check is placed in an earlier command.',
      ],
      myth: [
        'If a consumer returns an error, the event did not happen and the producer should take it back.',
        'The consumer failed to react. The fact already happened in the service that emitted it, and that service is not rolling it back.',
      ],
      context:
        'Commands need a reply path and a timeout. Facts need consumers that can be down without changing the past. Mixing them makes every subscriber part of the write path.',
      tradeoff: 'A fact lets you add a consumer without changing the producer, and the producer cannot require that consumer to succeed. A command makes success explicit and couples the caller to that callee.',
      mistake: 'Nacking PaymentCaptured so the broker will retry until the warehouse reservation succeeds.',
      followUp: 'What message should the payment service have sent earlier if the warehouse is allowed to stop the sale?',
      extension: 'Who is allowed to emit PaymentFailed, and why must that be the payment service rather than the warehouse?',
      alternative: 'Sending a command from payments to the warehouse after capture, and waiting for its reply, makes the dependency honest. The capture is then not finished from the user point of view until that reply, which is a different product.',
    },
    evening: {
      title: 'CustomerChanged means whatever you fear',
      why: 'One vague event feels like a clean bus. Every service then guesses which command was intended, and a harmless field change runs all the guesses.',
      explain: `CustomerChanged carries the whole customer document and no verb narrower than changed. The mailer treats it as "send a profile email." Billing treats it as "recompute tax jurisdiction." The warehouse treats it as "hold open shipments for address review." None of those commands is in the message. Each service inferred one from a snapshot. They are coupled to every field the producer writes, and they are coupled to each other's assumptions about which changes matter.

A backfill of marketingOptIn emits CustomerChanged for every customer. The mailer emails people who did not change their profile. Billing re-rates. The warehouse holds shipments whose addresses did not change. The producer cannot add a field, and cannot replay history, without waking those reactions. That is the coupling: the event hides several commands inside one fact that does not say what happened. A new consumer has to copy the guesses or risk acting on the wrong field. The producer has no list of those guesses, so it cannot see the outage it will cause.`,
      question:
        'Three services react to CustomerChanged, which contains the full customer and no specific verb. A backfill of a consent flag emits it for every customer. Show the coupling this creates, and name one reaction that should not have run.',
      hints: [
        'Each consumer is inferring a command from a snapshot diff it invented.',
        'The consent backfill did not change addresses, tax, or the profile the mailer talks about.',
      ],
      outline: [
        'Mail, billing, and the warehouse each interpret the same vague event as a different command.',
        'They depend on the whole document, so any field change triggers all three.',
        'The consent backfill was not an address change or a profile edit.',
        'The warehouse hold, the re-rate, or the profile email should not have run for that backfill.',
      ],
      solution: `The coupling is that one unspecified fact is being used as three commands. The mailer, billing, and the warehouse do not subscribe to something that happened. They subscribe to "the row was written," and each contains a private parser that decides whether that means email, tax, or a shipping hold. The producer is coupled to those parsers without listing them. Adding marketingOptIn, or replaying the topic, runs all three. The consumers are coupled to each other too, because they share a document shape and a guess about which diffs are noise.

The warehouse hold should not have run. The address did not change. Neither should the profile email or the tax recompute. The only fact was a consent backfill. Those reactions ran because the event was too vague to say so. Split the facts into what happened, such as AddressChanged or ConsentChanged, and send a command like HoldShipments only when the address change is one the warehouse must act on. Then a consent backfill has listeners that wanted consent, and it does not stop a shipment.`,
      rubric: [
        'The coupling is several inferred commands bound to one full-document event, so any write wakes all of them.',
        'A reaction to the consent backfill, such as the shipment hold or the profile email, is identified as unintended.',
      ],
      myth: [
        'One rich event keeps services decoupled, because the producer does not call them.',
        'The producer does not name them, and every consumer still breaks when the document changes, and acts on fields that were not its concern.',
      ],
      context:
        'A command is coupled to one callee on purpose. A vague fact is coupled to every guess, which is harder to find when it fires.',
      tradeoff: 'Specific events multiply topics and make a backfill obvious. One snapshot event is easier to produce and impossible to consume safely for a single field.',
      mistake: 'Adding a version field to CustomerChanged and assuming each consumer will ignore the fields it does not understand.',
      followUp: 'Which new event would the warehouse subscribe to so a consent backfill cannot hold a shipment?',
      extension: 'What happens to in-flight shipments if AddressChanged is replayed from the start of the log after you split the topic?',
      alternative: 'Keeping CustomerChanged as a projection feed for a read model, with no side effects, removes the fake commands. The mailer and the warehouse then need real facts or commands of their own.',
    },
  },
  sagas: {
    morning: {
      title: 'Steps that can compensate',
      why: 'A mover booking touches fleet, payments, and staffing. They do not share a transaction. One of them will succeed after another has failed.',
      explain: `A saga splits one business operation into local transactions, each owned by the service that holds that data. Book a mover like this. The fleet service reserves a truck, and its compensation is to release the truck. Payments charges the card, and its compensation is to refund. Staffing assigns a crew, and its compensation is to cancel the assignment. Each step commits in its own database. No transaction stays open across the three. If the crew assignment fails, the saga runs the compensations for the steps that did commit, refund and then release, in reverse order. Steps that never committed have nothing to undo.

A compensation is another local transaction, not a rollback of someone else's commit. It can fail, so it has to be retried, and it has to be idempotent. Other customers can see the intermediate state: the truck is reserved, then free again if you compensate. The saga does not make the three commits atomic. It makes a failure path explicit. The record of which step you are on has to live somewhere durable, or a crash after the charge and before the crew assignment retries the charge and also forgets to refund.`,
      question:
        'Break a mover booking into local steps across fleet, payments, and staffing. For each step give the compensation, and say which compensations run if the crew assignment fails after the truck is reserved and the card is charged.',
      hints: [
        'Each service commits only its own data. Name a new action that service can run later.',
        'Compensate in reverse, and skip a step that never committed.',
      ],
      outline: [
        'Reserve the truck, with a compensation that releases it.',
        'Charge the card, with a compensation that refunds it.',
        'Assign the crew, with a compensation that cancels the assignment.',
        'If assignment fails, refund the card and then release the truck. Do not cancel a crew that was never assigned.',
      ],
      solution: `The booking is three local transactions. Fleet reserves a specific truck and commits that hold. Payments charges the card and commits the charge. Staffing assigns the crew and commits the assignment. The compensations are new requests: release this truck, refund this charge id, cancel this assignment id. They are not a distributed rollback. Fleet does not need to know how payments stores a charge. It needs an API that releases a hold it previously accepted.

If staffing fails after the first two commits, run refund, then release. Do not send a crew cancellation for an assignment that does not exist. If the refund call fails, the truck stays reserved and the saga stays open on that compensation until the refund succeeds or a person takes it. Retrying the refund has to be safe, keyed by the charge id, or you will refund twice while trying to compensate once. A crash after the charge and before any durable saga step is the same shape: the charge exists, and the restart has to find it rather than charging again and hoping.`,
      rubric: [
        'Three local steps are named, each with a compensation that is a new action in that service.',
        'Crew-assignment failure runs refund and then release, and does not cancel a missing assignment.',
      ],
      myth: [
        'A saga rolls back the other services the way a database transaction rolls back its statements.',
        'Those commits already happened in other databases. The saga sends new compensating transactions, which can fail on their own.',
      ],
      context:
        'The durable step list is what makes a retry a continuation. Without it, every crash looks like a new booking.',
      tradeoff: 'Compensating keeps the services independent and shows the half-booked truck to other customers. A lock across all three would hide that and couple their outages.',
      mistake: 'Leaving the truck reserved and the card charged while you retry crew assignment forever with no compensation trigger.',
      followUp: 'What do you do if release succeeds and the refund keeps failing?',
      extension: 'Why is the charge id part of the refund request, rather than "refund the latest charge for this customer"?',
      alternative: 'Reserving the truck last avoids holding fleet inventory during a payment failure, and it can fail after the card is charged, so you still need the refund compensation. You only changed which step is the awkward one.',
    },
    evening: {
      title: 'The carrier already has the box',
      why: 'Cancel looks like a compensation for ship. Once the carrier scans the parcel, cancel does not bring the box back, and the saga is lying if it says the step was undone.',
      explain: `Shipping an order can be a saga step: ask the warehouse to hand the parcel to the carrier, and compensate by cancelling the shipment. That compensation is real only before the handoff. After the carrier scan, the parcel is in a truck. Cancelling the shipment record does not move the parcel. The compensation cannot undo the step. Marking the saga compensated at that moment hides a box that is still going to the door.

What you do instead is a forward action the carrier can refuse. Request an intercept or a return-to-sender, store that request as its own step, and leave the original shipment in place. If the carrier confirms the intercept, continue with the refund. If the carrier rejects it, do not pretend, and do not delete the shipment. Wait for delivery and open a return, and keep the saga open until one of those exists. The refund, if you issue it early, is also a new payment, not an undo of the charge, and it can fail on its own. The scan is the pivot. Past it, the path only goes forward.`,
      question:
        'The cancel-shipment compensation runs after the carrier has scanned the parcel as picked up. Why can that compensation not undo the step, and what do you do instead?',
      hints: [
        'The shipment row is yours. The parcel is in the carrier truck.',
        'An intercept is a new request with its own failure, not a rollback flag.',
      ],
      outline: [
        'Deleting or cancelling the local shipment does not retrieve the scanned parcel.',
        'Request an intercept or return as a new step, and keep the shipment record.',
        'If the carrier refuses, wait for delivery and start a return.',
        'Leave the saga open until the intercept or the return exists. Do not mark the ship step undone.',
      ],
      solution: `The compensation cannot undo the step because the effect has left your database. The carrier scanned the parcel. Your cancel updates a row the truck does not consult. The box still arrives. Treating that row update as success reports a compensated saga while the customer receives the goods and, if you also refunded, keeps the goods and the money.

Instead, send the carrier an intercept, or a return-to-sender, using the carrier's shipment id, and record that request as a new saga step with its own retries. Do not remove the ship step. If the carrier confirms, you may refund, and that refund is another step keyed by the charge id. If the carrier says the parcel is too far along, stop asking for an undo. Let delivery finish, create a return, and only then close the compensation path. A person gets the case when the intercept and the return both fail. The saga stays incomplete until one of those outcomes is durable. Completing it because the cancel API returned 200 is how the box and the ledger diverge.`,
      rubric: [
        'The carrier scan is the reason a local cancel does not undo shipping.',
        'The replacement is a new intercept or return step, and the saga stays open until that outcome exists.',
      ],
      myth: [
        'Every saga step has a compensation that restores the previous state.',
        'Some effects leave the system. You record a new forward action, and you keep the original step because it still happened.',
      ],
      context:
        'The refund of a captured card has the same shape. It is a new payment with its own failure, not a deletion of the charge. The parcel makes that obvious because you can watch it keep moving.',
      tradeoff: 'Waiting for an intercept answer leaves the saga open and the customer uncertain. Refunding immediately is kinder and pays out before you know whether the box is coming back.',
      mistake: 'Marking the shipment compensated because the local cancel endpoint returned success after the scan.',
      followUp: 'What do you show the customer while the intercept request has no answer?',
      extension: 'At what earlier scan would the cancel compensation still have been a real undo?',
      alternative: 'Forbidding cancellation after the handoff avoids a fake compensation and forces the customer into the return flow immediately. You lose the intercepts the carrier would have honored.',
    },
  },
  orchestration: {
    morning: {
      title: 'One place that knows the branch',
      why: 'A return is physical for some orders and instant for others. If each service decides the next step from a shared event, they will disagree, and the refund will run twice or not at all.',
      explain: `A coordinator is a service, or a workflow engine, that stores the current step and calls the participants. A chain of events, choreography, means each service subscribes and decides for itself what to do next, emitting another fact. The coordinator makes the sequence easy to read and makes every branch its deploy. The chain lets a service change its reaction without a central edit, and hides the sequence inside those reactions.

For a marketplace return, choose the coordinator. The next step depends on a branch the others should not re-derive. A digital good is refunded without a warehouse. A physical good waits until the warehouse confirms the parcel, and only then refunds. Shipping is refunded only if the seller had shipped. The returns service stores that step, calls inventory, payments, and mail, and runs the matching compensation when a call fails. A chain of ReturnStarted events would let payments and the warehouse each decide whether this return is digital. One of them will be wrong, or both will refund.`,
      question:
        'A marketplace return refunds digital goods immediately, and refunds physical goods only after the warehouse receives the parcel. Choose a coordinator or a chain of events for this workflow, and say why the other one is a poor fit.',
      hints: [
        'The next action depends on a branch, not on every listener doing the same thing.',
        'Two services that both infer "time to refund" will both try to.',
      ],
      outline: [
        'Choose a coordinator in the returns service that stores the current step.',
        'It refunds digital goods now, and waits for a warehouse receipt before a physical refund.',
        'It calls payments once, with the shipping rule applied in that one place.',
        'A chain makes payments and the warehouse each re-derive the branch and risk a double or missing refund.',
      ],
      solution: `Use a coordinator. The returns service holds the return id, the kind of good, and the step. For a digital good it calls payments to refund and then mail. For a physical good it calls the warehouse, waits until that call or a later receipt event says the parcel arrived, and only then calls payments. The shipping fee is included or excluded by this service, once. Compensations, such as reversing a refund that payments applied in error, are started here, where the step list is.

A chain is a poor fit because the branch is the workflow. Payments would listen for a fact and guess whether the warehouse has to go first. The warehouse would listen and guess whether a digital return concerns it. Two guesses produce two refunds or a refund that never starts because each side thought the other owned it. Independent reactions, such as "a user signed up, send mail and record analytics," can be a chain. This return is one operation with a condition, so one owner should call the steps.`,
      rubric: [
        'A coordinator is chosen, and it alone applies the digital versus physical branch before a single refund call.',
        'A chain is rejected because each listener would re-derive that branch and can double or skip the refund.',
      ],
      myth: [
        'Events are always looser coupling, so a workflow should be a chain by default.',
        'A chain loosens the caller list and scatters the branch. A conditional refund needs one owner or the participants will each run it.',
      ],
      context:
        'The coordinator is the durable saga list from the booking flow, pulled into one service that is allowed to call the others.',
      tradeoff: 'The coordinator is easy to inspect and becomes a deploy for every new return rule. A chain keeps rules next to each service and makes the live path a detective exercise.',
      mistake: 'Emitting RefundDue from both the warehouse and the returns API because each is sure it is the one that knows.',
      followUp: 'Where is the step stored, and what does a retry of the coordinator do if payments already refunded?',
      extension: 'Which new step would force a coordinator change that a choreographed mailer would not?',
      alternative: 'Choreography with a single RefundDue event emitted only by the returns service is a coordinator that happens to talk through the log. The branch is still in one place, which is the part that matters. A second emitter breaks it.',
    },
    evening: {
      title: 'The question you cannot answer',
      why: 'Provisioning looks finished in a design review. On Monday the hire has no laptop, and the style you picked decides whether you can even find the stuck step.',
      explain: `New-hire setup creates a badge, orders a laptop, and opens payroll. In a chain, the hire record emits EmployeeCreated. Badge, laptop, and payroll each react and emit their own facts. No row says which step the hire is on. In a coordinator, a workflow service calls those three, stores the step, and will not proceed while it is down.

Each style makes a different operational question harder. The chain makes "which step stalled?" harder, because the answer is a join across three logs and a missing event looks like a service that never subscribed. The coordinator makes "can anything move while we deploy the workflow, and who edits a new background check?" harder, because the participants do not advance themselves and every new check is a change to the central graph. You can still pick either style. You cannot pick it and keep the easy question from the other one.`,
      question:
        'Badge, laptop, and payroll are set up for each new hire, either as a chain of events or by a coordinator. Name the operational question each style makes harder when a hire arrives on Monday without a laptop.',
      hints: [
        'The chain has no single row that names the current step.',
        'The coordinator knows the step and does not run while that service is down.',
      ],
      outline: [
        'The chain makes it harder to see which of badge, laptop, or payroll stalled.',
        'You reconstruct that from several logs and a missing event.',
        'The coordinator makes it harder to move during its own outage or deploy.',
        'Adding a background check is a coordinator change, even if another team owns the check.',
      ],
      solution: `The chain makes this question harder: which step is the hire stuck on, and which event never fired? Badge may have printed, payroll may have opened, and the laptop service may have missed EmployeeCreated or failed without a fact anyone else stores. You answer by correlating three logs. There is no step field to query. A compensation is similarly hard, because the order of undo is tribal knowledge in the subscribers rather than a list.

The coordinator makes a different question harder: why is every hire stuck, and how do we add a step without this team? If the workflow service is deploying or down, badge and laptop do not move, even though those services are healthy. The stuck hire without a laptop is easy to see, the step says order_laptop, and the outage is centralized. Inserting a background check means editing and deploying the coordinator, including a migration of in-flight hires, even though another team owns the check. The chain would have let that team subscribe. The chain would have made Monday's missing laptop a search. Pick the question you can staff.`,
      rubric: [
        'The chain is tied to the harder question of which step stalled, answered only by joining several logs.',
        'The coordinator is tied to the harder question of progressing during its outage and changing the graph to add a step.',
      ],
      myth: [
        'A coordinator is strictly easier to operate, because the workflow is visible.',
        'Visibility of the step is the part that gets easier. Deploys, downtime, and adding a step get harder because nothing moves without that one service.',
      ],
      context:
        'The return flow chose a coordinator because the branch was the risk. Hiring setup may choose the chain if the steps are independent and the on-call can stand to search.',
      tradeoff: 'Central state makes a status page trivial and the workflow service a single point of failure. Scattered events survive one service being down and lose the status page.',
      mistake: 'Adding a coordinator and also letting laptop order itself from EmployeeCreated, so both paths order a machine.',
      followUp: 'What single field would you store if you keep the chain and still want Monday\'s question to be easy?',
      extension: 'Which style makes a poison laptop event stall only laptops, and which can stall badge and payroll too?',
      alternative: 'A chain where each service writes its step onto the hire row in one shared database gives you the status field without a workflow engine. The hire row becomes the coordinator state, with writers you no longer fully control.',
    },
  },
  'poison-messages': {
    morning: {
      title: 'The offset that kills its reader',
      why: 'A handler error can be caught and parked. A record that kills the process never reaches that catch, and the next owner dies on the same offset.',
      explain: `A poison message of this kind crashes every consumer that reads it, before the offset can move. A compressed blob that expands until the process is killed, or a length field the native decoder cannot survive, does that. The member fetches the offset, the process dies, and no commit is sent. The group sees a dead member, rebalances, and assigns that partition to someone else. The new member fetches the same offset, because the committed position never passed it, and dies the same way.

The rest of the log is fine. Other partitions move until they share a process with this one. They often do. The crash takes down every partition that member held, not only the bad offset. Rebalance spreads those to survivors, then hands someone the bad partition, and that process dies too. A handled exception is not this failure. You can catch it, copy the record, and commit. Here the code that would catch it never runs, or it runs inside a decoder the client calls before your loop. The partition's committed offset is stuck on the record that does the killing.`,
      question:
        'One audit record expands during decode and kills the process. Explain why every member that is given that partition crashes, and why the committed offset does not move past the record.',
      hints: [
        'A dead process does not get to commit the next offset.',
        'The following owner starts at the last commit, which is still this record.',
      ],
      outline: [
        'Decode kills the process before the handler can park the record or commit.',
        'The group rebalances because the member is gone.',
        'The new owner reads the same offset and crashes the same way.',
        'Other partitions on the crashed process stop until they are moved, then the bad partition kills their new process too.',
      ],
      solution: `Every member crashes because every member that owns the partition reads the same next offset and runs the same decode. The record is not removed on failure. It is still the first unread record. Membership changes do not skip an offset the group never committed. So the rebalance is not a remedy. It is how the crash spreads to the next process.

The offset does not move because the commit happens in the process that just died, after a successful handle. The kill is before that. There is no broker-side "this delivery failed, go to the next record." The committed position stays, and the log end moves on without this partition's consumer. Partitions that happened to share the dead process stall until rebalance, then run again on a survivor, until that survivor is given the poison partition and dies. One record is enough. A try/catch in the handler does not wrap a decoder that aborts the process first.`,
      rubric: [
        'Each new owner rereads the uncommitted offset and crashes in decode, so the rebalance repeats the kill.',
        'The offset stays because a dead process never commits, and other partitions on that process are disrupted with it.',
      ],
      myth: [
        'If one consumer crashes, the group skips the bad message and keeps going.',
        'The group skips nothing. It assigns the same offset to the next member, which crashes before it can commit past it.',
      ],
      context:
        'A dead letter helps after a handler returns. It does not run when the process is gone before the handler. The stuck offset is the clue that you never got that far.',
      tradeoff: 'A tight max poll interval detects the dead member quickly and spreads the poison partition faster. A long interval delays the spread and leaves the partition idle the whole time.',
      mistake: 'Restarting the deployment in a loop and calling it a flaky instance, while every new pod dies on the same offset.',
      followUp: 'Which metric shows one partition stuck and the process restarting, rather than a general error rate?',
      extension: 'How does this record stop partitions other than its own before the rebalance finishes?',
      alternative: 'Isolating each partition in its own process contains the crash to that partition. You spend a process per partition, and the bad one still restarts forever until something skips the offset.',
    },
    evening: {
      title: 'Park the bytes, then step past them',
      why: 'Restarting the consumer feels like the fix until the same offset kills the new process. Something outside the process has to count the deaths and move the commit.',
      explain: `The import partition is stuck on a record that aborts the decoder. An in-memory retry count dies with the process, so it never reaches the threshold. The count has to be durable before the dangerous parse, keyed by group, topic, partition, and offset. Fetch the record as raw bytes, with a deserializer that does not interpret the payload. Increment the counter. If the counter is over the budget, do not parse.

Then park or skip, on purpose. Parking writes the raw bytes, plus the source coordinates, to a quarantine topic, and only after that write is acknowledged commits the next offset on the import partition. A crash between those two steps may quarantine twice, so the quarantine writer dedupes on the source offset. Skipping commits the next offset with no copy, which frees the partition and loses the bytes when retention passes. Either way the next poll reads the following record, the process stays up, and one message cannot hold the partition. A later rewind will see the record again, so the counter or the fixed decoder has to remain in the path.`,
      question:
        'Design the skip or park behavior for an import record that kills every process that decodes it. One message must not stall its partition forever. Say where the attempt count lives and when you commit.',
      hints: [
        'The counter has to survive the process death, and it has to increment before the parse that kills you.',
        'Commit the next offset only after a park copy exists, unless you have deliberately chosen to skip and lose it.',
      ],
      outline: [
        'Read raw bytes and increment an external counter for this offset before parsing.',
        'Past the budget, do not decode. Write the raw bytes to quarantine, keyed by the source offset.',
        'Commit the next import offset only after that quarantine write succeeds.',
        'The following record is then read by a living process, so the partition cannot stall on this one forever.',
      ],
      solution: `Store the attempt count outside the process, keyed by group, topic, partition, and offset. On each start, read the record with a byte deserializer, increment that counter, and only then consider parsing. The first deaths crawl the counter up. Once it crosses the budget, do not call the decoder that kills you. Publish the raw bytes to a quarantine topic with the source offset, and wait for that append to be acknowledged. Then commit the next offset on the import partition and poll. The bad record stays in the log until retention, and a copy sits in quarantine for someone to inspect with a safer tool.

Commit after the copy, not before. A commit first frees the partition and can lose the only bytes if the quarantine write never happens. A batch commit that jumps past later records you have not read would free the stall by skipping good imports, so commit only this offset. If you choose skip instead of park, commit the next offset with no copy and accept the loss. Duplicate quarantine writes from a crash before the commit are the same source offset twice. Deduke them. After this, a single poison record cannot pin the partition, because the process that sees the high counter stays alive and moves on. Fix the decoder before a rewind, or the counter will park it again on purpose.`,
      rubric: [
        'The failure count is durable and incremented before decode, so process death still advances the budget.',
        'The design parks raw bytes and then commits only the next offset, or skips on purpose, so the partition continues.',
      ],
      myth: [
        'A try/catch around the handler will dead-letter a message that crashes the consumer.',
        'The crash happens before that catch, and the in-memory catch dies with the process. The counter and the commit have to live outside that death.',
      ],
      context:
        'Quarantine is a dead letter you write without decoding. The ordinary dead letter assumed the handler ran and classified the error. This path assumes it cannot.',
      tradeoff: 'Parking keeps the bytes and needs a quarantine topic plus a dedupe key. Skipping is operationally smaller and throws away the import once retention deletes it.',
      mistake: 'Committing the end of the current poll batch so the poison offset is behind you, along with records you never handled.',
      followUp: 'What dedupes the quarantine topic when you crash after the copy and before the import commit?',
      extension: 'Why must the first deserializer return raw bytes instead of the object the rest of the importer uses?',
      alternative: 'Stopping the consumer and deleting the offset with an operator tool also unstalls the partition. It requires a person, and a rewind or a missed commit puts the record back in front of the decoder.',
    },
  },
  'consumer-lag': {
    morning: {
      title: 'The age of the unread record',
      why: 'A lag alert fires on a count. Ten thousand messages can be four seconds, and thirty messages can be a partition that stopped half an hour ago.',
      explain: `Lag as a count is the distance from the consumer's committed offset to the end of the partition, summed if you must show one number. It counts how far behind in records, roughly, and it says nothing about how long those records have been waiting. A high-rate partition can be thousands of offsets behind and only a few seconds old. A low-rate partition can be a handful of offsets behind and an hour old. The time that matters is now minus the timestamp of the oldest record not yet finished, the record sitting at the committed offset. Use the event time if the timestamp is when the thing happened, and be explicit about which clock.

A flat count is not a healthy consumer. If the producer has stopped and the consumer is stuck, the count stays still and the head record gets older. If both are moving and the consumer is slower, the count and the age grow together. Read both, and read them per partition. A sum can look fine while one partition's head is old, which is a stuck key, a poison offset, or a member that lost that partition and did not regain it.`,
      question:
        'Partition A is 10,000 offsets behind and the record at its commit is 4 seconds old. Partition B is 30 offsets behind and the record at its commit is 25 minutes old. Which consumer position is further behind, and why is the count the wrong comparison?',
      hints: [
        'Compare the timestamps at the committed offsets, not the end offsets.',
        'A fast log produces a big count for a small delay. A stopped consumer produces a growing age for a small count.',
      ],
      outline: [
        'The count says A is further behind, 10,000 against 30.',
        'The time says B is 25 minutes behind and A is 4 seconds behind.',
        'Further behind means the age of the unread head, which is B.',
        'A single summed count would hide B if A dominates the total.',
      ],
      solution: `B is further behind. Its oldest unfinished record has been waiting 25 minutes. A's oldest unfinished record has been waiting 4 seconds, even though 10,000 offsets sounds larger. The count is the wrong comparison because offsets are not time. A produces fast enough that 10,000 records are a few seconds of log. B produces slowly, or not at all, so a gap of 30 is a long wait. If you page on count, you will page for A and sleep through B.

Read the timestamp at the committed offset and subtract it from now, per partition. The commit is the first record you have not declared done, so its age is the delay a new effect is suffering. The end of the log does not tell you that. If B's producer is idle and the consumer is crashed, the count will not climb and the age will. The alert that matches the user is the age, with the count beside it so you can tell a wide backlog from a stuck head.`,
      rubric: [
        'B is further behind because its unread head is 25 minutes old, against 4 seconds on A.',
        'The count is rejected as the comparison because offset distance is not wait time, and a sum would hide B.',
      ],
      myth: [
        'The consumer with the larger lag count is the one users are waiting on.',
        'Users wait in time. A large count on a fast log can be newer than a small count on a partition that has stopped.',
      ],
      context:
        'End offset minus committed offset is still the right size estimate for a backlog. It becomes an incident number only after you multiply by how long a record sits, or simply read the timestamp.',
      tradeoff: 'Alerting on age pages you for a stuck low-volume partition and stays quiet during a tall, short spike. Alerting on count does the reverse.',
      mistake: 'Paging when the summed lag crosses 10,000, which partition A does every afternoon while it is four seconds behind.',
      followUp: 'What does a flat count and a rising age tell you that a rising count and a rising age do not?',
      extension: 'How would you compute the age if the record timestamp is ingest time and the event actually happened an hour earlier?',
      alternative: 'Tracking the timestamp of the last processed record and alerting when it stops changing catches a stall even when the producer is quiet and the lag count is zero.',
    },
    evening: {
      title: 'Slack that drains, delay that will not',
      why: 'Both consumers are behind. One is a digest the product allows to be late. The other is a login code whose usefulness is about to hit zero.',
      explain: `Healthy slack is time-behind you expected, inside the promise, with a way back. The recommendation digest may run 12 minutes behind after the morning import, with a huge count, if the age is falling and the product allows an hour. Workers are faster than the current arrival rate, so this is the spike a queue is for. Waking someone up because the count is large spends the on-call to watch a drain.

An incident is time-behind that misses, or will miss, the deadline the feature has. The OTP consumer at 40 seconds, with a few dozen messages, is an incident when codes expire at 60 seconds and the age is still rising. The count is small because codes are not a firehose. The user is about to receive a code that is already dead, or none at all. A flat age under the deadline can be acceptable processing delay. A rising age on the OTP path is the consumer losing to arrivals, or one stuck partition, and it will cross 60 seconds. Judge the slope and the promise. Do not judge the two consumers by whose count is larger.`,
      question:
        'The digest worker is 12 minutes and a large count behind after a morning import. Age is falling, and the product allows an hour. The OTP worker is 40 seconds and a few dozen messages behind. Age is rising, and the code expires at 60 seconds. Which lag is healthy slack, and which is an incident?',
      hints: [
        'Compare each age with its own deadline, and look at whether the age is falling or rising.',
        'The digest count is allowed to be large if the delay fits in the hour and is shrinking.',
      ],
      outline: [
        'The digest is healthy slack: 12 minutes is inside an hour, and the age is falling.',
        'That is a backlog draining after a burst, which is what the buffer is for.',
        'The OTP lag is an incident: 40 seconds is near a 60-second expiry, and the age is rising.',
        'The small OTP count does not make it healthier than the digest.',
      ],
      solution: `The digest is healthy slack. Twelve minutes is well inside the hour the product stated, and a falling age means the workers are outrunning current arrivals. The large count is the morning import sitting in the buffer. It should be gone before it threatens the hour. Page only if the age turns upward and stays there, or if a single partition stops while the others drain. Until then, this is the queue absorbing a spike, and the chart is supposed to look behind.

The OTP lag is an incident now. Forty seconds against a sixty-second expiry leaves almost no margin, and a rising age means the next interval is worse, not better. The few dozen messages are enough to make sign-in late. Look for a stuck partition, a poisoned code, or a sender slower than the request rate, and do not wait for the count to look impressive. A stable 10-second OTP age would still be slack if it stayed under the expiry. Rising age this close to the deadline is not. The digest's bigger count is not the page. The OTP's clock is.`,
      rubric: [
        'The digest is healthy because its age is inside the hour and falling after the import.',
        'The OTP path is an incident because its age is rising toward a 60-second expiry, despite a small count.',
      ],
      myth: [
        'Lag is an incident when the message count is large, and fine when the count is small.',
        'The digest can be largely behind and on time. The OTP path can be a few messages behind and already about to miss expiry.',
      ],
      context:
        'The digest lag is the receipt-queue spike doing its job. The OTP lag is the fraud-queue deficit, small and urgent, because there is no spare rate before the deadline.',
      tradeoff: 'Paging on OTP age near expiry catches dead codes and pages you for a brief blip that recovers inside 60 seconds. A longer threshold misses the only window the code had.',
      mistake: 'Silencing the OTP alert because its count is far below the digest threshold you copied onto every group.',
      followUp: 'What slope of OTP age, measured over a minute, would tell you the expiry will be missed before the next page fires?',
      extension: 'When would a falling digest age still be an incident before it reaches the hour?',
      alternative: 'Shedding new digest work once age passes 30 minutes keeps the hour and drops recommendations. Shedding OTP work does not help the user. That path has to catch up or fail the login honestly.',
    },
  },
  'notification-pipeline': {
    morning: {
      title: 'Store the intent, then send',
      why: 'The appointment service calls the push provider inside the request. A timeout retries the whole request, and the provider is now part of the booking transaction.',
      explain: `One reminder crosses four stages, and only the last one talks to a phone. Produce writes the fact that a reminder is due, in the same transaction as the appointment change, as an outbox row. The booking request does not wait on a push provider. Store is the notification service turning that fact into one notification row, unique on the source event id, with the user, the template, and the payload. A second delivery of the event finds the row and does not create another reminder.

Fan-out expands one notification into a delivery per channel the person asked for, such as an inbox row, a push token, and an email. Those are rows, written before any provider call. Send is a worker per delivery that calls the provider and records the response. The log consumer commits after the notification and the delivery rows exist, not after the push succeeds. The send has its own retry. Mixing the provider call into the consumer makes a slow phone stall the partition and makes a redelivery send again unless the send itself remembers the delivery id.`,
      question:
        'Sketch produce, store, fan-out, and send for an appointment reminder that can become an inbox row, a push, and an email. Say which stage may call the push provider, and when the log consumer commits.',
      hints: [
        'The appointment transaction records that a reminder exists. It does not open a connection to the push provider.',
        'Fan-out writes one row per channel. The send workers are what talk to providers.',
      ],
      outline: [
        'Produce writes an outbox event in the same transaction as the appointment.',
        'Store inserts one notification row keyed by that event id.',
        'Fan-out inserts a delivery row per channel, still without calling a provider.',
        'Send calls push or email for one delivery, and the log consumer commits once the rows exist.',
      ],
      solution: `Produce happens in the scheduling service. The transaction that saves the appointment also inserts a reminder-due outbox row with a stable event id. A relay publishes it. The request returns without calling a push provider. Store happens in the notification service: consume that event and insert one notification for the user, unique on the event id, copying the appointment time and the template. A duplicate publish inserts nothing.

Fan-out reads the user's channels and inserts delivery rows: one inbox, one push for each token, one email. It still does not call out. Send is a separate worker that claims a delivery row, calls the inbox writer, the push provider, or the mailer, and stores the response on that row. The log consumer commits its offset after the notification and the delivery rows commit. If it dies before that, the event id keeps store idempotent. If a send fails, the delivery row retries on its own. The partition is not waiting on the phone, and a second event delivery does not create a second set of sends once those rows exist.`,
      rubric: [
        'Produce, store, fan-out, and send are separated, and only send calls the push provider.',
        'The log consumer commits after the notification and delivery rows exist, with the event id keeping store idempotent.',
      ],
      myth: [
        'The service that knows the appointment should send the push before it returns, so the reminder cannot be lost.',
        'That call puts the provider in the booking path. The outbox plus a stored notification is what keeps the reminder without making the booking wait on the phone.',
      ],
      context:
        'The outbox row is the produce stage. The notification row is the inbox for that event. The delivery rows are the unit the sender can retry without rereading the log.',
      tradeoff: 'Four stages add delay between the appointment and the phone and make each failure visible. One inline push is faster and ties a booking outage to a provider timeout.',
      mistake: 'Calling the push provider inside the log consumer before commit, so a retry of the event sends a second push.',
      followUp: 'What is the unique key on a delivery row if the user has two push tokens?',
      extension: 'Which stage do you replay if the template was wrong and the pushes already went out?',
      alternative: 'Sending email only, with no fan-out rows, collapses fan-out and send into one worker. You lose per-channel status, and a failed push can no longer retry without retrying the email.',
    },
    evening: {
      title: 'One page id on every attempt',
      why: 'The incident consumer retries after a timeout and the on-call phone rings twice. The event was deduped. The send minted a new page each time it tried.',
      explain: `An alert becomes a page through the same stages, and the duplicate the user feels is at the send. Deduping the alert event stops a second notification row. It does not stop the sender from calling the pager twice if the first call timed out and the handler tries again. The retry has to present the same page id the provider already saw. A fresh UUID per attempt is a second page by construction.

Claim a delivery id before the call, deterministic from the alert id and the user, unique in your table, status claimed. Send that id as the provider dedup key. On a retry, find the claimed row and call again with the same key. Do not insert another id. If the provider honors the key, the second HTTP call collapses into the first page. If you mark the row sent before the call, a crash skips the page. If you mark it only after a success and the provider ignores the key, a crash after the phone rang and before the mark can still page twice. Place the dedupe on the send, using a stable id, and say so when the provider cannot honor it.`,
      question:
        'A retry of the page sender must not ring the on-call phone twice for one alert. Where do you place the dedupe, and what id does the second attempt send?',
      hints: [
        'The unique key is fixed when the delivery is created, not inside each HTTP attempt.',
        'The provider has to see that same key, or your local row cannot un-ring a phone.',
      ],
      outline: [
        'Dedupe the page at send time, not only when the alert event is stored.',
        'The delivery id is derived from the alert id and the user, and inserted before the call.',
        'The retry loads that row and sends the same id as the provider dedup key.',
        'A new id per attempt is rejected because the provider would treat it as another page.',
      ],
      solution: `Place the dedupe on the send, in addition to the unique notification row for the alert event. Before the first call, insert a delivery row whose id is a function of the alert id and the user, with a unique constraint and a status of claimed. Call the pager with that id as its dedup key. The log consumer's dedupe stops a second fan-out. It does not stop this call from being retried, which is the retry that reaches the phone.

The second attempt sends that same delivery id. It finds the claimed row and does not allocate a new one. If the provider stores the key, the repeated call is one page. Mark the row sent after the provider accepts, so a crash before the call can still send, and a crash after acceptance retries with the same key instead of skipping. If this provider has no dedup key, a local row cannot close the window where the phone already rang and the mark did not commit. Then you cannot honestly promise one ring. Pick a provider that honors the key, or accept a second page and do not claim otherwise. Generating the idempotency key inside the attempt is the bug that makes every timeout a new page.`,
      rubric: [
        'The dedupe that stops a double page is a stable delivery id at send time, not only the alert-event inbox.',
        'The retry transmits that same id as the provider dedup key, and a per-attempt UUID is rejected.',
      ],
      myth: [
        'If the consumer commits the alert offset after handling it, the user cannot be paged twice.',
        'The offset stops a second read from becoming a second row. A retry of the provider call still pages twice unless that call reuses a dedup key.',
      ],
      context:
        'This is the badge-printer window on a phone. Record-before-call plus a provider that remembers the id is what makes the retry one page. The local row alone does not un-ring the handset.',
      tradeoff: 'Claiming the id before the call prevents a second page and can leave a claimed row with no page if you skip retries. Retrying with the same key needs a provider that actually dedupes.',
      mistake: 'Creating a new page UUID inside each send attempt and storing it only after the provider returns 200.',
      followUp: 'What do you do with a claimed row whose call timed out and whose provider does honor the dedup key?',
      extension: 'Where would a second page still come from if both the event inbox and the delivery id are unique, but the provider ignores the key?',
      alternative: 'Suppressing further pages for that user for a short window collapses repeats and also swallows a different alert that should have rung. The stable alert id is the narrower key.',
    },
  },
};
