import type { LessonPair } from './publish';

export const scalabilityLessons: Record<string, LessonPair> = {
  'estimation-method': {
    morning: {
      title: 'Inputs, arithmetic, uncertainty',
      why: 'A capacity number with no inputs cannot be checked. When it is wrong you cannot tell whether the forecast failed or the division did, so the next estimate repeats the same fog.',
      explain: `Write an estimate as three visible parts. The inputs are the quantities you will multiply or divide: requests per second, what one machine sustained, a CPU ceiling, a payload size. The arithmetic is that multiplication, including the unit change from percent to a rate. The uncertainty is which input moves the answer if it is off by two times, written as a second result, not as a shrug.

A bare total cannot be reviewed. "We need three instances" does not say what to change when launch traffic is different. "800 divided by about 273 is 2.9, so 3, and 1,600 would mean 6" can be recomputed by someone who was not in the room. That is the whole method.`,
      question:
        'Estimate app instances for a peak of 800 requests per second. A Tuesday test got 250 requests per second from one instance at 55% CPU. You will not plan above 60% CPU. Write the inputs, the arithmetic, and the instance count if that peak is really 1,600.',
      hints: [
        'Scale the tested rate by 60/55 before you divide the peak by it.',
        'Run the same division on 1,600. Do not hide the miss inside a blanket safety factor.',
      ],
      outline: [
        'Inputs are 800 requests per second, 250 at 55% CPU, and a 60% ceiling.',
        'Usable rate is 250 * 60 / 55, about 273 requests per second.',
        '800 / 273 is about 2.9, so the estimate is 3 instances.',
        'A peak of 1,600 gives about 5.9, so 6 instances, by the same division.',
      ],
      solution: `The inputs are the 800 request peak, the test result of 250 requests per second at 55% CPU, and the 60% ceiling. Usable rate is 250 * 60 / 55, which is about 273 requests per second. 800 / 273 is about 2.9. You cannot schedule a fraction of a machine, so the estimate is 3 instances. Write the division next to the 3. The 3 is not a separate fact.

Uncertainty sits on the peak. At 1,600 requests per second the same usable rate gives 1,600 / 273, about 5.9, so 6 instances. If the Tuesday mix was cheaper than production and a box can only do 140 requests per second, three boxes cover about 420, not 800. Those two alternate results belong in the estimate. A multiplier you cannot attach to an input is not uncertainty. It is a way to stop showing the arithmetic.`,
      rubric: [
        'The usable rate is computed from 250, 55%, and 60%, and 800 is divided by that rate to reach 3.',
        'A doubled peak is run through the same division and lands on 6 instances.',
      ],
      myth: [
        'A capacity estimate is a single number you are supposed to defend.',
        'The number is the output of inputs. A review that cannot see the inputs cannot tell which one to replace when reality disagrees.',
      ],
      context:
        'This is the same habit as a timeout budget. You show the parts, then the sum, then which part is a guess. Operators can substitute a new measurement without starting over.',
      tradeoff: 'Rounding 2.9 up to 3 buys a little idle capacity and fails as soon as the forecast is low. Adding a fourth instance so a deploy can remove one is a real requirement only if you write that requirement down.',
      mistake: 'Multiplying the instance count by two for safety without naming which input was distrusted.',
      followUp: 'How many instances cover 800 requests per second if one of the three is drained for a deploy?',
      extension: 'Which input do you replace first if a test of the real handler mix sustains only 100 requests per second per instance?',
      alternative: 'Sizing from CPU headroom alone, "55% means we can almost double," never writes the request rate. It also hides a mix that does not match Tuesday.',
    },
    evening: {
      title: 'Measured numbers and invented ones',
      why: 'Some inputs come from a log or a test. Some come from a slide. Treating both as measurements makes the estimate look tighter than it is, and you will scale the wrong term when launch disagrees.',
      explain: `A measured number has a source you can open. An access log, a load-test table, a sampled row size, an invoice. An invented number is a forecast, a guess about how users behave, or a round figure that let someone finish the sheet. Both may appear in an estimate. They do not get the same label.

When the launch is quiet or on fire, you revisit the invented inputs first. Doubling a measured per-box rate because the total missed will buy machines you may not need, if the real error was the forecast. The mark is what makes that diagnosis possible the week after, when nobody remembers which cell was a guess.`,
      question:
        'An estimate used these figures: 40,000 daily users, 10% of them active in the peak minute, 12 requests from each of those users in that minute, a peak of 800 requests per second, 250 requests per second from the Tuesday test, and a 4 KB median body from the access log. Which are measured, which are invented, and which invented inputs produced the 800?',
      hints: [
        'A test printout and a log percentile have a source. A launch forecast does not.',
        'Rebuild 800 as users, times the active fraction, times requests, divided by 60.',
      ],
      outline: [
        'The Tuesday rate and the 4 KB median are measured. They have a test and a log.',
        'The 40,000 users, the 10% active, and the 12 requests are invented.',
        'The 800 is invented too. It is 40,000 * 0.10 * 12 / 60, not a graph reading.',
        'The instance count inherits that invention. It is not itself a measurement of launch traffic.',
      ],
      solution: `Mark the Tuesday result of 250 requests per second and the 4 KB median as measured. You can point at a test and a log. Mark 40,000 users, 10% active in the peak minute, and 12 requests per active user as invented. Nobody has observed this launch. The 800 is invented as well. It is not a reading from production. It is 40,000 * 0.10 * 12 / 60. That is 4,000 users * 12 requests / 60 seconds, which is 800. Change 10% to 5% and the peak is 400. Change 12 requests to 24 and the peak is 1,600.

Do not blend these into one confidence. The machine rate can be retested this afternoon. The 40,000 will not be known until the launch happens, and the 10% may never be known, because "active in the peak minute" was a modeling choice. If production arrives at 200 requests per second, the Tuesday test was not refuted. The forecast was. Buying instances because "the estimate failed" treats an invented input as if it had been measured.`,
      rubric: [
        'The test rate and the log median are marked measured, and the user forecast, the active fraction, and the requests-per-user figure are marked invented.',
        'The 800 is shown as 40,000 * 0.10 * 12 / 60, so it is derived from invented inputs rather than observed.',
      ],
      myth: [
        'Once a guess is written into the spreadsheet it has the same standing as a measurement.',
        'A cell with a source can be checked this afternoon. A launch forecast cannot. The estimate has to keep those labels or the wrong term gets scaled.',
      ],
      context:
        'Incident reviews do this with graphs and hunches. The graph is the measurement. The sentence about what users "probably" did is the invention. Capacity work has the same split, earlier.',
      tradeoff: 'Refusing every invented input leaves you unable to size a launch that has no traffic yet. Hiding the invention inside a measured-looking total makes the miss impossible to explain.',
      mistake: 'Retesting the instance until it matches the forecast, instead of marking the forecast as the number that was never observed.',
      followUp: 'If the access log later shows 8 requests per active user rather than 12, which part of the estimate do you recompute, and which part do you keep?',
      extension: 'What would you need to see in a log before the 10% active fraction could be relabeled as measured?',
      alternative: 'Giving every input a range, such as 20,000 to 80,000 users, still needs the measured mark. A range around an invention is not a measurement. It is a wider invention.',
    },
  },
  'qps-bytes': {
    morning: {
      title: 'From requests per second to bytes',
      why: 'A rate without a payload size is not a bandwidth and not a disk plan. People quote requests per second because it is easy to say, then discover the bytes on the invoice.',
      explain: `Bandwidth is requests per second times bytes per request, at the peak you must carry. Storage per day is the average rate, times bytes stored per request, times 86,400 seconds. Peak is the wrong rate for the daily integral. Average is the wrong rate for the size of the pipe. The two answers use the same payload and different rates.

State the byte unit before you multiply. If 20 KB means 20,000 bytes, say so. A factor of 1,024 buried in one step and not the other is enough to make two honest estimates disagree by a visible amount. Replication and indexes are extra multiples. Leave them visible. Do not fold them into the payload.`,
      question:
        'You store one object per write. Average is 200 writes per second. Peak is 800. Each object is 20,000 bytes. What is the peak bandwidth into the store, and what is the logical storage added per day? State the unit of a gigabyte you used.',
      hints: [
        'Peak times payload is the pipe. Average times payload times 86,400 is the daily bytes.',
        'Do not multiply the daily total by the peak of 800. That counts the busy minute as if it lasted all day.',
      ],
      outline: [
        'Peak bandwidth is 800 * 20,000 bytes per second, which is 16 MB/s.',
        'Average writes per day are 200 * 86,400, which is 17,280,000.',
        'Logical storage is 17,280,000 * 20,000 bytes, which is 345.6 GB per day.',
        'A gigabyte here is 10^9 bytes. Replication is not in this total yet.',
      ],
      solution: `Peak bandwidth is 800 writes per second * 20,000 bytes, which is 16,000,000 bytes per second. Call that 16 MB/s, using a megabyte of 1,000,000 bytes. In bits that is 128 Mbit/s, before protocol overhead. That is the pipe you have to carry at the busy moment. It is not the daily disk growth.

Logical storage uses the average. 200 * 86,400 is 17,280,000 writes per day. Times 20,000 bytes is 345,600,000,000 bytes per day. A gigabyte of 10^9 bytes makes that 345.6 GB per day. This is one logical copy of the objects. It does not yet include replicas, indexes, or a retry that writes the same object twice. Using 800 instead of 200 for this integral would report about 1.4 TB per day and would be counting the peak as if it were the whole day.`,
      rubric: [
        'Peak bandwidth is 800 times 20,000 bytes per second, stated as 16 MB/s or 16,000,000 bytes per second.',
        'Daily storage uses 200, not 800, times 86,400 times 20,000, and lands on 345.6 GB for a single logical copy.',
      ],
      myth: [
        'Requests per second are already a storage estimate if you know the service is busy.',
        'Without a byte count, 200 and 800 are rates. The disk and the pipe are rates times bytes, and they use different rates.',
      ],
      context:
        'A load balancer graph in requests per second can look calm while the disk fills, if the objects got larger and the rate did not. The missing axis is bytes.',
      tradeoff: 'Sizing the pipe for the peak wastes idle bandwidth all night and survives the busy minute. Sizing it for the average is cheaper and drops writes at the peak.',
      mistake: 'Multiplying the peak rate by the payload and calling that product the storage added each day.',
      followUp: 'What does the daily total become if every write is retried once and both attempts store a full object?',
      extension: 'How does the bandwidth change if clients also download each object three times on the same day?',
      alternative: 'Measuring bytes on the wire for a day and dividing by 86,400 gives you the average throughput you actually had. It does not by itself give you next month if the payload or the rate will change.',
    },
    evening: {
      title: 'What dominates, and what is left out',
      why: 'Two terms decide whether the estimate is useful: the one that moves the result the most, and the one people drop because it is not in the request path. Leaving either one implicit is how a 346 GB plan becomes a full disk.',
      explain: `The dominating term is the one a small relative change multiplies into the biggest absolute change. Here the payload is 20,000 bytes. Request-line overhead of a few hundred bytes is a few percent of that. Halving the request rate halves the storage. Cutting the payload by 100 times, down to a 200-byte record, cuts storage by 100 times. The headline rate is not what made the number large. The body is.

The term people usually forget is the number of copies on disk. A logical 345.6 GB per day with a replication factor of three is about 1,037 GB per day of actual disks, before indexes. The request path never shows that multiple. It shows one write acknowledgement. The bill shows three.`,
      question:
        'Using 200 writes per second average, an 800 write peak, and a 20,000 byte object, name the term that dominates the 345.6 GB per day figure, and the term people usually forget. Show both with arithmetic.',
      hints: [
        'Compare a 200 byte record against a 20,000 byte object at the same request rate.',
        'Multiply the logical daily bytes by the replication factor. That product is not in the client request.',
      ],
      outline: [
        'The 20,000 byte body dominates. A 200 byte record would be about 3.5 GB per day, not 345.6.',
        'Halving the 200 writes per second would only halve 345.6. The body moves the result further.',
        'The forgotten term is replication. Three copies are about 1,037 GB per day on disk.',
        'The peak of 800 sizes the pipe. It is not a substitute for the replication multiple.',
      ],
      solution: `The payload dominates. At 200 writes per second, 20,000 bytes is 345.6 GB per day of logical storage. The same rate with a 200 byte record is 100 times smaller, about 3.46 GB per day. Halving the rate, from 200 to 100, only moves 345.6 GB to 172.8 GB. A review that argues about the request rate and never opens the object size is arguing about the smaller lever. Headers of a few hundred bytes are in the noise next to 20,000.

The forgotten term is replication. Three copies turn 345.6 GB into 345.6 * 3, about 1,037 GB per day, and that is before secondary indexes. People quote the logical number because the API stored the object once from the caller's point of view. The disks stored it three times. Peak bandwidth stays 16 MB/s either way. Replication does not change the single-stream ingest math. It changes the disks you have to buy every day.`,
      rubric: [
        'The body is shown as the dominating term by comparing 20,000 bytes with a much smaller record at the same rate.',
        'Replication is the forgotten multiple, and three copies are computed as about 1,037 GB per day.',
      ],
      myth: [
        'The request rate is always the term that dominates a capacity estimate.',
        'The rate and the payload multiply. When the payload is 20,000 bytes, changing it moves daily bytes far more than a small change in the rate.',
      ],
      context:
        'Indexes are the cousin of this mistake. The write path stores a row. The storage path also stores every secondary index, often another large fraction of the row, on every replica.',
      tradeoff: 'Quoting the logical copy keeps the arithmetic short and understates the bill by the replication factor. Quoting only the on-disk total hides which factor a reader can still change.',
      mistake: 'Dropping the replication factor because the client received one acknowledgement and therefore "the data was stored once."',
      followUp: 'What is the on-disk total if each replica also keeps secondary indexes equal to half the object size?',
      extension: 'If compression cuts the stored object to 5,000 bytes but the wire payload stays 20,000, which number moves, bandwidth or daily disk?',
      alternative: 'Estimating from a disk graph after a week of production includes replicas and indexes automatically. It cannot be done before the feature exists, which is when this multiplication is for.',
    },
  },
  'vertical-horizontal': {
    morning: {
      title: 'One bigger machine, or a second one',
      why: 'A bigger machine and a second machine both get described as scaling. They buy different things, and only one of them demands a change in the software before the extra capacity exists.',
      explain: `A bigger machine gives the same process more CPU, more memory, and usually more disk and network throughput. The address space stays one. The local cache stays warm. You do not add a balancer or a second failure domain. If the work can use the extra cores, capacity goes up without a rewrite, until you hit the largest machine you can rent or a lock that uses only one core.

A second machine gives you another process. Capacity goes up only if a request can land on either process and still be correct. That means the software must already tolerate two copies: no required state that lives only in one heap, no local file the next request must find, no assumption that one lock in one process covers the whole service. You also need a way to spread traffic. What you gain is that one dead machine is no longer the whole outage.`,
      question:
        'One 8-vCPU machine serves 400 requests per second at 70% CPU. Option A is a 32-vCPU machine. Option B is four 8-vCPU machines. What does A buy without a code change, and what must the software already allow before B adds capacity?',
      hints: [
        'A keeps a single process and a single local cache. Start from what that preserves.',
        'B helps only if any machine can serve any request. Name the state that would make that false.',
      ],
      outline: [
        'A buys more cores and memory in the same process, with no balancer and no split cache.',
        'A does not require a code change if the work can use extra cores.',
        'B requires that any instance can serve any request correctly.',
        'B also requires something to spread traffic, and it survives the loss of one machine.',
      ],
      solution: `Option A buys more CPU and memory for the process you already run. There is no code change if the handler can use extra cores, no new balancer, and the cache on that machine stays one cache. At a rough four times the cores you might approach 1,600 requests per second, until a single-threaded lock or another service stops the gain. The failure story does not improve. One kernel panic still takes the whole service with it.

Option B adds capacity only if any of the four machines can answer any request. Sessions, files, and rate-limit counts that exist only in one process must already be gone, or B just gives you four partial copies of the service. You need a balancer. In return, losing one machine drops about a quarter of capacity rather than all of it, and each machine's local cache is colder because the hits are split. The software requirement is the difference. A does not have it. B does not work without it.`,
      rubric: [
        'The bigger machine is described as more resources in one process, available without a distributed-state change.',
        'The second machine is described as requiring any instance to serve any request, plus a way to spread traffic.',
      ],
      myth: [
        'Vertical and horizontal scaling are two prices for the same capacity.',
        'A bigger machine keeps one process and one failure domain. A second machine requires the software to be correct when a request moves, and it is the option that survives a single machine dying.',
      ],
      context:
        'Cloud instance menus make A look like a config change and B look like a replica count. The replica count is a software feature you either already have or you do not.',
      tradeoff: 'A is fast to try and ends at the biggest box, with a full outage when that box dies. B isolates failure and forces every sticky assumption into the open before you get the capacity.',
      mistake: 'Adding three machines while sessions still live in one process, then calling the idle machines spare capacity.',
      followUp: 'What does a single global lock inside the process do to the gain from the 32-vCPU machine?',
      extension: 'If the database, not the app CPU, is already full at 400 requests per second, which option fails to move the latency?',
      alternative: 'Splitting the workload by endpoint, so one machine owns uploads and another owns reads, is a form of B that does not require every machine to serve every route. A sticky upload still cannot move.',
    },
    evening: {
      title: 'The bottleneck that does not move',
      why: 'Horizontal scaling is easy to approve because the replica count is a number in a config file. It does not move a limit that lives outside the fleet you just grew.',
      explain: `App instances are one resource. The thing they all call is another. If every write goes to one database primary, four app machines give that primary four times as many clients and the same write throughput. CPU on the app tier falls. Latency stays where the primary put it. The bottleneck did not move because it was never in the process you replicated.

The same shape shows up in a vendor quota, a single license server, or one row lock every checkout updates. Adding processes does not add those. A bigger app machine does not add them either. The work is to name the resource whose utilization is high while the scaled tier is idle, and to stop counting idle cores as capacity.`,
      question:
        'The team replaced one app machine with four. App CPU fell from 70% to about 20%. Median latency barely changed. The database primary sits at 95% CPU and the write p99 is most of the user-visible time. What bottleneck did horizontal scaling fail to move?',
      hints: [
        'Look at which CPU fell and which CPU stayed high. The idle tier is the one you scaled.',
        'Every app machine still sends writes to the same primary. That fan-in is the limit.',
      ],
      outline: [
        'App CPU dropped because the same work is spread across four processes.',
        'The database primary is still one writer, and it is at 95% CPU.',
        'User latency is the write on that primary, so more app machines do not shorten it.',
        'The unmoved bottleneck is the primary write path, not the app tier.',
      ],
      solution: `The bottleneck is the database primary's write path. All four app machines send writes to that one server. Its CPU is at 95%, and the slow part of the user request is the write. The app tier is idle because you gave it more cores than the primary can keep busy. Horizontal scaling moved app CPU. It did not move the primary.

A bigger app machine would have failed in the same place. The next unit of capacity has to be on the saturated side: fewer writes per request, a schema that writes less, or a real plan for write throughput. Read replicas do not take these writes. Adding an eighth app machine would add clients to a full primary and can make the p99 worse. The graph that should have stopped the change is the primary CPU, read beside the app CPU, before the replica count went up.`,
      rubric: [
        'The unmoved bottleneck is named as the single database primary, or its write throughput, with the 95% CPU as evidence.',
        'The drop in app CPU is treated as proof the scaled tier was not the limit, not as proof the scaling worked.',
      ],
      myth: [
        'If you add machines and CPU falls, the service has more headroom for user traffic.',
        'CPU fell on the tier you replicated. The primary stayed full, and user latency follows the full tier. Idle app CPU is unused waiting, not spare capacity.',
      ],
      context:
        'A vendor API with a contract limit of 50 requests per second behaves the same way. The app fleet can grow forever. The quota does not. The primary is the in-house version of that quota.',
      tradeoff: 'Scaling the app tier is a small config change and it reduces app-level queueing when the app was actually full. Doing it while the primary is full spends money and adds connection pressure to the real limit.',
      mistake: 'Declaring the horizontal move a success because app CPU dropped, without checking the latency or the primary.',
      followUp: 'What would a read replica change here, and which part of the request would stay slow?',
      extension: 'Name a second bottleneck, outside the database, that also stays put when you add app machines.',
      alternative: 'Partitioning writes across several primaries can move this bottleneck, and it brings a new routing key and a new class of cross-partition transactions. That is a data design, not a replica count.',
    },
  },
  'stateless-services': {
    morning: {
      title: 'State that has to leave the process',
      why: 'You can start a second instance only if a user's next request is allowed to hit it. State that exists only in the first process makes the second instance a bystander.',
      explain: `The state that must leave is any fact the next request needs and cannot rebuild from a shared store. A session record in a process-local map. A file under a local directory that a later request will fetch. A dedupe key that exists only in this heap, if losing it means the operation runs twice. Kill the process in your head. If the user who lands elsewhere is now logged out, or gets a 404 for a file you just accepted, that state was not allowed to live only here.

A cache of derived data can stay. If a miss only costs a fetch from the system of record, the second instance is fine. The test is not "does this process remember anything?" Processes remember lots of harmless things. The test is whether this process is the only copy of something the product promised to keep.`,
      question:
        'A service keeps logged-in users in a heap map from session id to user, and it writes invoice PDFs under a local /var/invoices path that the download handler reads. What has to leave the process before a second instance can serve those users, and what is allowed to stay?',
      hints: [
        'Apply the kill test. The user is sent to the other instance on the next click.',
        'A cache that can be refilled from the database is a different object from the only copy of the PDF.',
      ],
      outline: [
        'The session map has to move to a store both instances read, or be replaced by a token both can check.',
        'The invoice file has to move to shared storage. The other instance cannot see this disk.',
        'A derived cache may stay in the process if a miss refetches from the system of record.',
        'Until those two move, the second instance cannot serve the users who hit the first.',
      ],
      solution: `The session map and the invoice files have to leave. They are the only copies of facts the next request needs. Put the session in a store both instances read, or stop keeping server-side session state and use a signed token any instance can check. Put the PDF in object storage, or in a database, and store the key in the shared metadata. After that, either instance can log the user in and can fetch the file. Killing one process logs nobody out and 404s no completed invoice.

An in-process cache of the user profile may stay, if the database still holds the profile and a miss is only a query. That cache is an optimization. The session map is not a cache if there is no other copy. The PDF is not a cache if /var/invoices is the only place it was written. The word "cache" does not decide this. The existence of another copy does.`,
      rubric: [
        'Both the in-memory session and the local invoice file are named as state that must move to a shared store.',
        'A rebuildable cache is distinguished from those two, and is allowed to remain in the process.',
      ],
      myth: [
        'Stateless means the process is forbidden to hold any data in memory.',
        'It means the process must not be the only copy of state the next request needs. A cache with a durable source can stay. A lone session map cannot.',
      ],
      context:
        'This is the software requirement from adding a second machine. The replica count is trivial after this move, and meaningless before it.',
      tradeoff: 'A shared session store adds a dependency that can log every user out when it fails. Process-local sessions avoid that dependency and make a second instance useless for users who landed elsewhere.',
      mistake: 'Calling the service stateless because the code has no class field named state, while the session map and the invoice directory are still local.',
      followUp: 'A restart of the only instance, with no second instance planned, still drops every session. What does that say about where the session should live?',
      extension: 'If the PDF can be regenerated from the invoice row at any time, does the file still have to leave the local disk?',
      alternative: 'Pinning each user to the instance that holds the session avoids a session store and turns every deploy of that instance into a logout, or into a drain you cannot finish.',
    },
    evening: {
      title: 'The assumption that keeps users stuck',
      why: 'Sticky routing hides a local session until the pinned instance dies or you try to drain it. The assumption is easy to miss because ordinary traffic still works.',
      explain: `A sticky balancer sends a user back to the instance that first saw them, often with a cookie. Traffic looks balanced enough. Logins work. The local session map never has to be correct on any other instance, so nobody notices it is the only copy. The assumption is that this user will keep arriving here. Deploys, crashes, and scale-in all break that assumption on purpose.

Look for the pin and then look for why it was added. A local file path in the download handler is the same shape, even with no cookie: the URL only works on the disk that wrote it. Either one blocks the move to more than one instance. The pin is not a design. It is a workaround with a blast radius of one machine per user.`,
      question:
        'The balancer sets a cookie that pins each user to one app instance. Sessions live in a heap map. Invoice downloads read /var/invoices on that same instance. Which assumption blocks adding instances, and what fails when that instance is drained?',
      hints: [
        'Follow the cookie. It exists so the next request can find state that was never shared.',
        'A drain sends the user somewhere the map and the disk do not have their data.',
      ],
      outline: [
        'The sticky cookie exists because the session and the file are only on one instance.',
        'New instances do not serve pinned users, so they do not add capacity for live traffic.',
        'Draining the instance drops the session and loses the local PDF for its users.',
        'The blocking assumption is that a user will always return to the process that first handled them.',
      ],
      solution: `The blocking assumption is that a user always returns to the process that created the session and the file. The cookie enforces it. Adding instances does not add capacity for those users. Their requests never arrive anywhere else, so the new processes sit idle while one instance holds the hot accounts. The heap map and /var/invoices are why the cookie was introduced. The cookie is the symptom. The local state is the block.

Drain that instance and the assumption runs out. The balancer finally sends the user to another process. The session map there has no entry, so the user is logged out. The PDF is not on the new disk, so the download 404s even though the upload returned success. A rolling restart does this to every user in turn. The move that unblocks it is the shared session and the shared file. After that the cookie is unnecessary. Leaving the cookie in place after the move is harmless only if you can tolerate a warm cache. It is not a substitute for the move.`,
      rubric: [
        'The sticky cookie is tied to the in-memory session or the local file, and named as the assumption that a user returns to one process.',
        'A drain is described as a logout or a missing file, because the next instance does not have that state.',
      ],
      myth: [
        'Sticky sessions are a load-balancing feature and do not say anything about where state lives.',
        'The pin is how local state survives contact with more than one machine. It is evidence the state never left the process.',
      ],
      context:
        'Connection draining is when this becomes an incident instead of a theory. The drain completes in the load balancer and fails in the session map.',
      tradeoff: 'Sticky routing makes a local session look workable and concentrates one user's load, and their outage, on one machine. Shared state removes the pin and adds a store you now operate.',
      mistake: 'Adding instances behind the sticky cookie and reporting the new replica count as usable capacity.',
      followUp: 'After sessions move to a shared store, what user-visible bug remains if the PDF path is still local?',
      extension: 'How would you detect this assumption from metrics, before a drain, using the share of requests per instance for a single user?',
      alternative: 'Replicating the session map between instances on every write removes the pin and creates a new consistency window. A shared store you already know how to operate is the smaller design.',
    },
  },
  'scale-balancing': {
    morning: {
      title: 'The balancer as the limit',
      why: 'Every request crosses the balancer before it reaches the fleet you scaled. If that hop is one machine, the fleet's spare CPU does not matter to a user who cannot get past it.',
      explain: `A balancer accepts connections, often terminates TLS, and picks an instance. That is real CPU, real connection tracking, and one network interface. A single VM doing this job has a ceiling, and it has one failure domain. When the ceiling hits, the app tier can be at 30% CPU while users time out. When the VM reboots, every healthy app instance is unreachable. The balancer is then both the bottleneck and the single point of failure.

A second balancer removes the single point only if traffic can reach either one without a third thing that is still unique. Two proxies behind one IP that only one of them owns are still one failure. Two proxies with a virtual address that can move, or a managed load balancer that is not a VM you reboot, is the usual shape. Health checks belong on the instances behind them. They do not help if the only path to those instances is down.`,
      question:
        'One VM terminates TLS and balances traffic to twelve app instances. At 40,000 concurrent connections that VM is out of CPU and the apps are near 30%. A reboot of the VM takes the site down. Why is the balancer both the bottleneck and the single point of failure, and what changes that?',
      hints: [
        'Separate the app CPU from the CPU that terminates TLS and tracks connections.',
        'Two balancers are still one failure if only one address can receive traffic.',
      ],
      outline: [
        'The VM's TLS and connection tracking are full while the app tier is idle.',
        'That VM is the bottleneck. More app instances do not give users a path around it.',
        'A reboot removes the only path, so the same VM is the single point of failure.',
        'A second balancer has to be reachable on its own, with an address that can move.',
      ],
      solution: `The bottleneck is the balancer VM, not the twelve apps. TLS and the connection table live on that one machine. At 40,000 connections its CPU is gone, so new handshakes wait or fail. App CPU at 30% is unused capacity behind a full door. Adding a thirteenth app instance does not create a second door. Users never reach it.

The same VM is the single point of failure because it is the only path. A reboot, a bad deploy of its config, or a dead network interface makes twelve healthy apps invisible. What changes it is a second balancer that clients can actually reach when the first is gone: a virtual address that moves, DNS with a short TTL aimed at both, or a managed load balancer that is not one VM. Two VMs that still share one unmovable IP, or one config host that both need in order to start, keep the single point and only add a machine. Health checks on the apps do not route around a dead front door.`,
      rubric: [
        'The balancer VM is identified as the CPU bottleneck and as the only path, with app CPU cited as evidence it is not the limit.',
        'The fix is a second reachable balancer, and a pair that still shares one address is rejected.',
      ],
      myth: [
        'The load balancer is infrastructure, so it cannot be the capacity limit of the product.',
        'It terminates TLS and holds every connection. That is capacity, and a single VM doing it is also a single point of failure.',
      ],
      context:
        'Managed load balancers hide this machine and still have a quota on new connections per second. The quota is the same bottleneck, with a different owner.',
      tradeoff: 'One balancer is simple to debug and takes the site with it when it fails. Two balancers cost more and fail over only if you have actually moved traffic during a drill.',
      mistake: 'Scaling the app tier from twelve instances to twenty while the balancer CPU is the graph that is full.',
      followUp: 'What still fails over as one unit if both balancers pull config from a single host at startup?',
      extension: 'Which metric on the balancer, rather than on the app, would show this bottleneck first?',
      alternative: 'Terminating TLS at the app removes the balancer CPU cost and makes every instance carry certificates. You still want more than one path in front, or the network path itself is the single point.',
    },
    evening: {
      title: 'Drain that survives a rolling restart',
      why: 'A rolling restart is a controlled outage of one instance at a time. It drops live requests if the balancer keeps sending work after the process has started to exit.',
      explain: `Health and drain are the behavior that makes the restart survivable. Readiness fails as soon as the process decides to leave, so the balancer stops sending new requests. Liveness stays up during that drain. Liveness exists to kill a wedged process, not to steer traffic. In-flight requests get a grace period longer than the slow request you still intend to finish. The balancer's deregistration delay has to cover the time it takes to notice the failed readiness, plus that grace.

One instance at a time is part of the same behavior. Removing two before the replacement is ready drops your capacity on purpose. The new instance has to pass readiness, including a real dependency check, before the next drain starts. A restart that skips any of these steps looks green in the deploy tool and 502s in the client.`,
      question:
        'You roll eight app instances, one at a time. Choose the health and drain behavior so a restart does not cut off in-flight checkouts. Include when readiness fails, what liveness does, and how long traffic may still arrive.',
      hints: [
        'Readiness is how the balancer learns to stop. Liveness is not that signal.',
        'The process has to keep running until the balancer has observed the failed readiness and in-flight work has finished.',
      ],
      outline: [
        'On shutdown, readiness fails immediately and liveness stays successful.',
        'The balancer stops new requests only after it observes that failed check.',
        'The process keeps serving in-flight work for a grace period of about 25 seconds.',
        'Only one instance drains, and the replacement must be ready before the next drain.',
      ],
      solution: `Fail readiness at the start of shutdown, and do not fail liveness just because you are draining. The balancer polls readiness every 5 seconds and removes the instance after two failures, so detection can take about 10 seconds. Keep the process alive for that detection plus in-flight work: a termination grace of 25 seconds, and a balancer deregistration delay of the same 25 seconds. New checkouts stop. A checkout that already started gets to finish. Then the process exits.

Roll one instance. Wait until the replacement passes readiness, with a check that actually touches the dependency the handler needs, before you drain the next. If you send SIGTERM and exit in two seconds, the balancer is still sending traffic and those requests fail. If you use liveness as the drain signal, a slow ready check gets the process killed instead of removed. If you drain two at once, you chose the capacity loss the rolling restart was supposed to avoid. The behavior that survives is: ready fails closed, live stays up, grace covers detection and in-flight work, and the fleet never loses a second instance early.`,
      rubric: [
        'Readiness fails at shutdown while liveness does not, and a grace period covers both detection and in-flight requests.',
        'The rollout drains one instance and waits for a ready replacement before the next.',
      ],
      myth: [
        'A rolling restart is safe because the deploy tool never stops the whole fleet at once.',
        'The tool's sequence is safe only if the balancer stops sending new work and the process finishes old work. Without that drain, each "one at a time" still cuts requests off.',
      ],
      context:
        'This is the same drain as a proxy that times out a handler still running. The caller gave up, or was never told to stop calling, and the work is still in flight.',
      tradeoff: 'A 25 second grace slows the deploy and finishes checkouts. A 2 second grace ships faster and fails every request that was on the instance you just exited.',
      mistake: 'Pointing the balancer health check at a liveness route that returns success until the process is already gone.',
      followUp: 'A checkout takes 40 seconds on a slow card network. What does a 25 second grace do to that request during the restart?',
      extension: 'What should the readiness check query, if the handler cannot succeed while the database is unreachable?',
      alternative: 'Connection draining at the balancer, with the instance left running until the active-connection count hits zero, is the same design. A hard stop on a timer is the version that fails the slow request.',
    },
  },
  'autoscaling-lag': {
    morning: {
      title: 'The delay before a new instance serves',
      why: 'Autoscaling reacts to a signal that is already old, then spends more time booting. The capacity you needed during the rise is not the capacity that arrives after the boot.',
      explain: `The chain is load, then a metric, then a decision, then a machine that can pass readiness. None of those steps is instant. A scrape every 15 seconds means the first sample can be 15 seconds late. A policy that wants three high samples adds another 45 seconds. The cloud API and a cooldown add more. Image pull and boot are often the long piece, here 90 seconds. The process then warms and passes readiness, here another 30 seconds. Add the path you actually configured. Do not quote the boot time alone as the lag.

On this policy the slow path is 15 + 45 + 30 + 90 + 30, which is 210 seconds, about three and a half minutes. A lucky scrape shortens the start. It does not remove the boot. Until readiness passes, the instance is not capacity. A graph of "instance count" that ticks up at the API call is early by the boot and the warm-up.`,
      question:
        'Your policy scrapes every 15 seconds, waits for three high samples, spends 30 seconds on the scale API and cooldown, 90 seconds on boot and image pull, and 30 seconds on warm-up before readiness. How long after the load rises can a new instance serve, and which step is not the whole delay?',
      hints: [
        'Add every step. The instance does not serve at the moment the API accepts the scale-up.',
        'Boot is the long step and still is not the full chain from the load to a ready process.',
      ],
      outline: [
        'The metric can be 15 seconds late, and three samples add about 45 seconds.',
        'API and cooldown add 30 seconds. Boot and image pull add 90. Warm-up adds 30.',
        'The sum is about 210 seconds before the new instance serves traffic.',
        'Boot alone understates the lag. So does the instance-count metric at request time.',
      ],
      solution: `Add the chain. The scrape can lag the load by 15 seconds. Three high samples take another 45 seconds. The API call and cooldown take 30 seconds. Pulling the image and booting takes 90 seconds. Warm-up and readiness take 30 seconds. The total is 210 seconds, three and a half minutes, on the slow path. A new instance serves after that, not when someone sees CPU cross the threshold.

Boot is the largest single step and it is not the delay. Quoting 90 seconds ignores the metric, the policy window, and the warm-up. The instance count in the cloud console moves at the API call, around a minute and a half in, and still cannot serve. Ready means the process is in the balancer and passing checks. Before that the scale-up is a bill, not capacity. Plan spare instances or a queue for anything faster than this chain. The policy will not arrive inside a minute.`,
      rubric: [
        'The delay is the sum of scrape, samples, API, boot, and warm-up, about 210 seconds, not the boot time alone.',
        'The instance is treated as capacity only after readiness, not when the scale API returns.',
      ],
      myth: [
        'Autoscaling lag is the time it takes a virtual machine to boot.',
        'Boot is one step. The metric interval, the policy window, the API, and warm-up sit on either side of it. The user waits on the sum.',
      ],
      context:
        'A readiness check that loads caches is part of this lag on purpose. An instance that joins the balancer before it is warm looks like capacity and adds latency.',
      tradeoff: 'Requiring three samples avoids scaling on a one-minute blip and adds 45 seconds to a real rise. Scaling on the first sample is faster and spends money on noise.',
      mistake: 'Setting the scale-up alarm for the current minute of traffic when the new instance cannot serve for about three minutes.',
      followUp: 'Which step shrinks if the image is already cached on the host, and which steps remain?',
      extension: 'What does a scale-in cooldown need to cover so you do not terminate the instance you just spent 210 seconds preparing?',
      alternative: 'A queue in front of a fixed fleet absorbs the burst without waiting for boot. You trade the lag for queue time and a limit on how large a backlog you will accept.',
    },
    evening: {
      title: 'A spike that ends before boot does',
      why: 'Short spikes are the traffic autoscaling cannot catch. The new instances arrive in a quiet period, and the requests that failed did so on the capacity you already had.',
      explain: `Put the spike and the ready time on one clock. Load jumps at t = 0 and is back to normal at t = 50 seconds. The instance you asked for becomes ready around t = 210 seconds. From t = 50 to t = 210 you are launching capacity for a load that has left. From t = 0 to t = 50 you had only the old fleet. That is the whole story. The scaler did what it was configured to do. The configuration cannot see the future, and it cannot boot faster than the chain.

What absorbs a 50 second spike is capacity that was already serving, or a queue that can hold the work, or a load shed that fails cheap requests on purpose. A scale-out is the wrong tool for a burst shorter than the lag. You will still want it for a rise that stays up for tens of minutes. The burst that ends first is the one the new instances never see.`,
      question:
        'Traffic jumps to five times normal at t = 0 and is back to normal at t = 50 seconds. New instances become ready at t = 210 seconds using the policy you already added up. What do those instances serve, and what had to absorb the spike instead?',
      hints: [
        'Compare 50 seconds of extra load with 210 seconds until ready.',
        'The requests dropped in the first minute were handled, or not, by the fleet that was already up.',
      ],
      outline: [
        'The spike is over at 50 seconds. Ready instances arrive at 210 seconds.',
        'The new instances serve the baseline that followed the spike, not the five-times load.',
        'During the spike the only capacity was the previous fleet.',
        'A queue, spare instances already running, or a deliberate shed had to cover those 50 seconds.',
      ],
      solution: `The new instances miss the spike. It lasts 50 seconds. They serve at 210 seconds. They join a fleet that is once again on normal traffic, so they sit idle or they absorb ordinary load you were already serving. They do not reduce the errors from t = 0 to t = 50. Those requests saw the old capacity only. If that capacity could not take five times the load, the requests failed or queued on machines that were already there.

Autoscaling still did its job on its own clock. It is the wrong tool for this shape. Cover a 50 second, five-times spike with instances that are already in the balancer, with a queue that can hold a minute of work, or with a shed that rejects work you can retry. Use the scaler for a step that stays high longer than about three and a half minutes. After this spike you should also scale back in, or you will pay for the instances that arrived as spectators. Leaving them up "in case" is spare capacity, which is a fair choice only if you meant to buy it before the spike, not because a late boot felt like a response.`,
      rubric: [
        'The spike is shown ending at 50 seconds, before instances ready at 210 seconds can take any of it.',
        'The absorber named is spare capacity already running, a queue, or a shed, not the late scale-out.',
      ],
      myth: [
        'If autoscaling is on, a traffic spike will be met by new instances in time.',
        'Only if the spike lasts longer than the path from metric to readiness. A 50 second spike is over before a 210 second chain serves anything.',
      ],
      context:
        'A cron that fires every hour, or a flash sale that lasts a minute, has this shape. The scaler graph looks active. The error graph is the minute before the new instances existed.',
      tradeoff: 'Keeping spare instances hot catches the 50 second spike and costs money every quiet hour. Scaling purely on demand is cheaper and misses every burst shorter than the lag.',
      mistake: 'Raising the max instance count after a short spike, then treating that setting as proof the next spike will be covered.',
      followUp: 'How long does a step-up in traffic have to last before these new instances serve any of the extra load?',
      extension: 'What should the scale-in rule do with instances that became ready after the load had already returned to baseline?',
      alternative: 'Predictive scaling from yesterday's clock can pre-warm a known daily peak. It does nothing for a spike that is not on that clock, and it still needs a lag budget if the prediction is late.',
    },
  },
  'storage-growth': {
    morning: {
      title: 'Writes, retention, and copies',
      why: 'A growth number that ignores retention climbs forever on paper, and a number that ignores copies understates the disks. The projection is the product of all three, or it is not a projection.',
      explain: `Daily logical growth is rows per day times bytes per row, including the secondary indexes you actually build. The plateau, if you have one, is that daily growth times the number of days you keep a row. The disks you buy are the plateau times the replication factor. Leave any of those out and the sentence "we will use about 810 GB" is a different design from the one you will run.

A delete that is only a hope does not belong in the multiplication. If the rows stay, the plateau is fake and the honest projection is a line: daily growth times copies, every day, with no ceiling. Say which one you are drawing. A tier, such as moving old rows to cheaper storage, is a second plateau with a second price, not a delete.`,
      question:
        'You insert 1,000,000 rows per day. Each row is 1,000 bytes, and secondary indexes add 500 bytes per row. You keep rows for 180 days and store three copies. What is the steady disk usage, and what must be true for it to stay steady?',
      hints: [
        'Add the index bytes to the row before you multiply by days and copies.',
        'The total stops growing only if rows older than 180 days actually go away.',
      ],
      outline: [
        'Data plus indexes is 1,500 bytes per row, times 1,000,000 rows, which is 1.5 GB per day logical.',
        'Over 180 days that is 270 GB logical.',
        'Three copies make 810 GB on disk at the plateau.',
        'The plateau is real only if a delete keeps the retained window at 180 days.',
      ],
      solution: `Each day adds 1,000,000 * 1,500 bytes, row plus index, which is 1.5 billion bytes, or 1.5 GB using a gigabyte of 10^9. Over a 180 day retain window that is 1.5 * 180, which is 270 GB logical. Three copies make 270 * 3, which is 810 GB on disk. That is the steady usage. It is a stock, not a daily increment. After the window is full, a day of inserts adds 1.5 GB logical and a day of deletes removes 1.5 GB logical, if the deletes keep up.

The steady claim is true only if rows older than 180 days are removed and stay removed. If the delete never runs, there is no 810 GB ceiling. A year is 1.5 * 365 * 3, about 1,640 GB, and the year after that adds the same again. The arithmetic of the plateau is fine. The assumption that retention happens is the part that has to be an operated job, not a sentence in the design. Indexes are already inside the 1,500 bytes. Leaving them out would have reported 540 GB and been short by half the row.`,
      rubric: [
        'Disk usage is rows per day times 1,500 bytes times 180 days times 3 copies, equal to 810 GB.',
        'The figure is steady only while a delete holds retention at 180 days, and unbounded growth is stated for the case where it does not.',
      ],
      myth: [
        'Storage growth is rows per day times row size, and the rest is an operational detail.',
        'Retention and replication change the total by orders that dwarf small fights about the row size. A projection that omits them is a different system.',
      ],
      context:
        'Object storage bills the same way. The request rate puts bytes in. The lifecycle rule is the only reason the bucket has a size instead of a slope.',
      tradeoff: 'A 180 day window makes the product useful for debugging and makes you store 180 days. A 7 day window is cheaper and deletes the evidence you will want during a slow incident.',
      mistake: 'Reporting 1.5 GB per day as the capacity plan and never multiplying by retention and copies.',
      followUp: 'What is the disk total if a second index adds another 500 bytes per row and retention stays 180 days?',
      extension: 'How do you account for a tier that moves rows older than 30 days to cheaper storage but does not delete them for 180 days?',
      alternative: 'Sampling a week's growth from production and multiplying by replication is a fair projection for a table that already exists. It still needs a retention term or it assumes the past week was a plateau when it was only a slope.',
    },
    evening: {
      title: 'The rule that keeps the plateau honest',
      why: 'The 810 GB figure is a story about deletion. Without a rule you run, the story is a line that keeps climbing, and the capacity review approved the wrong shape.',
      explain: `Name the rule in the same place as the projection. For this table it is a daily job that deletes rows whose created_at is older than 180 days, in batches small enough not to lock the hot partition, plus an alert when the oldest row is older than 187 days. The alert is part of the rule. A job that fails quietly turns the plateau back into a slope a week before anyone sees the disk.

Tiering is a different rule, and it only keeps the projection honest if you count the tier. Moving rows older than 30 days to object storage means the primary plateau is 30 days, not 180, and the object store grows until its own delete. "We tier it" without a delete is how the cheap bucket becomes the unbounded one. The projection has to say which system holds the byte.`,
      question:
        'The design claims a steady 810 GB because rows are kept 180 days. Name the deletion or tiering rule that makes that claim true, and the signal that tells you the claim has become false.',
      hints: [
        'A sentence in a design doc is not a delete. Name the job, the age, and the cadence.',
        'Compare the oldest row's age with 180 days. A gap of a week means the plateau is already a lie.',
      ],
      outline: [
        'A daily job deletes rows with created_at older than 180 days.',
        'Deletes run in batches so the job itself does not become the outage.',
        'An alert fires when the oldest row is older than 187 days.',
        'That alert means the 810 GB steady total is no longer the projection.',
      ],
      solution: `The rule is a daily delete of rows older than 180 days, batched so each transaction stays small, with an alert when the oldest created_at is more than 187 days ago. The seven extra days are grace for a missed run, not a new retention policy. When the alert fires, stop quoting 810 GB. The table is growing by about 4.5 GB of disk per day, three copies of 1.5 GB, until the delete catches up. The projection is honest only while that job succeeds.

A tier can replace the delete on the primary and still fail the claim. If you move rows older than 30 days to object storage and keep them there for 180 days, the primary is steady near 30 days of data, about 135 GB with three copies, and the bucket holds the rest. The 810 GB number is then the wrong system's budget. If the bucket has no expiry, you did not bound storage. You moved the slope. Write the expiry on the bucket in the same sentence as the move, or the review has approved unbounded growth under a calmer name.`,
      rubric: [
        'The rule is a scheduled delete of rows older than 180 days, not a hope that someone will clean up.',
        'A concrete signal, such as the oldest row passing 187 days, is what invalidates the steady 810 GB claim.',
      ],
      myth: [
        'Retention is a policy statement, so the storage projection can assume it already happens.',
        'Retention is a job with a failure mode. Until it runs and until you alert when it does not, the steady total is a wish.',
      ],
      context:
        'Disk-full incidents are often this job, stopped by a permissions change or a lock timeout, while the dashboard still shows last quarter's "steady" estimate.',
      tradeoff: 'Batching the delete keeps the primary responsive and lets a failed batch slip past 180 days. One giant delete is closer to the policy and can stall the writes the table exists for.',
      mistake: 'Setting a lifecycle comment on the table and never checking the age of the oldest row.',
      followUp: 'The delete job is three days behind. What number should replace 810 GB in the capacity note until it catches up?',
      extension: 'What new cost shows up if the tier to object storage succeeds and the bucket itself has no expiry?',
      alternative: 'Partitioning the table by day and dropping a partition older than 180 days is the same rule with a cheaper delete. It fails if the partition key is not the retention clock you think it is.',
    },
  },
  'scale-hotspots': {
    morning: {
      title: 'The key that stays hot',
      why: 'A fleet scales the average request. A single key, row, or lock can take a large share of the work and stay on one core no matter how many machines you add around it.',
      explain: `A hotspot is a name that attracts disproportionate traffic and cannot be split by the scaling you already did. The usual names are a primary key, a queue partition, a lock, or a cache key. The catalog can be idle while one sku row is updated by every checkout. The app tier's CPU looks fine. Throughput for that sku is whatever one row lock can do.

Find it by looking at concentration, not at the average. Top keys by writes per second. Lock wait on one relation. One partition's disk. If the busiest key is a large fraction of the traffic, the rest of the sharding scheme is decorative for that traffic. The fix is a different split. The first step is to point at the key.`,
      question:
        'During a sale, checkouts for sku 42 all run UPDATE inventory SET units = units - 1 WHERE sku = 42. The app tier is under 20% CPU. Other skus are quiet. Why does this not scale with the rest of the system, and what is the hot resource?',
      hints: [
        'Every buyer contends for the same row lock. More app processes add waiters, not locks.',
        'Compare that one sku's write rate with the idle rest of the catalog.',
      ],
      outline: [
        'All sale checkouts serialize on the single inventory row for sku 42.',
        'That row lock is the hotspot. The app tier and the other skus are not.',
        'Adding app instances adds clients waiting on the same lock.',
        'Throughput for the sale is capped by one row, not by the size of the fleet.',
      ],
      solution: `The hot resource is the inventory row for sku 42, and the lock the update takes on it. Every checkout needs that row. The database will run those updates one at a time, or close to it. The other skus do not share the lock, which is why they are quiet and why "the catalog scales" is the wrong sentence. This sale does not. It scales with one row.

App CPU under 20% is what a lock hotspot looks like from the outside. The processes are waiting on the database, not computing. Adding instances adds more waiters and more connections. It does not add a second lock. A bigger app machine does nothing either. You will see lock wait and a flat checkout rate for sku 42 while the fleet graph says you have headroom. The headroom is real for every sku that is not this row. It is not real for the sale.`,
      rubric: [
        'The hotspot is the single inventory row for sku 42, or the lock on that row, not the app tier.',
        'More app capacity is described as more waiters on that lock, so the sale does not scale with the fleet.',
      ],
      myth: [
        'If the service is sharded, no single key can become the bottleneck.',
        'Sharding spreads keys that were given different shards. A key that everyone writes, or a shard key that collapses them, is still one lock on one place.',
      ],
      context:
        'Cache keys have the same shape. A single popular key that expires stamps the database with a thundering herd. The miss is the hotspot, and the cache fleet does not spread it.',
      tradeoff: 'One counter row is easy to read, "units left" is one number, and it serializes the busiest write in the product. A design that avoids the row makes the read harder.',
      mistake: 'Scaling the app tier because CPU is low, while lock wait on inventory is the time users feel.',
      followUp: 'How would you confirm sku 42 is the hotspot if you cannot sit inside the database, using only checkout latency by sku?',
      extension: 'What changes if the hot resource is a queue partition keyed by sku, rather than a row lock?',
      alternative: 'A queue in front of the single row smooths the burst and does not raise the row's update rate. The sale still completes only as fast as that one lock, and the queue becomes the place users wait.',
    },
    evening: {
      title: 'A split, and the failure it adds',
      why: 'Splitting a hot key cools the lock and creates a new way to be wrong. The split is not done until you can say what the new failure is.',
      explain: `Replace one inventory row with several bucket rows for the same sku, and decrement a bucket that still has stock. Sixteen buckets can turn one lock into sixteen locks, so sixteen checkouts can proceed at once. The sale's write throughput moves. The meaning of "units left" moves too. It is now a sum, and the bucket you happened to pick may be empty while the sum is not.

The new failure is a retry that does not know which bucket the first attempt already decremented. The first request committed on bucket 3 and the response was lost. The retry picks bucket 7 and decrements that too. One purchase removes two units. A single row made that retry easier to make idempotent, because there was only one place the purchase could have landed. The split multiplies the places. The idempotency key has to be the purchase, checked before any bucket changes, or the cooling split oversells.`,
      question:
        'Sku 42 is one hot inventory row. Propose a split that lets more than one checkout proceed, and name the new failure that split adds when a client retries after a lost response.',
      hints: [
        'Several rows for one sku let several locks be held at once. A random bucket is enough to describe.',
        'The retry must not decrement a second bucket for the same purchase. The purchase id is what has to be unique.',
      ],
      outline: [
        'Split sku 42 into bucket rows, for example 16, and decrement one bucket that has stock.',
        'Concurrent checkouts can lock different buckets, so the single-row queue cools.',
        'The new failure is a retry that decrements a different bucket after the first decrement committed.',
        'An idempotency key on the purchase, checked before the decrement, is what stops the double sell.',
      ],
      solution: `Split the one row into 16 bucket rows for sku 42. A checkout picks a bucket at random, or the first bucket whose conditional update matches, and runs UPDATE ... SET units = units - 1 WHERE sku = 42 AND bucket = ? AND units > 0. Two buyers can now hold two locks. Sixteen can proceed at once, minus however often they collide on the same bucket. The hot lock is cooler by about that factor, until the buckets themselves are unbalanced.

The new failure is a double decrement on retry. Bucket 3 was decremented and the client never saw the response. The retry chooses bucket 7, the conditional update succeeds, and the sku loses two units for one purchase. On the single row you could attach the purchase id to that one update. Across buckets the first write is easy to miss if you only look at the bucket you picked the second time. Record the purchase id, in the same transaction as the decrement, and refuse a second decrement when that id already exists. Without that, the split trades a hotspot for oversell. A false sold-out, when the chosen bucket is empty and another is not, is the milder new failure. The retry bug is the one that corrupts stock.`,
      rubric: [
        'The split is multiple bucket rows for sku 42 so checkouts take different locks.',
        'The new failure is a retry decrementing a second bucket, and the purchase id is what makes the split safe.',
      ],
      myth: [
        'Splitting a hot key removes contention and leaves the operation's meaning unchanged.',
        'The meaning of a retry changes, because the first attempt may have committed on a bucket the retry will not look at. Idempotency has to cover the purchase, not the bucket.',
      ],
      context:
        'This is the same lost-response retry as a charge that committed before the status line was written. Two buckets are two places for that commit to hide.',
      tradeoff: 'More buckets cool the lock and make "units left" a scatter of rows that can disagree with what a buyer will successfully decrement. One row stays accurate and stays hot.',
      mistake: 'Putting an idempotency key on the bucket id, so a retry that picks a new bucket looks like a new purchase.',
      followUp: 'A buyer is told sold out because bucket 1 is empty, while bucket 2 still has stock. What should the handler do before it returns that error?',
      extension: 'What new hotspot appears if every client is told to prefer bucket 0 whenever it has stock?',
      alternative: 'A single row with a queue of buyers keeps the count exact and keeps the lock. You cool the user-facing timeout by waiting in the queue, and you do not raise the row's commit rate.',
    },
  },
  'fan-out': {
    morning: {
      title: 'The work one action creates',
      why: 'A user action that looks like one write often creates one write per follower, per file, or per index. The capacity plan has to count that fan-out, or it sized the click and not the work.',
      explain: `Count every unit of work the action enqueues or writes. A post is not one insert if each follower gets a timeline row, the search index gets a document, and a fraction of followers get a push. Those are separate writes and separate calls. They may be asynchronous. They are still caused by the one click, and they still land on a database, a queue, or a push vendor.

Write the count as a small expression, not as "it fans out." Followers times timeline rows, plus the post itself, plus the index, plus pushes. Then put a rate next to it only if you know how often the action happens. The count per action is the part people skip, because the request handler returned before the worker did the rest.`,
      question:
        'One user publishes a post. It is stored once, inserted into the timeline of each of 300 followers, sent to one search index, and pushed to one fifth of those followers. How many units of work does that single publish create? Show the count.',
      hints: [
        'The post row is one. The timeline rows are one per follower. Do not stop at the request the author waited on.',
        'One fifth of 300 is the push count. The index is another single unit, not a per-follower unit.',
      ],
      outline: [
        'One post row, plus 300 timeline inserts, is 301 database writes.',
        'One search-index update is a further unit of work.',
        'Pushes go to 300 / 5 followers, which is 60 calls.',
        'The publish creates 362 units of work, not one request.',
      ],
      solution: `The publish creates 362 units of work. The post itself is 1 database write. Each of 300 followers gets a timeline insert, which is 300 more database writes. The search index takes 1 update. Pushes go to one fifth of the followers, and 300 / 5 is 60 vendor calls. 1 + 300 + 1 + 60 is 362. If the timeline insert is the only thing you counted, you sized about a sixth of the database writes and none of the pushes.

The author's request can return after the post row commits, with the rest on a worker. That changes who waits. It does not change the count. A worker fleet that cannot do 300 inserts per publish will fall behind even while the publish endpoint looks cheap. If 10 such posts arrive in a second, the timeline table sees 3,000 inserts that second, not 10. Put that next to the worker and the table. The endpoint's request rate is the wrong graph.`,
      rubric: [
        'The count includes the post, 300 timeline inserts, one index update, and 60 pushes, totaling 362.',
        'Async work is still counted. Returning early from the request does not remove the fan-out.',
      ],
      myth: [
        'Fan-out is free if the user request returns before the extra writes run.',
        'The user stopped waiting. The writes and the push calls still run, and they are the load the worker and the database have to absorb.',
      ],
      context:
        'Notification pipelines are this count with a different product name. One event in, one send per device out. The publish rate is not the send rate.',
      tradeoff: 'Doing the 300 inserts in the request makes the author's latency honest and ties up a web worker. Doing them later keeps the request short and lets the timeline lag the post the author already sees.',
      mistake: 'Capacity-planning the publish endpoint at "one write per post" and discovering the timeline table later.',
      followUp: 'If 20 of these posts are published in one second, what insert rate hits the timeline table?',
      extension: 'What happens to the count if the average follower count doubles and the push fraction stays one fifth?',
      alternative: 'Writing one post and letting each reader query the authors they follow removes the 300 inserts. The work moves to read time, multiplied by the number of readers rather than the number of followers.',
    },
    evening: {
      title: 'Who waits, on write or on read',
      why: 'Fan-out on write and fan-out on read move the same work to different people. The choice is not which one is modern. It is who waits, and whether that wait is bounded.',
      explain: `Fan-out on write does the per-follower work when the post is created. A reader later loads a timeline that is already a list of ids. The reader waits on one query. The worker, or the author if you did it inline, waits on the follower count. Fan-out on read stores the post once. A reader waits while you find the accounts they follow and pull recent posts from each. The author does not wait. A reader who follows thousands of accounts does.

For a post with 300 followers, choose fan-out on write, on a worker, not inside the request. The worker waits on about 300 inserts. The reader does not. The author's request waits on one insert. That choice breaks when one account has far more followers than 300, because one publish then dominates the worker. Those accounts should be read by merging at read time, or the writer-side wait becomes the outage.`,
      question:
        'A typical post reaches 300 followers. Choose fan-out on write or fan-out on read for that post, and state who waits. Say what you refuse to do inline in the author's request.',
      hints: [
        'At 300 inserts, a background worker can pay the cost so the reader hits one timeline query.',
        'The author should wait on the post insert only. The 300 inserts are the worker's wait.',
      ],
      outline: [
        'Choose fan-out on write for the 300-follower post.',
        'The worker waits on the timeline inserts. The reader waits on one timeline read.',
        'The author's request waits only for the single post insert, not for the fan-out.',
        'Do not run the 300 inserts inline. An account far above 300 followers should not use this path.',
      ],
      solution: `Choose fan-out on write, done by a worker after the post commits. The worker waits on the 300 timeline inserts, the index update, and the pushes. The reader waits on a single timeline read and does not assemble the feed from 300 authors. The author waits only for the post row. That is the point of not doing the fan-out inline. Inline, the author would wait on all 300, and a slow follower insert would be a slow publish button.

Refuse the inline fan-out in the request. Also refuse this path for an account with hundreds of thousands of followers. One such publish would make the worker wait on that many inserts and would stall everyone else's timelines behind it. Those accounts should fan out on read: the write is one row, and the reader waits to merge that author in, with a cap on how many accounts a read will scan. Two paths is more code. One path that writes a celebrity's follower list synchronously is an outage with a publish button in front of it.`,
      rubric: [
        'Fan-out on write is chosen for the 300-follower case, with the worker named as who waits and the reader named as who does not.',
        'The author request is limited to the post insert, and a much larger follower count is called out as the case this choice does not cover.',
      ],
      myth: [
        'Fan-out on write is always better because reads become a single query.',
        'Reads are cheap because the write paid the cost. That cost is one insert per follower, and it is unbounded for an account everyone follows.',
      ],
      context:
        'The feed estimate lives or dies on this choice. A ten-times error in follower count is a ten-times error in write rate only if you fan out on write.',
      tradeoff: 'Write fan-out makes reads predictable and makes one popular publish a write storm. Read fan-out makes publishes cheap and makes a well-followed reader slow.',
      mistake: 'Running the 300 timeline inserts inside the publish request so the worker "does not have to exist yet."',
      followUp: 'A reader follows 2,000 accounts and you switch only the huge authors to fan-out on read. What does that reader wait on?',
      extension: 'What do readers see if the worker is an hour behind on timeline inserts?',
      alternative: 'Fan-out on read for everyone avoids the worker and the hot celebrity write. Every feed load then pays a merge cost, including users who follow twenty accounts and gained nothing from the change.',
    },
  },
  'read-amplification': {
    morning: {
      title: 'One user read, many internal reads',
      why: 'The request the user made is one round trip. The service can turn it into a query per post, per author, and per image. Capacity and latency follow the internal count, not the page view.',
      explain: `Read amplification is the number of internal reads caused by one user read. A home feed that loads 40 post ids, then fetches each post, each author, and each media row, does 1 + 40 + 40 + 40 internal reads if each fetch is its own query. That is 121 reads for one screen. The user sent one GET. The database saw 121.

Serial, those reads add latency. Parallel, they still spend capacity and connections. A batched IN query can collapse 40 post fetches into one round trip and does not collapse the logical reads to one if the database still touches 40 rows. Say which you mean. The failure mode is the same either way when the fan-out is unbounded: one user, one cache miss, a stampede of internal reads.`,
      question:
        'GET /home loads up to 40 timeline ids, then loads each post, each author, and each media row as its own query. How many internal reads does one user read become, and why can the user-facing rate hide that?',
      hints: [
        'Count the timeline query plus three queries per post. 40 posts is the multiplier.',
        'The access log shows one request. The database log shows the amplified queries.',
      ],
      outline: [
        'One timeline query returns up to 40 ids.',
        'Each id triggers a post query, an author query, and a media query.',
        'The total is 1 + 40 + 40 + 40, which is 121 internal reads.',
        'The user-facing rate counts the single GET, so it understates database load by that factor.',
      ],
      solution: `One GET /home becomes 121 internal reads when the timeline has 40 posts and each lookup is its own query. The timeline query is the 1. Posts, authors, and media are 40 each. 1 + 120 is 121. If a post is missing a media row you might do fewer. The plan is 121. At 2 milliseconds each, a serial walk is about a quarter of a second before the network back to the user. In parallel you spend the same 121 reads of database capacity inside one user request.

The user-facing rate hides it because the access log and the edge graph count GETs. Fifty home loads per second look moderate. At this amplification they are up to 6,050 internal reads per second, and that is before retries. A database CPU graph is the one that will move. An SLO on the edge latency will move later, once the internal reads queue. Batching posts into one IN query changes the round trips and is worth doing. It does not change the fact that the user asked for one screen and you touched on the order of a hundred rows. The cap on that order is a separate decision.`,
      rubric: [
        'The amplification is computed as 1 + 3 * 40, equal to 121 internal reads for one home load.',
        'The user-facing request rate is distinguished from the database load, which is higher by that factor.',
      ],
      myth: [
        'Read load on the database is about the same as the request rate users generate.',
        'It is the request rate times the internal reads per request. A feed that fans out per item can be two orders of magnitude above the access log.',
      ],
      context:
        'An N+1 in an ORM shows up here. The handler looks like one function call. The query log shows the 40. The amplification is that gap.',
      tradeoff: 'One query per entity keeps the code obvious and multiplies load by the page size. A batched query is harder to cache per entity and cuts the round trips.',
      mistake: 'Setting a database connection pool from the edge request rate, then exhausting it on the amplified queries inside each request.',
      followUp: 'If the home load is cached except for a 10% miss rate, what internal read rate remains at 50 requests per second?',
      extension: 'What does a single uncached celebrity profile do if every one of the 40 posts asks for that same author separately?',
      alternative: 'Storing the author name and media URL on the timeline row makes the home load one query. You then pay on the write, and you show stale names until the timeline row is rewritten.',
    },
    evening: {
      title: 'The cap the user can see',
      why: 'An uncapped fan-out turns one slow dependency into a timeout for the whole page. The cap has to be a product behavior, not only a query tweak, because the user will see where you stopped.',
      explain: `Put a number on the amplification and decide what the response contains when you hit it. A hard cap of 20 hydrated posts, loaded with at most three queries, means one user read cannot become 121 internal reads. The timeline query, one batched post query, and one batched author query are the three. Media lives on the post row, or it waits for another request. Past the cap you return what you have.

The user should see a shorter page, not an error. Twenty posts, plus a cursor they can follow for the next twenty. They should not see a 503 because the twenty-first post would have been expensive, and they should not see a spinner that waits on a fourth round trip you already decided not to make. A placeholder is honest if you dropped images. A failure is not, unless you truly have nothing to show.`,
      question:
        'Cap the home-feed amplification. Give the maximum internal work per GET /home, and say what the user sees when the timeline has more posts than the cap allows on this response.',
      hints: [
        'Pick a post limit and a query limit. Three batched queries and 20 posts is a concrete cap.',
        'The overage is the next page, not an error. The user already has a useful screen.',
      ],
      outline: [
        'Cap a response at 20 posts and at three internal queries.',
        'The queries are the timeline, a batched post load, and a batched author load.',
        'The user sees those 20 posts and a cursor for the rest.',
        'The user does not see a 503 or a wait for posts beyond the cap.',
      ],
      solution: `Cap GET /home at 20 posts and at three internal queries: one timeline read, one batched fetch of those posts, and one batched fetch of the authors. That is the amplification limit. A timeline with 40 ids returns the first 20 on this response. You do not issue the other 60 lookups the uncapped N+1 would have issued. Internal work stays at three round trips and 20 rows in each batched query, not at 121 queries.

At the cap the user sees 20 posts, with authors, and a cursor for the next page. They do not see an error. They do not see a timeout caused by the posts you refused to load. If a media URL is missing from the post row, that image is a placeholder, not a fourth query. The next cursor load is a new user read with the same cap. What you gave up is completeness of a single response. What you kept is a bound: one screen cannot knock over the database by being long. A client that ignores the cursor and retries the same GET does not get the rest of the feed. It gets the same 20.`,
      rubric: [
        'The cap is a concrete post count and a concrete query count, small enough to rule out a per-item N+1 of the whole timeline.',
        'At the cap the user sees a partial feed and a way to continue, not an error page.',
      ],
      myth: [
        'A cap on internal reads means the user receives an error when the page is long.',
        'The cap means the response is shorter. The user sees the posts you hydrated and a cursor. The posts past the cap wait for the next request.',
      ],
      context:
        'Timeouts are the uncapped version of this page. The gateway gives up while the handler is still on author query 30. The cap is how you finish inside the deadline.',
      tradeoff: 'A tight cap protects the database and makes a long catch-up session into many round trips. A loose cap feels complete and lets one user reintroduce the amplification.',
      mistake: 'Returning 503 when the timeline is longer than 20, so the cap is visible as an outage instead of as a cursor.',
      followUp: 'What should the second request include so it does not return the same 20 posts again?',
      extension: 'How do you keep the cap if a later feature adds a fourth query per post for live like-counts?',
      alternative: 'A precomputed home payload in a cache makes the read one fetch and moves the amplification to the writer that fills the cache. A miss still needs the cap, or the miss is the old problem.',
    },
  },
  'bottleneck-hunt': {
    morning: {
      title: 'One saturated resource',
      why: 'A slow service has many graphs that look unhappy. Utilization, queue time, and errors together pick the resource that is actually full, which is the only one worth adding or fixing first.',
      explain: `Utilization says a resource is busy. Queue time says work is waiting on it. Errors say the wait has turned into failures the user sees. You want the resource where all three agree. High CPU with no queue and no errors is a busy machine, not yet the reason users are failing. Errors with idle CPU and an empty accept queue are downstream. The saturated resource is the one with high utilization and a queue in front of it.

Pick one. A hunt that names five bottlenecks has not started the fix. The others may be real later, after this one moves. Write the evidence in one sentence: which gauge is high, which wait time grew, which error that wait produces. If those three point at different places, you do not have the bottleneck yet. You have three clues.`,
      question:
        'Four app servers sit near 22% CPU. The accept queue on those servers is near zero. Database CPU is 93%. Pool wait p99 is 700 milliseconds. HTTP 504s are rising and they are timeouts, not application exceptions. Which single resource is saturated, and which evidence did you use?',
      hints: [
        'Match high utilization with a queue. App CPU is low and nothing is waiting to be accepted there.',
        'The 504s are timeouts. Ask what the handler is waiting on for those 700 milliseconds.',
      ],
      outline: [
        'App CPU and the accept queue say the app tier is not full.',
        'Database CPU at 93% says the primary is busy.',
        'Pool wait of 700 milliseconds is the queue in front of that database.',
        'The 504 timeouts are that wait exceeding the deadline. The saturated resource is the database.',
      ],
      solution: `The saturated resource is the database. Its CPU is at 93%, so utilization is high. The connection pool wait of 700 milliseconds is the queue in front of it: handlers are ready and cannot get a connection because the database cannot finish the work it already has. The 504s are timeouts, which is that queue exceeding the caller's deadline. Utilization, queue time, and errors agree.

The app tier is not the bottleneck. CPU at 22% is idle, and an accept queue near zero means requests are not waiting to enter the process. They are waiting inside it, on the pool. Scaling a guess before this match is how you add the wrong machine. Name the database, and only then decide whether the next change is a query, an index, a write reduction, or a bigger primary. Those are different fixes for the same saturated resource. They are not four bottlenecks.`,
      rubric: [
        'The database is the single saturated resource, supported by high CPU, pool wait, and timeout 504s together.',
        'The app tier is rejected using low CPU and an empty accept queue, not by a hunch.',
      ],
      myth: [
        'The bottleneck is wherever errors are counted, which is usually the app process that returns them.',
        'The app is where the timeout becomes an HTTP status. The wait and the utilization are on the database. That is the resource that is full.',
      ],
      context:
        'This is the same reading as a full accept queue with a calm application error rate. The errors, the queue, and the idle tier are in different places, and you believe the queue.',
      tradeoff: 'Waiting for all three signals avoids paging on a busy CPU that users do not feel. It also delays you when the queue metric is missing and only errors and utilization are on the dashboard.',
      mistake: 'Listing the app, the pool, and the database as three bottlenecks because all three graphs moved during the same minute.',
      followUp: 'Pool wait is high and database CPU is 30%. What does that do to the conclusion that the database is saturated?',
      extension: 'Which extra signal would separate a slow query from a primary that is simply out of CPU?',
      alternative: 'A trace of one slow request can show the waiting span and skip the fleet-wide hunt. It can also point at a one-off, so you still want the utilization graph before you resize anything.',
    },
    evening: {
      title: 'Do not scale the idle side',
      why: 'Adding capacity on the idle side of a bottleneck spends money and usually adds load to the side that is already full. The rejection is the decision.',
      explain: `Once the saturated resource is the database, more app servers are capacity on the idle side. They bring idle CPU and new database connections. The primary does not get faster because more clients are waiting. It often gets slower, because the connection count and the lock contention go up. The scale-out is not a neutral experiment. It pushes the wrong direction.

Reject it in those words. The change that belongs on the saturated side is a query that does less, an index that matches the query, a reduction in writes, or a larger primary. A read replica belongs only if the saturated work is reads the replica can take. Propose one of those, and say no to the app replica count. A rollout that "might help" is how the idle side keeps growing in the ticket history.`,
      question:
        'Someone proposes scaling the app tier from 4 servers to 12 to clear the 504s. App CPU is 22%, database CPU is 93%, and pool wait p99 is 700 milliseconds. Reject or accept that scale-out, and say what you would add or fix instead.',
      hints: [
        'The proposal adds capacity where utilization is low. That is the idle side.',
        'More app servers open more pools against the database that is already at 93% CPU.',
      ],
      outline: [
        'Reject the move from 4 app servers to 12.',
        'App CPU is the idle side. The database is the saturated side.',
        'Twelve servers would add connections and waiters, not database throughput.',
        'The useful change is on the database: a cheaper query, or a bigger primary if the work cannot be reduced.',
      ],
      solution: `Reject the scale-out from 4 app servers to 12. The app tier is the idle side: 22% CPU and nothing piled up in the accept queue. The 504s come from pool wait on a database at 93% CPU. Twelve app servers do not give that database more CPU. They give it more clients. You should expect the pool wait and the 504s to stay or get worse, and the new servers to look idle too.

Put the change on the saturated side. If a profile says one query is the CPU, fix or index that query. If the primary is doing necessary work at the limit of the box, a bigger primary is the scale-up that matches the bottleneck. A read replica is appropriate only for reads that can leave the primary. It is not a response to a saturated write. Do not compromise by going from 4 to 6 "to see." That is the same wrong side, in a smaller quantity. Measure database CPU and pool wait after the real change. If app CPU climbs and pool wait falls, you moved the right resource.`,
      rubric: [
        'The app scale-out is rejected because the app tier is idle and the database is saturated.',
        'The replacement action is on the database, such as a cheaper query or a larger primary, not a smaller app scale-out.',
      ],
      myth: [
        'Adding capacity somewhere in the path cannot make the incident worse.',
        'Capacity on the idle side adds clients to the full side. More app servers against a hot primary increase connections and lock wait.',
      ],
      context:
        'This is horizontal scaling that does not move the bottleneck, applied as a reject in the middle of an incident rather than as a design review afterward.',
      tradeoff: 'A bigger primary costs money and may be the right spend. More app servers cost money and add load to the machine you are out of. The cheaper app change is the one that does harm.',
      mistake: 'Splitting the difference and adding a few app servers so the proposal is not fully rejected.',
      followUp: 'Database CPU falls to 40% after the query fix and app CPU rises to 80%. What is the saturated resource now?',
      extension: 'When would adding app servers be the correct scale-out for these same 504s?',
      alternative: 'Shedding load at the edge reduces concurrency on the primary without adding machines. Users see errors you chose, instead of 504s you did not, and you still have not raised write throughput.',
    },
  },
  'feed-estimate': {
    morning: {
      title: 'Read rate and write rate for a feed',
      why: 'A feed has two rates that do not match: how often people read it, and how many timeline rows one publish writes. Sizing from the publish button alone misses the larger of the two.',
      explain: `State the assumptions, then multiply. Daily readers times reads per person is the read count. Divided by 86,400 it is the average read rate. A peak factor turns that into the rate you have to serve. Posts per day times followers per post is the timeline write count, if you fan out on write. The same division gives the write rate. Storage is those rows times their size. None of these are measurements until you say they are assumptions.

Keep the peak factor explicit. A ten-times peak is an assumption about the shape of the day, not a law. So is the follower count. The estimate is the arithmetic under those assumptions, plus the sentence that names them. A single "QPS" with no read or write attached is not an estimate of a feed.`,
      question:
        'Estimate the feed. Assume 100,000 people each read it 5 times on a given day, 5,000 of them publish one post, fan-out on write reaches 200 followers, and the peak hour is 10 times the average rate. A timeline row is 100 bytes. A post body is 1,000 bytes. Give average and peak read and write rates, and a year of storage with two copies.',
      hints: [
        'Reads per day are people times reads. Timeline writes per day are posts times followers.',
        'Divide by 86,400 for the average. Multiply that by 10 for the peak you were given.',
      ],
      outline: [
        'Feed reads are 100,000 * 5, which is 500,000 per day, about 5.8 per second average and about 58 per second at peak.',
        'Posts are 5,000 per day, under 1 per second even at the 10 times peak.',
        'Timeline inserts are 5,000 * 200, which is 1,000,000 per day, about 12 per second average and about 116 per second at peak.',
        'A year of timeline rows with two copies is on the order of 75 GB, and post bodies are far smaller.',
      ],
      solution: `Reads: 100,000 people * 5 reads is 500,000 reads per day. Divided by 86,400 that is about 5.8 reads per second on average. The assumed peak is 10 times average, about 58 reads per second. Writes of posts: 5,000 per day is about 0.06 per second average and about 0.6 per second at that peak. Timeline fan-out dominates the writes. 5,000 posts * 200 followers is 1,000,000 timeline inserts per day, about 11.6 per second average and about 116 per second at peak. Those are the two rates. The publish endpoint is the small one.

Storage: timeline rows are 1,000,000 * 100 bytes per day, which is 100 MB per day, about 36.5 GB in a year for one copy and about 73 GB with a second copy. Post bodies are 5,000 * 1,000 bytes per day, about 5 MB per day, under 4 GB a year with two copies. Disk is not the constraint. A single primary can take 58 reads per second and 116 narrow inserts per second if the queries stay indexed. That conclusion is only as good as the assumptions: 200 followers, 5 reads a day, and a peak of 10 times average. Label all three as invented until a log says otherwise.`,
      rubric: [
        'Read rate is derived as about 5.8 per second average and about 58 per second peak, from 500,000 reads per day.',
        'Timeline write rate is derived as about 12 per second average and about 116 per second peak, from 5,000 posts times 200 followers.',
      ],
      myth: [
        'The write rate of a feed is the rate at which people publish posts.',
        'That is the post rate. Fan-out on write multiplies it by followers. Here that product is about 200 times the post rate and is the write rate that matters.',
      ],
      context:
        'The QPS-and-bytes multiplication is this estimate's storage step. The follower count is the payload's cousin: a small integer that dominates because it multiplies every post.',
      tradeoff: 'Using a peak of 10 times average sizes for a sharp hour and overstates a flat day. Using the average as the capacity target is cheaper and falls over at the hour you assumed.',
      mistake: 'Sizing the database for 0.6 posts per second at peak and forgetting the 116 timeline inserts behind each wave of posts.',
      followUp: 'If fan-out moves to read, which of these rates disappears, and what new read cost appears?',
      extension: 'What is the timeline insert rate at peak if followers per post are 2,000 instead of 200?',
      alternative: 'Measuring a week of an existing feed replaces every assumption with a rate. It does not estimate a feed you have not launched, which is when the multiplication is the tool you have.',
    },
    evening: {
      title: 'Which input moves the design',
      why: 'An estimate is a reason to pick a design. The useful sensitivity test is which single input, off by ten times, would make that design the wrong one.',
      explain: `Hold the design fixed and move one assumption by ten times. Here the design is one primary, fan-out on write, sized for about 58 reads per second and about 116 timeline inserts per second at peak. Some inputs, moved by ten times, stay inside that design. A 10,000 byte post body instead of 1,000 changes yearly storage from a few gigabytes to a few tens. One primary does not care.

The follower count does care. Two hundred followers was the write multiplier. Two thousand followers makes peak timeline inserts about 1,160 per second. That is a different design: you stop fanning every account out on write, or you stop putting those inserts on one primary. Daily readers off by ten times moves the peak read rate to about 580 per second, which a replica can still take. The input that changes the design is the follower count, not the body size and not, by itself, the reader count.`,
      question:
        'The design from the estimate is one primary and fan-out on write. Which single assumed number, if it is ten times wrong, changes that design? Show the new peak rate, and show one number that can be ten times wrong without changing it.',
      hints: [
        'Multiply the peak timeline insert rate by ten. Compare that with what you claimed one primary could absorb.',
        'Multiply the post body size by ten and look at yearly disk, not at request rate.',
      ],
      outline: [
        'Followers per post, off by ten times, takes peak timeline inserts from about 116 per second to about 1,160.',
        'That rate changes the design: one primary should not take the fan-out for every account.',
        'A ten-times larger post body changes yearly storage and does not change the rate design.',
        'Ten times the readers, about 580 peak reads per second, still fits a read replica and is the weaker lever.',
      ],
      solution: `The follower count is the number that changes the design. The estimate used 200 followers and got about 116 timeline inserts per second at peak, which is a plausible single-primary write load for a narrow row. At 2,000 followers the same 5,000 posts per day and the same 10 times peak produce about 1,160 inserts per second. One primary doing the fan-out for every account is no longer the design. You fan out on read for large accounts, shard the timeline writes, or both. A ten-times error in the average is enough. You do not need a celebrity story on top, although a single account with 100,000 followers would force the same choice on its own.

A ten-times error in the post body, 10,000 bytes instead of 1,000, moves body storage to about 50 MB per day and still leaves the year in the tens of gigabytes with two copies. No rate changes. Ten times the daily readers, one million people, moves peak reads from about 58 to about 580 per second. That is a reason to add a replica, not a reason to abandon one primary for writes. Call the sensitive input the followers per post. If you can only measure one assumption before you commit to fan-out on write, measure that one.`,
      rubric: [
        'Followers per post is the sensitive input, with peak timeline inserts shown rising from about 116 per second to about 1,160.',
        'A contrasting input, such as post body size or reader count, is shown as ten times wrong without forcing the same design change.',
      ],
      myth: [
        'Every input to a capacity estimate deserves the same margin, so you multiply the whole result by ten.',
        'Inputs are levers of different lengths. A blanket factor hides the one lever, followers, that actually changes the design.',
      ],
      context:
        'This is the uncertainty step from the estimation method, applied to a feed. The invented number and the sensitive number should be the same number, or you are hedging the wrong cell.',
      tradeoff: 'Designing for 2,000 followers up front survives the miss and builds sharding you may not need. Designing for 200 is smaller and wrong if the graph is denser than the guess.',
      mistake: 'Adding a ten-times safety factor to the server count while leaving fan-out on write in place for every account.',
      followUp: 'What peak insert rate do you get if both followers and posts per day are ten times the estimate?',
      extension: 'Which measurement in the first week of launch would tell you the follower assumption was the one that was wrong?',
      alternative: 'Fan-out on read for every account makes the follower count a read-time cost instead of a write rate. The sensitive input then becomes how many accounts a single reader follows, which is a different ten-times mistake.',
    },
  },
  'scale-cost': {
    morning: {
      title: 'A monthly cost next to the choice',
      why: 'A scaling choice without a cost is a preference. The latency you are willing to buy has to be a number too, or the more expensive option wins by sounding faster.',
      explain: `Put the cost and the measured latency on the same line as the design. "One database, 420 dollars a month, p99 of 35 ms at the target rate" can be compared. "We should add a cache" cannot. The latency budget is an input you write down before you look at the prices, in the unit users wait in. p99 under 80 ms is such an input. A budget you invent after seeing the options is a way to justify the option you already like.

Use prices you could point at this month, and say they are quotes, not laws of physics. Include the cheap option that misses the latency, not only the two you respect. The comparison is incomplete if every listed design already meets the goal. Someone will propose the missing cheap one in the review.`,
      question:
        'GET /feed must stay at or under a p99 of 80 milliseconds at 60 reads per second. Put a monthly cost beside each design you would actually compare, including one that is cheap and slow. State the latency each one demonstrated at that rate.',
      hints: [
        'Write the 80 millisecond line first, then the prices, so the budget is not derived from the most expensive option.',
        'Include a design that fails the latency. A list of only healthy options hides the real cheaper choice.',
      ],
      outline: [
        'The latency you are buying is p99 at or under 80 milliseconds at 60 reads per second.',
        'One database server is 420 dollars a month and measured 35 milliseconds at that rate.',
        'A cache plus two read replicas is 1,600 dollars a month and measured 8 milliseconds.',
        'A small shared database is 110 dollars a month and measured 150 milliseconds, which misses the line.',
      ],
      solution: `The latency budget is p99 at or under 80 milliseconds for GET /feed at 60 reads per second. Write that before the prices. Against it, three quotes from this month's list. One database server sized for the rate: 420 dollars a month, and the load test showed p99 of 35 milliseconds. A cache in front of two read replicas: 1,600 dollars a month, p99 of 8 milliseconds in the same test. A small shared database: 110 dollars a month, p99 of 150 milliseconds.

All three are scaling choices with a cost attached. The 8 millisecond design is faster and costs about four times the single server. The 110 dollar design is the cheapest and it does not meet 80 milliseconds. The single server meets the budget with margin, from 35 to 80, and costs 420 dollars. These are quotes and test results, not a forecast of next year's prices or of a rate above 60. If the rate assumption changes, the test has to be rerun. Do not carry the 35 millisecond result over to a rate you did not measure.`,
      rubric: [
        'A numeric latency budget is stated, and at least two designs have both a monthly cost and a measured p99.',
        'One listed design is cheaper and misses the latency budget, so the cost comparison includes a real reject.',
      ],
      myth: [
        'The faster design is the correct scaling choice whenever you can afford it.',
        'It is the correct choice when the latency you wrote down requires it. Below that line, extra speed is a cost with no requirement attached.',
      ],
      context:
        'This is an estimate with a new unit. Dollars per month are an input with a source, the quote, and the latency is an input with a source, the load test. Both can be invented if you let them.',
      tradeoff: 'Testing all three costs engineering time and keeps you from buying the cache by default. Skipping the cheap test makes the 420 dollar server look like the budget option when it may not be.',
      mistake: 'Writing the latency budget as "as fast as possible" so the 1,600 dollar design cannot lose the comparison.',
      followUp: 'The single server was measured at 60 reads per second. What do you do with its 35 millisecond result if the real rate is 200?',
      extension: 'What cost line would you add if the cache design also needs an operator every time it cold-starts?',
      alternative: 'A cost per million requests, instead of a monthly total, is the better unit when traffic swings hard. You still need the monthly floor, because the idle replica has a price at zero requests.',
    },
    evening: {
      title: 'The cheaper design inside the budget',
      why: 'The bill and the latency line already exist. The choice is the cheapest design that still meets the line, not the fastest design on the list.',
      explain: `Read the latency you wrote down and cross out every design that misses it. Then take the cheapest one that remains. That is the decision. A design that is faster than the line is allowed to win only if it is also cheaper, or if you change the line in writing before you buy. Changing the line after you see the price is how the budget stops being a constraint.

Do not average the options. Do not keep a slice of the expensive one "for the hot path" unless that slice has its own cost and its own measured latency. You already have the numbers. You have to be willing to say no to a faster graph.`,
      question:
        'The latency you wrote down is p99 under 80 milliseconds at 60 reads per second. The single database is 420 dollars a month at 35 milliseconds. The cache and replicas are 1,600 dollars at 8 milliseconds. The small shared database is 110 dollars at 150 milliseconds. Which design do you choose, and which do you reject for latency?',
      hints: [
        'Drop any design whose measured p99 is over 80 milliseconds before you compare prices.',
        'Among the ones that remain, pick the smaller monthly cost. Do not pay for 8 milliseconds you did not require.',
      ],
      outline: [
        'The 110 dollar database at 150 milliseconds misses 80 milliseconds and is rejected.',
        'Both the 420 dollar and the 1,600 dollar designs meet the latency line.',
        'The 420 dollar single database is the cheaper one that meets it, so it is the choice.',
        'The cache design is faster than the requirement and is not selected on speed alone.',
      ],
      solution: `Choose the single database at 420 dollars a month. It measured 35 milliseconds at the target rate, which is under the 80 millisecond line you wrote down. Reject the small shared database. It is cheaper at 110 dollars and it measured 150 milliseconds, so it does not meet the line. The cache and two replicas meet the line at 8 milliseconds and cost 1,600 dollars. You would be paying about 1,180 dollars a month for a latency target you do not have.

Leave the line where it is. If product later writes down p99 under 10 milliseconds, the 420 dollar design fails and you reopen the comparison. Until that sentence exists, buying the cache is a different goal. Do not split the difference with a single replica "just in case." That is a third design with no measurement. The choice is the cheapest measured design that satisfies the number already on the page.`,
      rubric: [
        'The 420 dollar database is chosen because it meets 80 milliseconds and costs less than the other design that also meets it.',
        'The 110 dollar database is rejected for missing the latency, not for being small, and the cache is rejected as extra speed.',
      ],
      myth: [
        'If two designs meet the latency goal, the faster one is the responsible purchase.',
        'Both already met the goal. The remaining axis is cost. Paying for 8 milliseconds when you required 80 spends the difference on an unstated requirement.',
      ],
      context:
        'Error budgets are the reliability version of this line. You do not buy more nines than the objective you wrote. You do not buy more milliseconds either.',
      tradeoff: 'The 420 dollar server has less headroom between 35 and 80 milliseconds than the cache has. That headroom is real, and it is not free. Buying it without changing the written latency is how the expensive design returns.',
      mistake: 'Choosing the 1,600 dollar design because 8 milliseconds is a more impressive graph than 35.',
      followUp: 'What latency would you need to write down before the 1,600 dollar design becomes the cheaper one that qualifies?',
      extension: 'The quote on the single database rises to 900 dollars and the test result does not change. Does the choice change?',
      alternative: 'Spending the 1,180 dollar difference on a faster client render may change user-perceived time more than shaving the server p99 from 35 milliseconds to 8. That is a different design, and it needs its own measurement.',
    },
  },
  'scaling-review': {
    morning: {
      title: 'First bottleneck, first hotspot',
      why: 'A design review that lists every component does not say what breaks first. The first bottleneck and the first hotspot are the two sentences the review has to produce.',
      explain: `The first bottleneck is the resource that saturates at the target rate while the others still have headroom. The first hotspot is the key or partition that will be busy when the average looks fine. They are different. A bottleneck can be spread across every user and still be one full CPU. A hotspot can exist on a fleet that is mostly idle, because one key gathered the work.

Name both against a stated rate. "Thumbnails are the bottleneck at 40 uploads per second on 8 vCPU" is a review. "We use object storage and a database" is an inventory. The hotspot needs a key. user_id, sku, or a single partition. If you cannot say the key, you have a hunch, not a hotspot.`,
      question:
        'Review this upload design at 40 uploads per second on 8 app vCPU. The request writes the original to object storage, inserts metadata into one Postgres primary partitioned by user_id, and generates a thumbnail in the request at about 200 milliseconds of CPU. One partner account is most of the traffic. What is the first bottleneck, and what is the first hotspot?',
      hints: [
        'Turn 40 uploads per second times 200 milliseconds of CPU into a core count, and compare with 8 vCPU.',
        'A partition key of user_id concentrates the partner account on one partition even when other users are quiet.',
      ],
      outline: [
        'Thumbnail CPU is about 40 * 0.2, which is 8 cores, so the app CPU is the first bottleneck.',
        'Forty metadata inserts per second do not fill a primary by themselves.',
        'The first hotspot is the partner account on the user_id partition.',
        'Object storage is not the first limit at this rate, and idle users do not share that hot partition.',
      ],
      solution: `The first bottleneck is thumbnail CPU on the app. Forty uploads per second times about 200 milliseconds of CPU is about 8 core-seconds every second, which is the entire 8 vCPU fleet, spent inside the request before it returns. Object storage puts and 40 metadata inserts per second are small next to that. The primary is not first. The image library is. Users will wait on resize while database graphs look calm.

The first hotspot is the partner account. Metadata is partitioned by user_id, and one partner is most of the uploads, so one partition takes most of the writes and one slice of the app, if routing is sticky by user, takes most of the resize CPU. The other partitions stay idle. Average CPU across users would hide it. The review should say both sentences: thumbnail CPU saturates first at this rate, and the partner's user_id is the hot key inside that. A queue for thumbnails would move the bottleneck off the request. It would not by itself split the hot key.`,
      rubric: [
        'The first bottleneck is thumbnail CPU, with 40 uploads per second times about 200 milliseconds compared to 8 vCPU.',
        'The first hotspot is the partner account, or its user_id partition, not the storage service in general.',
      ],
      myth: [
        'The database is the first bottleneck of any design that writes metadata.',
        'It is the first bottleneck when its utilization says so. Here the arithmetic puts the cores in the thumbnail path, and the inserts are a small rate.',
      ],
      context:
        'The bottleneck hunt in production is this review after the graphs exist. Doing it before launch is the same three signals, fed by arithmetic instead of by a CPU gauge.',
      tradeoff: 'Generating the thumbnail in the request makes the upload response include a ready image and couples user latency to CPU. A worker makes the upload fast and leaves a window where the original exists and the thumbnail does not.',
      mistake: 'Calling object storage the bottleneck because the bytes are large, without comparing its throughput to the 8 cores of resize work.',
      followUp: 'If thumbnails move to a worker pool you can size separately, what becomes the first bottleneck in the request path?',
      extension: 'What hotspot remains if you change the partition key from user_id to a hash of the photo id?',
      alternative: 'Pre-signed uploads straight to object storage remove the bytes from the app. The thumbnail worker and the metadata insert remain, and the partner hotspot remains with them.',
    },
    evening: {
      title: 'The measurement that would refute the review',
      why: 'A review is a prediction. It needs a measurement that would show the prediction was wrong, chosen before the load test, or the test will be read as confirmation.',
      explain: `Name the gauge and the threshold before you run the test. For this review the prediction is: at 40 uploads per second, app CPU hits the ceiling first, and a single partner user_id is hotter than a spread of users. The refuting measurement is a load test at that rate that records app CPU and the p99 of the metadata insert, once with user ids spread out and once with one user id.

If spread-out traffic drives insert p99 over 200 milliseconds while app CPU stays under 50%, the bottleneck call was wrong. The database went first. If the single-user run is no slower and no hotter than the spread-out run, the hotspot call was wrong. Either result overturns a sentence in the review. A test that only checks "uploads work" overturns nothing.`,
      question:
        'You reviewed thumbnail CPU as the first bottleneck and the partner user_id as the first hotspot, at 40 uploads per second. What measurement would tell you that review was wrong? State the signals and the result that flips each claim.',
      hints: [
        'Record app CPU and metadata-insert latency in the same test. One without the other cannot flip the bottleneck claim.',
        'Run a spread of user ids and a single user id. The hotspot claim is the difference between those runs.',
      ],
      outline: [
        'Load test at 40 uploads per second, spread across many user ids, recording app CPU and insert p99.',
        'The bottleneck claim is wrong if insert p99 exceeds 200 milliseconds while app CPU stays under 50%.',
        'Repeat with one user id at the same rate.',
        'The hotspot claim is wrong if the single-user run matches the spread run on CPU and insert latency.',
      ],
      solution: `The measurement is two load tests at 40 uploads per second, recording app CPU and the p99 of the metadata insert. The first spreads user ids. If insert p99 climbs past 200 milliseconds while app CPU stays under 50%, the review was wrong about the bottleneck. The primary saturated before the thumbnail cores did, and the 200 millisecond CPU arithmetic did not survive contact with the real resize or the real query. If CPU is pegged and the insert stays fast, the bottleneck sentence holds.

The second test sends the same 40 per second as one user id. The hotspot sentence is wrong if that run shows the same CPU and the same insert p99 as the spread run. Nothing concentrated. It is right if one partition's write latency or one instance's CPU pulls away from the spread baseline. Decide those thresholds before you look at the charts. Afterward, every result can be talked into a softer version of the review. The point of naming the measurement now is that a wrong review gets to be wrong in public, on a number, and not in a paragraph that moves the bottleneck after the test.`,
      rubric: [
        'The measurement records app CPU and metadata-insert latency at 40 uploads per second, and states which outcome flips the bottleneck claim.',
        'A single-user run versus a spread run is what flips the hotspot claim, rather than a test that only checks success.',
      ],
      myth: [
        'A load test that completes without errors confirms the scaling review.',
        'Errors are the last signal. The review made a claim about which resource fills first. Only CPU and insert latency, on a spread run and a single-key run, can confirm or refute that claim.',
      ],
      context:
        'This is the uncertainty on the estimate, turned into a test. The sensitive claim is the one you instrument, not every box in the diagram.',
      tradeoff: 'Two scripted runs take time and can refute a review you already socialized. Skipping them saves the meeting and leaves the first bottleneck to production traffic.',
      mistake: 'Watching only the HTTP success rate during the test and marking the review accepted.',
      followUp: 'The spread run pegs CPU and keeps inserts fast, and the single-user run pegs one core while the others idle. Which sentence was right?',
      extension: 'What third signal would you add if object storage might be the real limit the review dismissed?',
      alternative: 'A production canary of the upload path measures the same resources with real photos and real user ids. It is a better mix and a worse place to be wrong, so the scripted test still comes first.',
    },
  },
};
