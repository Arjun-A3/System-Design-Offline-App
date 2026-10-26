import type { LessonPair } from './publish';

export const cachingLessons: Record<string, LessonPair> = {
  'why-cache': {
    morning: {
      title: 'The hop a cache is for',
      why: 'A cache is worth the staleness only when you can name the latency or the load it removes. A copy of a cheap call adds a store that can fail and leaves the request about as slow as it was.',
      explain: `A cache holds a result so later readers skip one origin call. The saving is the time that call took, or the queries per second it would have added. The rest of the request is still there on a hit: the network to the cache, the response bytes, and every hop you did not cache. A miss pays for those and then pays the origin too.

Name the hop from a trace before you add the store. If a page takes 450 ms and one query is 380 ms of that, a cache of that query can remove the 380 ms on a hit and can take that query off the database. If the query is 30 ms and the rest is rendering a large body, the same cache removes 30 ms. The failure is a cache aimed at a database icon. The decision is to store the hop whose removal a user or a database graph will actually show.`,
      question:
        'A product page takes 450 ms. A trace shows the catalog query at 30 ms and the rest in rendering a 1.5 MB response. Someone proposes Redis in front of the catalog query. What latency or load does that cache remove, and what stays on the path?',
      hints: [
        'Time the catalog query against the full page before you treat the database as the bottleneck.',
        'A hit still pays for the payload and the render. A miss pays those plus a cache hop plus the query.',
      ],
      outline: [
        'The page is slow because of the payload and the render, not the 30 ms query.',
        'A catalog cache removes about 30 ms on a hit and little database load.',
        'The 1.5 MB response is still transferred on every view, hit or miss.',
        'Leave the query uncached until a trace shows it is the expensive hop.',
      ],
      solution: `The cache removes the catalog query, about 30 ms, and only when the key hits. The page is 450 ms. The shopper still waits on the render and on 1.5 MB of body. The database work you remove is one cheap read per view, which is not the load that is hurting. A high hit rate on that key will not move the page time in a way anyone can feel.

Do not add Redis as the fix for this page. Shrink the body, or cache a rendered fragment only if that fragment is the measured cost and you can say how stale it may be. The failure is treating the origin as the bottleneck because it is a database. The decision is to leave this query uncached until a trace shows it is a large slice of the 450 ms or a large slice of database work.`,
      rubric: [
        'The cost removed is the 30 ms catalog query, not the 450 ms page time.',
        'The payload or the render is named as the cost that remains, so this cache is rejected as the page fix.',
      ],
      myth: [
        'A cache placed in front of the database makes the whole page fast.',
        'It removes the work of the call you stored. A 30 ms query behind a large response is still a slow page.',
      ],
      context:
        'This is the same miss as adding servers to a process whose CPU is idle. The new tier is real, and the user is still waiting on a hop you did not change.',
      tradeoff:
        'Caching the cheap query is easy to ship and saves almost no user time. Caching the rendered page saves the time and goes stale when any part of that page changes.',
      mistake: 'Adding Redis because the diagram had a database and the page felt slow in a demo.',
      followUp: 'Which span would have to grow before a catalog cache became the change that fixes this page?',
      extension: 'If the catalog query later takes 300 ms, what latency does the same cache start to remove on a hit?',
      alternative:
        'A narrower query can remove the 30 ms without a second store. It does not shrink the 1.5 MB body, so the page stays slow for the same reason.',
    },
    evening: {
      title: 'A hit rate on the wrong hop',
      why: 'A high hit rate is not a latency result. The cache saves nothing a user can feel when the hop it skips was never the wait, and the dashboard still looks successful.',
      explain: `The cache saves the work it skips and nothing else. If that work is a few milliseconds and the request spends hundreds of milliseconds in another service, a hit changes the total by those few milliseconds. The hit-rate graph can sit near the top while the latency graph stays flat. The hit rate is answering how often that one key was found. It is not answering why the request is slow.

Read one slow trace and find the long span. A cache of the cart row does not wrap a payment call. A cache of a user row does not add pool slots when the wait is checkout of a connection. The failure is a healthy cache in front of a hop that was not the cost. The decision is to keep that cache only for a load you measured, and to stop calling it the reason the slow request will get faster.`,
      question:
        'Checkout p99 is 800 ms. The cart-row cache shows a 98 percent hit rate. A miss takes 20 ms, a hit takes 2 ms, and the payment provider takes 600 ms on every checkout. What does this cache remove, and why is checkout still slow?',
      hints: [
        'Subtract the cart time from the 800 ms before you read the hit rate as a checkout win.',
        'The payment call sits outside this cache, so a hit does not shorten that call.',
      ],
      outline: [
        'The cart cache removes at most about 20 ms, and about 2 ms on a hit.',
        'The 98 percent figure counts cart lookups, not checkout latency.',
        'The payment provider is the long span and runs on every checkout.',
        'The cache may still shed database reads and is not the latency fix.',
      ],
      solution: `The cache removes the cart read. That is 20 ms on a miss and about 2 ms on a hit, inside an 800 ms checkout. At a 98 percent hit rate the cart is a rounding error on the average, and the miss is still a small slice. The 600 ms payment call runs every time. The origin behind this cache was not the bottleneck. Shoppers are waiting on the provider.

Leave the cart cache in place only if you have measured the cart query as a database problem. Do not raise its TTL to chase checkout latency. The failure is a hit rate treated as proof that the slow hop was handled. The decision is to work on the payment wait: its timeout, what the shopper sees during it, and whether any old provider answer is allowed to be reused. The cart key cannot speed up a call it does not wrap.`,
      rubric: [
        'The cache is credited only with the cart lookup, a few tens of milliseconds at most.',
        'The payment provider is named as the wait, and the cart cache is not described as touching it.',
      ],
      myth: [
        'A high hit rate means the cache is making the user-visible request fast.',
        'Hit rate is how often one lookup skipped its origin. Hops you never cached are still inside the total.',
      ],
      context:
        'Capacity reviews like hit rate because it moves as soon as the cache exists. Shopper latency moves when the skipped hop was a large part of the wait.',
      tradeoff:
        'Keeping the cart cache sheds a cheap read and adds a stale cart plus another outage. Removing it puts that read back on the database and shortens the path.',
      mistake: 'Raising the cart TTL because checkout p99 did not move after the cache shipped.',
      followUp: 'What would one checkout trace have to show before this cart cache was a latency project?',
      extension: 'About how many database reads per second does a 98 percent hit rate remove if each miss is one indexed get?',
      alternative:
        'Reusing a payment status can remove the 600 ms only when an old status is an acceptable answer. A new charge still has to call the provider.',
    },
  },
  'cache-aside': {
    morning: {
      title: 'Lookup, then the origin, then the fill',
      why: 'Cache-aside is a path the application runs, not a feature the cache turns on. Getting the order wrong is how a miss becomes an error, or how the key gets a value the origin did not return.',
      explain: `On a read, the handler looks up the key. If the cache has a value, the handler returns it and does not call the origin. If the lookup misses, the handler reads the origin, writes that result into the cache, and then returns it. The cache does not notice the miss and load itself. The application is the thing that fills.

A miss is the normal way a key gets populated. Two requests can both see the empty key, both read the origin, and both fill. The last fill wins. That is acceptable when both reads saw the same row. It is a stale write when an older read fills after a newer one. The failure is treating the empty lookup as a broken request, or storing something other than the row you just read. The decision is the order: lookup, origin only on miss, then fill with that read.`,
      question:
        'GET /profiles/42 uses cache-aside. Write the path for a miss, including what is stored, and say what two requests that miss together do to the origin.',
      hints: [
        'The hit path returns from the cache. Only the miss path reads the origin and then writes the key.',
        'Both misses can pass the empty lookup before either fill has landed.',
      ],
      outline: [
        'Look up the profile key. A hit returns the stored profile and stops.',
        'A miss reads the profile row from the origin database.',
        'The handler stores the row it just read, then returns that row.',
        'Two overlapping misses both read the origin and both fill the key.',
      ],
      solution: `The handler looks up profile:42. A hit returns that value and never touches the database. A miss reads the profile row, writes that same value into the cache, and returns it. The bytes stored are the bytes the origin just returned, not a second object built later from memory that might have moved on.

Two requests can miss together. Both observe an empty key, both read the database, and both write the key. The origin sees two reads of one row. If the row was stable, the second fill overwrites the first with the same content. Cache-aside does not make those two waiters share one read. The failure is returning an error because the key was absent, or filling a value you did not just read. The decision is the miss path: origin, then fill, and the user still gets a profile.`,
      rubric: [
        'The miss path is lookup, then an origin read, then a fill of the value that read returned.',
        'Concurrent misses are two origin reads and two fills, not one shared load.',
      ],
      myth: [
        'On a miss the cache itself loads the row from the database and then serves it.',
        'In cache-aside the application performs the load. The cache only keeps what the handler writes after the read.',
      ],
      context:
        'Hand-written Redis calls and ORM caches both follow this shape. The bug is usually what the handler writes back, or a miss that the user sees as a failure.',
      tradeoff:
        'Cache-aside leaves writes in the origin and lets the cache be down if you have a plan. The handler now has a second store, and a failed fill means every later read misses until something writes the key.',
      mistake: 'Returning 500 to the client because the cache lookup found no key.',
      followUp: 'What do you store if the origin has no row, and what does the next lookup return?',
      extension: 'The origin read succeeded and the fill timed out. What does this request return, and what does the next one do?',
      alternative:
        'A read-through cache hides the miss inside the cache client, so the hops look the same from outside. You lose the line of application code where the fill is visible.',
    },
    evening: {
      title: 'A write that left the key behind',
      why: 'Cache-aside does not hear about writes. A save that updates the database and returns can still be followed by a hit on the previous value, and the user who just saved is the one who sees it.',
      explain: `The read path fills a key and then trusts it until something deletes it, replaces it, or the TTL ends. A write handler that only updates the origin does none of those. The next read is a hit. The hit is doing what it was built to do. The value is old because the write never touched it.

The window is the rest of the TTL, or forever if you set no TTL and never delete. The same user who saved is the usual reporter, because they read again immediately. Another user hits the same key and sees the same old value. The failure is a write path that treats the cache as a read optimization and then serves that read to the writer. The decision on the write is to delete or replace the key after the origin commit, or to accept the stale hit and not promise that the next GET matches the PUT.`,
      question:
        'A user PUTs a new display name. The handler updates the profile row and returns 200. It does not touch Redis. The following GET is a cache hit. What does the user see, and which write never happened?',
      hints: [
        'The hit returns the value from the last fill, which happened before this PUT.',
        'The database already has the new name. Another write to the row does not change the key.',
      ],
      outline: [
        'The PUT commits the new display name in the database only.',
        'The cache key still holds the name from the earlier fill.',
        'The following GET hits and shows the user the old name.',
        'The missing write is a delete or a replace of that cache key.',
      ],
      solution: `The user sees the old display name. The GET never reached the row they just updated. Cache-aside returned the filled value, which matches the cache and does not match the write. Another refresh does the same thing until the key expires or something removes it. The origin is already correct. Support can read the row and tell the user it saved. The screen they are looking at is Redis.

The write that never happened is to the cache. After the database commit succeeds, delete the profile key, or replace it with the new name. Delete is the smaller choice. The next GET misses, reads the new row, and fills. If that delete fails and the commit succeeded, the stale hit remains for the rest of the TTL, so the delete has to be retried where someone can see the failure. The failure is a 200 from a write that updated the origin only. The decision is to make the cache write part of the save the user is waiting on, and not to call the save visible while the old key can still hit.`,
      rubric: [
        'The GET is a hit on the pre-PUT name, so the user sees the old display name.',
        'The missing operation is a cache delete or replace, not a second update of the database row.',
      ],
      myth: [
        'Once the database commit succeeds, every cache in front of that row is current.',
        'Cache-aside does not watch commits. The key changes when the application writes it, or when its TTL ends.',
      ],
      context:
        'This is the report that save did nothing. The row has the new name, the access log shows a cache hit, and the user is reading the copy the PUT ignored.',
      tradeoff:
        'Deleting the key on write adds a cache call that can fail after a good commit. Leaving the key makes the PUT faster and makes the next GET a lie until the TTL.',
      mistake: 'Updating the row and assuming the next read will miss because the user just wrote.',
      followUp: 'The commit succeeded and the cache delete timed out. What does a refresh show, and for how long?',
      extension: 'Two requests replace the same key with different names. What can an older replace do that a delete would not?',
      alternative:
        'Writing the new name into the cache and the database together avoids the stale hit. If the cache write lands first and the commit then fails, readers see a name the database rolled back.',
    },
  },
  'cache-writes': {
    morning: {
      title: 'Fail the write, or lag the origin',
      why: 'Write-through and write-behind acknowledge a write at different moments. The moment you pick is the failure you will debug: a request that errors, or a success the origin never stored.',
      explain: `A write that must hit the cache does not return success until the cache has accepted the new value, and write-through also waits for the origin. If the cache write fails, the request fails, including when the origin was healthy and could have stored it. If one store accepts and the process dies before the other, the two copies disagree and the caller did not get a 200. The failure the user can see is a rejected write. The failure you repair in private is a cache ahead of the origin, or an origin ahead of the cache.

A write that may lag returns success when the cache has the value and flushes the origin later. The caller is faster, and the origin is allowed to be behind. A crash or a dropped queue before that flush loses the write or strands it. Readers of the cache see the new value. Readers of the origin, and any rebuild that trusts the origin, do not. The failure is an acknowledged write that is not durable yet. The decision is which of those you can stand on this route.`,
      question:
        'Compare a profile save that must not return 200 until both the cache and the database have the new name with a feed item that is stored in the cache and copied to the database a second later. What fails in each when the process dies at the wrong moment?',
      hints: [
        'Write-through has not returned success if either store is still pending at the moment of the crash.',
        'Write-behind can already have sent success while the origin flush is still queued in the process.',
      ],
      outline: [
        'The profile save is write-through and returns only after cache and database both accept.',
        'A crash before that return looks like a failed save, and one store may already hold the name.',
        'The feed item is write-behind: success follows the cache write, and the database lags.',
        'A crash before the flush drops a feed item the caller was already told existed.',
      ],
      solution: `The profile save is the write that must hit the cache. Both stores have to accept the name before 200. If the process dies after the database commit and before the cache write, the caller sees a failed request, not a saved profile. The database may already have the name and the cache may still have the old one, so a repair has to delete or replace the key. You do not get a success that later vanishes. You do get a save that fails because the cache was required, even if the database was fine.

The feed item is the write that may lag. The handler puts it in the cache, returns 200, and a later flush writes the database. If the process dies with that flush still in memory, the caller has already been told the item exists. Cache readers may still see it. The database never receives it, and a cache that restarts from the database loses it too. The failure is an acknowledged write that lagged and then disappeared. The decision is write-through when that loss is unacceptable, and write-behind when a short lag and a rare loss are cheaper than failing the request.`,
      rubric: [
        'Write-through does not acknowledge the profile until both stores accept, so a crash looks like a failed save and may leave the stores split.',
        'Write-behind can acknowledge the feed item and then lose the flush, so the origin never stores it.',
      ],
      myth: [
        'Write-behind is write-through with a faster database behind it.',
        'The caller has already been told success before the origin write happens. A crash in that gap loses an acknowledged write.',
      ],
      context:
        'Session stores often look like write-behind because the cache is what requests read. The database, when there is one, is a copy that can be seconds or minutes behind.',
      tradeoff:
        'Write-through adds both stores to the latency of the save and keeps them close. Write-behind takes the origin off the response and opens a gap the size of the flush queue.',
      mistake: 'Returning 200 after the cache write on a route you described to the caller as write-through.',
      followUp: 'Write-through updates the cache first and the database commit then fails. What do later reads of the cache return?',
      extension: 'The database is down and the cache is up. Which of the two designs can still acknowledge the write?',
      alternative:
        'Writing only the origin and deleting the cache key avoids a cache that is ahead of the database. The next read misses. That is a poor fit when readers have no acceptable path except the cache.',
    },
    evening: {
      title: 'A like count people will notice',
      why: 'A counter is a small number and an obvious test. If it falls, or if a like the user just watched register disappears, they file the bug. The write policy is that bug.',
      explain: `The user reads the count from the cache on every view and looks again after they tap like. A policy that moves only one store shows two numbers, depending on which store answers. A policy that acknowledges before the durable write can show the new number and then lose it when the process or the cache dies. Both look like a broken count. People notice a count that moves backward more than they notice a click that asked them to retry.

For a value with that audience, success has to mean the durable store and the store they read both contain the new count. Write-behind updates the fast copy, lags the durable copy, and can erase likes that the UI already added. Write-through refuses to return until both have the increment. The click fails when the cache cannot take the write. That is one visible error, and an idempotent retry can finish it. A count that heals downward cannot be retried into looking honest.`,
      question:
        'Likes increment a count shown on the video. After a crash, the count fell and the last likes are gone. The handler incremented Redis, returned 200, and flushed to the database every few seconds. Which policy is that, which do you switch to, and what new failure do you accept?',
      hints: [
        'An increment that was acknowledged while the database flush was still queued can die with the process.',
        'The UI already showed the higher number, so a lost flush looks like the count moving backward.',
      ],
      outline: [
        'The current path is write-behind: Redis has the new count and the database lags.',
        'A crash before the flush drops likes the user was already shown.',
        'Switch to write-through so success means the database and the cache both have the count.',
        'The accepted failure is a like that errors when the cache write fails, not a count that silently drops.',
      ],
      solution: `This path is write-behind. The handler increments Redis, returns 200, and a job writes the database later. The player reads Redis, so the user sees the higher count immediately. When the process dies with the flush unsent, or Redis comes back from a database snapshot that never received those increments, the number falls. The likes they watched register are gone. That is the wrongness they notice.

Switch the like to write-through. Insert one like per user and video, increment the durable count in that same commit, set the cache from the count the database returns, and only then return 200. A retry finds the existing like and sets the cache again. It must not increment a second time. If the cache set fails, return an error even though the like row may exist. The user can retry. The failure you accept is a click that errors when the cache is sick. The failure you are refusing is a count that moves backward after you already showed the higher number.`,
      rubric: [
        'The crash is identified as write-behind losing an acknowledged increment the UI already showed.',
        'The replacement is write-through, and the accepted failure is a rejected like rather than a dropped count.',
      ],
      myth: [
        'A counter can use write-behind because the database flush will catch up before anyone looks.',
        'The user already read the higher number from the cache. A flush that died does not catch up, and the count falls.',
      ],
      context:
        'Inventory is the same shape with a worse bill. A like that vanishes is a trust bug. A stock count that vanishes is an oversell.',
      tradeoff:
        'Write-through puts a database commit on the click and caps the rate at what that commit can do. Write-behind absorbs a burst and can erase the burst on a crash.',
      mistake: 'Incrementing Redis, returning 200, and describing the database flush as a backup that can lag safely.',
      followUp: 'After the switch, the database commit succeeds and the cache set fails. What do you return, and what does a retry increment?',
      extension: 'Two write-through responses race to set the cache. How do you stop an older total from overwriting a newer one?',
      alternative:
        'Keeping write-behind and putting the flush in a durable queue outside the process survives a process crash. It still lags, and it loses likes if that queue acknowledges before the database commit.',
    },
  },
  'cache-ttl': {
    morning: {
      title: 'The age of one stored entry',
      why: 'A TTL is a deadline on a copy you already stored. Teams describe it as a promise about updates. Those are different clocks, and the promise is the one users hear.',
      explain: `A TTL starts when the entry is written. Until it fires, lookups return that entry and do not call the origin. When it fires, the next lookup is a miss and the handler can fill again. The bound is how long this stored value may be served. It is a max age of the copy, measured from the fill, not from the moment someone changed the origin.

A TTL does not move because a write happened. An entry filled a second before the write can live for almost the whole TTL after it. A TTL does not fix a value that was already old at fill time: a lagging replica, once cached, stays wrong for the full TTL. It does not drop the same key in a second cache that has its own timer. It does not spread expiry across waiters, so a hot key can miss as a herd. The failure is using the timer as if it were an invalidation. The decision is to keep the TTL as a backstop on age, and to delete the key when a particular write cannot wait.`,
      question:
        'A profile cache uses a 10 minute TTL. A user changes their name. Some readers see the new name within a couple of seconds, and others see the old name for almost 10 minutes. What did the TTL bound, and what did it fail to bound?',
      hints: [
        'The timer starts when that entry was filled, not when the profile row was updated.',
        'Readers who already hold an entry do not all miss at the moment of the write.',
      ],
      outline: [
        'Each entry may be served until its own TTL, counted from its fill.',
        'The name change does not move those deadlines.',
        'The TTL bounds the age of a stored copy. It does not bound time since the write.',
        'A reader who misses after the write can fill the new name while other readers still hit the old one.',
      ],
      solution: `The TTL bounds the lifetime of whatever was stored. An entry filled nine minutes ago can be served for about one more minute after the rename. An entry filled a second before the rename can be served for almost ten minutes after it. Readers who see the new name in a couple of seconds had a miss, or their entry had already expired, and the fill read the new row. The TTL did not make those readers agree with the ones who still hit.

It did not bound how long after a write every reader sees the new name. Nothing deleted the key, so no such bound exists on this path. It also did not bound freshness at the moment of the fill. If the miss read a replica that had not applied the rename, the new entry is born stale and then lives for another ten minutes. The failure is a promise that renames show up within the TTL, implemented as a timer on each copy. The decision is to treat ten minutes as the max age of an entry, and to delete the key on the rename if the product cannot wait that long.`,
      rubric: [
        'The TTL is a max age from fill, so an entry can outlive the rename by almost the full ten minutes.',
        'Immediate agreement across readers is described as something this TTL does not provide.',
      ],
      myth: [
        'A 10 minute TTL means every reader sees an update within 10 minutes of the write.',
        'It means each copy dies within 10 minutes of when it was stored. A copy stored just before the write lives almost that long after it.',
      ],
      context:
        'DNS works on this contract. A resolver that cached an address a minute ago does not forget it when you edit the zone. It forgets it when the stored TTL ends.',
      tradeoff:
        'A short TTL shrinks the stale window and raises the miss rate. A long TTL sheds origin load and stretches how long a wrong value can be the one you serve.',
      mistake: 'Telling support that a rename is visible to everyone within the profile TTL.',
      followUp: 'If the rename also deletes the key, what is the TTL still for?',
      extension: 'A second cache stores the same response with a longer TTL. What happens to the bound you thought you set?',
      alternative:
        'Deleting the key on the write removes the wait for expiry and falls back to the TTL when the delete itself fails. The timer remains the backstop.',
    },
    evening: {
      title: 'Sixty seconds of the old price',
      why: 'A cached price has a victim for as long as the entry lives. The TTL is how long you are willing to charge a number the origin has already replaced.',
      explain: `During the TTL the cache can serve the price it stored, and the origin can hold a different one. Checkout that reads the cache charges the stored number. Someone is wrong for that whole window. If the price fell, the shopper pays too much. If the price rose, you sell too cheap and the seller is the one who is short. The timer does not know which way the price moved. You do, when you set it.

Pick the number from the cost of being wrong, not from the TTL you used for a profile. A price that moves a few times a day can sit for a short while. A price that changes because a promotion started cannot keep the old number across that start if the promotion is what you published. The failure is a price entry that inherited a long default. The decision is a TTL you can say out loud, plus a delete on the price change if that TTL is only the backstop.`,
      question:
        'A promotion moves a SKU from 40 to 30 at noon. The product cache TTL is 15 minutes, and checkout charges the cached price. A shopper checks out at 12:07 and pays 40. Set a TTL you will defend, and say who is wrong during that window.',
      hints: [
        'The origin price changed at noon. The cache keeps 40 until that entry expires or something deletes it.',
        'Name the person who pays the difference while checkout still trusts the cached number.',
      ],
      outline: [
        'Replace the 15 minute price TTL with a 60 second TTL.',
        'Until that entry expires, checkout can still charge the price from the last fill.',
        'When the price fell, the shopper pays 40 and is the one who is wrong.',
        'Noon still needs a delete. The TTL is only how long a missed delete can keep charging 40.',
      ],
      solution: `Set the TTL to 60 seconds on the price entry checkout reads. Fifteen minutes is long enough to sell the pre-promotion price through the start of the sale. A fill of 40 just before noon can be charged until that entry expires. Under the new TTL that is at most 60 seconds. During the window the cache is wrong relative to the origin. Checkout trusts the cache, so the shopper pays 40 for a SKU whose price is 30. The shopper is the one who is wrong. The origin already has 30. The extra 10 is real money, not a display glitch.

If the price had risen, the same window would undercharge and the seller would be the one who is wrong. Sixty seconds is the bound I will defend for a delete that failed, not for the promotion itself. At noon the writer still deletes the key. Anyone who says the shopper might see a stale price but will pay the right one is assuming a second read at checkout. This path does not do that. The failure is a 15 minute price copy. The decision is 60 seconds, a delete on the change, and a shopper who can be overcharged only inside that minute.`,
      rubric: [
        'A concrete TTL shorter than 15 minutes is set on the price checkout actually charges.',
        'During the window the shopper is the one who is wrong, because a price drop still charges the old number.',
      ],
      myth: [
        'A price TTL only affects the browsing page. Checkout always charges the origin.',
        'If checkout reads the cache, the stored number is what you charge until the entry expires or is deleted.',
      ],
      context:
        'Flash sales surface this as refunds. The list price in the cache outlives the promotion, and support returns the difference one order at a time.',
      tradeoff:
        'A 60 second price TTL limits the overcharge and sends many more reads of a hot SKU to the origin. A 15 minute TTL keeps the database quiet and sells the old price past noon.',
      mistake: 'Reusing the profile TTL for a number that is the amount you charge.',
      followUp: 'Who is wrong if the price rises during the same 60 seconds and checkout still trusts the cache?',
      extension: 'A delete at noon succeeds on one cache cluster and fails on another. Who can still be charged 40?',
      alternative:
        'Reading the price from the origin at checkout, and using the cache only on the browsing page, moves the error to the display. The shopper can see 40 and pay 30.',
    },
  },
  invalidation: {
    morning: {
      title: 'The commit that must drop the key',
      why: 'Invalidation is a write to the cache tied to a change, not a shorter timer. If you cannot name the event that deletes or replaces the key, readers keep a value the origin has already withdrawn.',
      explain: `A cached value becomes false at a particular commit: the profile update, the price change, the role revoke. That commit has to delete the key or replace it with the new value. Until it does, hits return the old value, whatever TTL you set. The event and the key belong in the same sentence. When the role row commits, delete roles:account. If the event is only that someone might have edited something, you do not have an invalidation.

No later read is a substitute for that event. The next request may hit and never learn that it should have missed. A failed delete is a failed contract, not a log line you glance at, because the origin and the cache now disagree about authorization or about money. The failure is a write path with no delete, so correctness waits on the clock. The decision is to put the delete on the commit that made the cached value false, and to retry that delete when it fails.`,
      question:
        'A cache stores the role set for an account, and checks read that set. Which event must delete or replace the entry? What do readers see if the new roles commit and the cache delete never runs?',
      hints: [
        'The event is the commit that changes the roles, not the next login and not the TTL expiry.',
        'A hit after a revoke is an allow or a deny decided from the old set.',
      ],
      outline: [
        'The event is the commit that writes the new role set for the account.',
        'That commit has to delete or replace the cached role set.',
        'If the delete never runs, hits keep returning the old roles until the TTL.',
        'A revoked admin can still pass checks that read the cache.',
      ],
      solution: `The event is the commit of the role change. The handler that revokes an admin has to delete roles:account, or replace it with the new set, as part of that change. No other event knows this key is now a lie. The following request is not reliable. It may hit and never open the database.

If the commit succeeds and the delete never runs, the cache keeps the old set. Checks that hit still see the revoked admin as authorized. That lasts until the TTL, which means the policy you actually shipped is admin for up to the TTL after you thought you had revoked it. The failure is a role change that updates the origin only. The decision is to treat the delete as part of the revoke, to retry it if the cache call fails, and to prefer delete over replace unless you can stop an older set from being written last.`,
      rubric: [
        'The invalidation event is the role-change commit, not a timer and not a later read.',
        'A missed delete leaves the old roles, so a revoked admin can still be allowed by a cache hit.',
      ],
      myth: [
        'Invalidation means choosing a short TTL so stale values fix themselves soon.',
        'A TTL expires an entry on a clock. Invalidation is the delete or replace tied to the commit that made the value false.',
      ],
      context:
        'Permission and feature-flag caches are where a late delete is a security bug. The stale value still authorizes the request that hits it.',
      tradeoff:
        'Deleting on every role write adds a cache failure to an admin action. Skipping the delete makes revocation wait on the TTL, which is a window of extra privilege.',
      mistake: 'Updating the role row and waiting for the cache entry to miss on its own.',
      followUp: 'The commit succeeded and the cache delete timed out. What retries the delete, and what do checks return until it lands?',
      extension: 'A request also caches the decision allowed under a second key. Which keys have to die on the same revoke?',
      alternative:
        'Replacing the cached roles with the new set avoids a miss after the revoke. An older replacement that arrives late can put the revoked set back, which a delete does not do.',
    },
    evening: {
      title: 'The delete that landed too early',
      why: 'An invalidation that runs before the new value is visible races a reader. The reader can fill the old value after the only delete, and nothing schedules a second one.',
      explain: `Delete-then-write opens a gap. The writer removes the key, or a bus delivers the invalidation, while the origin still has the old row. A reader misses, reads that row, and fills the cache. The writer then commits the new row. The delete already succeeded. It does not apply to a key written after it ran. The cache sits on the old value until the TTL, and the origin is already new.

Commit-then-delete closes the gap where the fill happens before the commit, and it still loses if a reader read the old row and fills after the delete. The fill has to know the version it read and refuse to write an older version over a newer gap. The failure is an invalidation aimed at a value that was not stored yet. The decision is to invalidate after the new value is visible, and to make a late fill of an old read unable to win.`,
      question:
        'A writer deletes profile:42 and then commits the name Samira. A concurrent GET misses, reads the old name Sam, and fills the cache. The commit lands after that fill. What does the next GET return, and why does another delete not clean it up?',
      hints: [
        'The fill stored the name the origin returned at that moment, which was still Sam.',
        'The writer already used its delete, and that delete ran before this fill existed.',
      ],
      outline: [
        'The delete removes the key while the database still contains Sam.',
        'The GET misses, reads Sam, and writes Sam back into the cache.',
        'The commit then stores Samira in the database. The cache already holds Sam.',
        'The next GET hits Sam. The writer does not delete the key a second time.',
      ],
      solution: `The next GET returns Sam. The reader filled the cache after the only delete and before the commit. The origin read was true when it ran. It became false when Samira committed, and the cache has no reason to drop a key that was just written. Another delete does not clean it up because the writer does not issue one. Its invalidation already completed, successfully, against a key that was empty at the time.

Commit Samira first, then delete profile:42. That removes a fill that landed before the commit. It does not stop a GET that read Sam and fills after the delete. That fill has to carry the version it read and skip the write when a newer version is already in place. The failure is a delete that arrived before the value it was supposed to publish. The decision is commit, then delete, plus a fill that cannot put an older version back.`,
      rubric: [
        'The GET after the race hits Sam, the value filled between the early delete and the commit.',
        'The delete is already spent, so it does not run again after that fill.',
      ],
      myth: [
        'Deleting the key before you write the database means nobody can cache the old value.',
        'A reader can miss in the gap, read the old row, and fill it after the delete. The delete does not cover a key written later.',
      ],
      context:
        'This race is why a successful purge or delete still leaves a stale profile. The delete was real. It was ordered before the write it was meant to follow.',
      tradeoff:
        'Commit-then-delete shrinks the window and still leaves a stale key if the delete fails. Delete-then-commit looks tidy in a diagram and lets an old fill land with no further delete coming.',
      mistake: 'Publishing the invalidation at the start of the handler so the cache is clean while the database write is still in progress.',
      followUp: 'What does the filler compare so a read of Sam cannot overwrite a cache that already reflects Samira?',
      extension: 'A second invalidation is delivered after the commit, as a retry. How does that retry close the race the first delete lost?',
      alternative:
        'After the commit, write Samira into the cache with a version instead of only deleting. A late fill of Sam has to lose the version check. Forgetting the check puts Sam back.',
    },
  },
  stampedes: {
    morning: {
      title: 'One expiry, a herd of misses',
      why: 'A hot key hides its real rate until the TTL ends. The origin then sees the readers all at once, which is a load it was sized not to see.',
      explain: `While the key is present, almost every request hits and the origin sees a trickle. When the TTL reaches zero, the key is gone for everyone at the same moment. Each request misses, runs the origin work, and tries to fill. Nothing on the plain cache-aside path makes the second miss wait for the first. For a key serving thousands of reads a second, the origin suddenly sees thousands of the same query.

The failure is not the first miss. One miss is how a key gets filled. The failure is the herd behind it, often still arriving while the first query is in flight. A slow origin makes the hole longer, because the cache stays empty until a fill completes, and failed fills keep it empty. The decision is to treat a shared expiry as a shared load spike, and to size or shield the origin for that spike before you call the hit rate the capacity plan.`,
      question:
        'A homepage fragment lives under one key and is served 8,000 times a second. The origin query takes 200 ms. The key expires. What reaches the origin before the first fill completes, and why does the cache not absorb those requests?',
      hints: [
        'Until a fill completes, every lookup of that key is a miss and starts its own origin query.',
        'The waiters do not share one query unless you added a lock or a coalesce on top of cache-aside.',
      ],
      outline: [
        'Expiry removes the hot key for every request at the same moment.',
        'Each request misses and starts the 200 ms origin query.',
        'On the order of 1,600 of those queries are in flight before the first fill lands.',
        'The cache absorbs traffic again only after a fill, not during the empty window.',
      ],
      solution: `Before the first successful fill, every request that needs the fragment misses. At 8,000 a second, 200 ms is on the order of 1,600 origin queries, and more if the origin slows down and the hole gets longer. They are the same query. The cache does not absorb them because there is no value to hit, and cache-aside does not make the second caller wait on the first. Each handler does lookup, miss, origin, fill.

The database sees a rate the cache had been hiding. Timeouts follow, failed fills leave the key empty, and the herd continues. The failure is a miss storm on one hot key, caused by one shared expiry. The decision is to treat that spike as the origin load you have to survive, or to stop every waiter from running the query. A lock, an early refresh, or coalescing the waiters is extra machinery. None of it is present on this path, so none of it saves this second.`,
      rubric: [
        'The shared expiry is what lines the misses up, and the empty key is why the cache cannot absorb them.',
        'Origin load during the 200 ms is the request rate, on the order of 1,600 queries, not a single refresh.',
      ],
      myth: [
        'When a hot key expires, one request refreshes it and the rest keep hitting.',
        'The rest hit only if a value is still stored or something makes them wait. A plain miss sends each of them to the origin.',
      ],
      context:
        'The spike often lands on a round minute, when many keys were filled together and share a TTL. Hit rate dips for one beat and the database saturates.',
      tradeoff:
        'A short TTL keeps the fragment fresher and makes this storm more common. A long TTL makes it rare and makes each stale window longer.',
      mistake: 'Sizing the database for the hit-rate traffic and calling the expiry spike an unexplained traffic anomaly.',
      followUp: 'The fill fails and the key stays empty. What does the origin see on the next second of traffic?',
      extension: 'The same fragment is split into ten keys that expire together. What does the origin see then?',
      alternative:
        'Jittering TTLs spreads expiry when many keys would have fired together. One key that everyone shares still empties all at once.',
    },
    evening: {
      title: 'A lock around the single fill',
      why: 'Once a hot key is already empty, something has to decide which request is allowed to rebuild it. The choice is also a new way for every waiter to stall or to stampede again.',
      explain: `A lock in the shared cache lets one request across the fleet run the origin work. The holder sets a lock key if it is absent, renders, writes the real key, and deletes the lock. Everyone else waits briefly and reads the cache again. Early refresh reloads the value before the TTL while readers still hit the old one. Request coalescing shares one origin call among waiters inside a single process. They fail in different places. The lock fails with the holder. Early refresh fails when there is no old value left to serve. Coalescing fails when the waiters are not in the same process.

You still pick one for the key in front of you. A sale page that has already expired has nothing stale to hand out, so early refresh does not apply to this miss. Coalescing on each machine still admits one render per machine. A lock in Redis is what cuts the fleet down to one render. Its lifetime has to cover that render, and the holder has to finish. The decision is the lock. The failure you sign is a dead or slow holder, and a herd that returns when the lock expires.`,
      question:
        'A sale page is one cache key. The origin render takes 300 ms and starts failing if more than a few run at once. Twenty app servers share the cache. The key has already expired, so no stale page is left. Choose a lock, an early refresh, or request coalescing, and state the failure of the one you chose.',
      hints: [
        'Early refresh serves the previous value while one request reloads. This key has no previous value.',
        'Coalescing inside one process still leaves the other nineteen servers free to render.',
      ],
      outline: [
        'Choose a lock in the shared cache so only one server renders the sale page.',
        'The holder writes the page and releases the lock. Other requests wait and then read the cache.',
        'Early refresh does not apply, and per-process coalescing still allows about twenty renders.',
        'If the holder dies, or the lock expires before the render finishes, the waiters miss together.',
      ],
      solution: `Use a lock in Redis. One request sets lock:sale if absent, with a TTL longer than a healthy 300 ms render, runs the origin, writes the page, and deletes the lock. The other requests, on all twenty servers, wait and read the cache. Early refresh is the wrong tool on this miss because the key is already gone and there is no stale page to serve while you reload. Request coalescing inside each process would still start about twenty renders, one per server, and the origin starts failing at more than a few. The lock is what makes the fleet share a single fill.

The failure is the holder and the lock TTL. If the holder dies after it takes the lock and before it writes the page, everyone else waits and finds nothing. When the lock expires they miss together and the storm is back. If a sick render runs longer than the lock TTL, a second holder starts while the first is still going, and the origin sees a herd again. The decision is the shared lock, with a TTL that covers a healthy render, and the accepted failure is a hole the length of that TTL when the holder does not finish.`,
      rubric: [
        'The choice is a lock shared across the twenty servers, not early refresh and not per-process coalescing.',
        'The stated failure is a holder that dies or outruns the lock TTL, after which the waiters miss together.',
      ],
      myth: [
        'Taking a lock around a cache fill means a stampede can no longer happen.',
        'The lock stops the herd only while the holder is alive and the lock still covers the render. When it expires, the waiters miss together.',
      ],
      context:
        'Sale pages and homepage fragments are the usual key. The lock is a second hot key, and its TTL is now part of the user-visible latency when the holder is slow.',
      tradeoff:
        'A long lock TTL gives a slow render time to finish and makes a dead holder a long hole. A short one frees the hole quickly and lets a second render start too soon.',
      mistake: 'Locking inside one app process and assuming the other nineteen will see that lock.',
      followUp: 'The holder is still rendering when waiters reach their client timeout. What do those users see, and does the fill still land?',
      extension: 'How long do you set the lock TTL if a healthy render is 300 ms and a sick one can take 5 seconds?',
      alternative:
        'Request coalescing on each server is simpler and needs no lock key. With twenty servers it still admits about twenty origin renders, which is the overload you are trying to avoid.',
    },
  },
  'negative-caching': {
    morning: {
      title: 'How long to remember a miss',
      why: 'Remembering that a key is absent protects the origin from repeated probes. The same memory hides a row that appears while the marker is alive, so the duration is a product choice.',
      explain: `A negative entry stores absence. The origin said this key has no row, and the handler writes a marker so the next lookup answers missing without another read. Without the marker, a client scanning ids, or a retry loop on a 404, costs one origin read per attempt. With it, those attempts hit until the marker expires.

The TTL is how long you are willing to insist that the key is missing. A long one sheds probe load and hides a create that lands during the window. A short one limits the hide and lets more probes through. Zero is a choice: you remember nothing, and the origin takes every 404. There is no duration that is both instant for creates and closed for scans, unless the create path deletes the marker. The failure is a negative TTL copied from the positive cache, so a missing id is remembered as long as a real row. The decision is a short marker, and a create path that knows the marker exists.`,
      question:
        'Bots request profile ids that do not exist, and each miss reads the database. A person can create an id that just returned 404. Decide how long to remember the absence, and what a create of that id sees during the interval.',
      hints: [
        'The marker is a cache hit. Lookups that hit it do not read the origin, even after a row appears.',
        'The insert does not clear the marker unless the create path deletes it.',
      ],
      outline: [
        'On a confirmed origin miss, store an absent marker under the profile key.',
        'Give that marker a 5 second TTL, not the TTL of a real profile.',
        'Repeat probes hit the marker and stop reading the database for that id.',
        'A profile created during those 5 seconds stays invisible to readers that hit the marker.',
      ],
      solution: `Remember the absence for 5 seconds. A confirmed miss writes a marker on the profile key with that TTL. Further probes of the same id hit the marker and return 404 without the database. A bot hitting one missing id in a tight loop costs about one origin read per 5 seconds instead of one per attempt. Distinct ids still miss once each. The marker bounds repeats. It does not make a wide scan free.

A create of that id during the 5 seconds commits in the database and stays invisible to any reader that hits the marker. They receive 404 until the marker expires or the create deletes it. I will not reuse a 10 minute profile TTL for absence. Ten minutes of hiding a row that now exists is a broken read after create, which is an expensive way to save probe traffic. The failure of a long marker is a new profile that cannot be fetched. The decision is 5 seconds, and a create handler that deletes the marker if those 5 seconds are still too long for the person who just signed up.`,
      rubric: [
        'A concrete negative TTL is chosen and tied to cutting repeated origin reads of a missing id.',
        'A create during that TTL is still hidden from readers who hit the marker, unless the create deletes it.',
      ],
      myth: [
        'Caching a 404 is harmless because there is no row that can go stale.',
        'The absence goes stale the moment the row is created. A hit on the marker keeps reporting 404 after the origin would return the row.',
      ],
      context:
        'DNS negative caching is the same knob. A name that did not exist stays nonexistent to a resolver for the negative TTL, including after the record was added.',
      tradeoff:
        'Five seconds of negative cache cuts repeat probes and can hide a new id for five seconds. No negative cache shows creates on the next read and gives every probe a database query.',
      mistake: 'Storing the 404 under the same TTL you use for a profile that was found.',
      followUp: 'What does the create handler do to the marker so the following read can see the new row?',
      extension: 'A flood uses a different missing id on every request. Why does the marker fail to protect the database?',
      alternative:
        'Rate-limiting the 404 path, and not storing absence, protects the database and does not hide a create. A single client retrying one id still costs an origin read per retry.',
    },
    evening: {
      title: 'Created, then served a 404',
      why: 'A negative entry is shared. The person who just created a resource, and anyone else who fetches that id, will keep getting missing until the marker is deleted or it expires.',
      explain: `The marker was written by a lookup that happened before the row existed. Clients do that on purpose: they probe an id, or another tab loaded the page, or a prefetch asked for a project that was not there yet. The create writes the origin and returns 201. The following GET hits the marker and returns 404. The row is in the database. The cache is sure it is not.

Nothing about a successful insert updates the cache. The marker does not notice the commit. The 404 lasts the rest of the negative TTL, and it lasts for every caller that shares the cache, not only for the creator. The failure is a 201 followed by a cached absence. The decision is that the create deletes the marker after the commit, and that a delete failure is visible before you send the user into a GET that will hit.`,
      question:
        'A user gets 404 for /projects/42, then creates that project and is redirected to it. The redirect GET returns 404. The row exists. Walk the cache entry that causes this, and what the user cannot see.',
      hints: [
        'The first 404 stored an absence. The create committed the row and left that entry in place.',
        'The redirect is a hit on the marker. It does not read the new row.',
      ],
      outline: [
        'The first GET missed at the origin, stored an absent marker, and returned 404.',
        'The create committed project 42 and did not delete the marker.',
        'The redirect GET hit the marker and returned 404 again.',
        'The user cannot see the project they just created until the marker is removed or it expires.',
      ],
      solution: `The first GET was a real miss. The handler stored a negative entry for projects:42 and returned 404. The user then created the project. The insert committed and returned 201. The marker was still in the cache. The redirect GET looked up the key, hit the marker, and returned 404 without reading the row. The user cannot see the project they just created. Refresh repeats the hit. A teammate who fetches 42 cannot see it either, because the marker is shared.

The origin is up and the create did not roll back. The cache is answering a question the database would now answer with the project. Delete the negative key in the create path after the commit. If that delete fails, the 404 remains until the TTL, so retry the delete before the redirect, or the redirect has to bypass the cache once. The failure is a cached absence served after a successful create. The decision is to drop the marker as part of the create, and not to send the user to a GET that will hit it.`,
      rubric: [
        'The 404 after create is a hit on the negative entry written by the earlier miss.',
        'The user cannot see the new project, and other readers of that key cannot see it either, until the marker goes away.',
      ],
      myth: [
        'A 404 is not cached, so a resource is visible to the next GET after it is created.',
        'If the absence was stored, the next GET is a hit. The create changed the origin and did not change that hit.',
      ],
      context:
        'This shows up as a new document that will not open. The client probed the id before the insert, which is a normal way to reserve an id, and that probe poisoned the key.',
      tradeoff:
        'Deleting the marker on every create adds a cache call to the write and closes the window. Skipping it keeps the create simpler and hides the new id for the whole negative TTL.',
      mistake: 'Telling the user to refresh, which hits the same marker and returns 404 again.',
      followUp: 'The create committed and the cache delete timed out. What does the redirect GET return?',
      extension: 'An edge cache also stored the 404. How long can a teammate in another region fail to see the project?',
      alternative:
        'Not caching 404s removes this bug and puts every probe back on the origin. Caching them briefly and deleting the marker on create keeps most of the protection.',
    },
  },
  cdns: {
    morning: {
      title: 'Shared bytes and private bytes',
      why: 'A CDN stores a response near the user and will serve that copy to the next requester of the URL. That is safe only for bytes you are willing to share, for as long as the edge keeps them.',
      explain: `An edge can cache a response when the next user of that URL is allowed to receive the same bytes. Versioned scripts, public images, and a product page that is identical for every shopper are in that set. The URL of a versioned file is the invalidation: when the bytes change, the name changes, so a long max-age does not trap anyone on the old file.

Anything that depends on the caller has to stay dynamic. A cart, an account page, a negotiated price, and any body that includes one person's name or email will leak or lie if a neighbor gets the copy. Set-Cookie and a private header are signals, not decoration. Cache-Control public is a decision that the bytes are shared. Private or no-store is the decision that they are not. The failure is a personalized response marked public to save origin traffic. The decision is per route, written down as a header you can defend.`,
      question:
        'A CDN sits in front of the site. Which of these can it cache: a versioned /static/app.9f3a.js, a GET /products/42 page that is identical for every shopper, and a GET /account page that includes the user name and email? What has to stay dynamic?',
      hints: [
        'If two users can share the bytes, the edge can store one copy. If they cannot, it must not.',
        'The script URL changes when the file changes, so a long lifetime does not pin clients to old bytes.',
      ],
      outline: [
        'The versioned script is public and can be cached for a long max-age.',
        'The product page can be cached only while it is the same document for every shopper.',
        'The account page contains one user and has to stay dynamic.',
        'Mark the account page private or no-store so one user cannot be served another user page.',
      ],
      solution: `The script can be cached. The file name is the version, so the edge can keep app.9f3a.js for a long time. A new build uses a new name. Edges that still hold the old name are still correct for that URL. The product HTML can be cached if it really is identical for every shopper: no name, no cart count, no price that depends on the caller. Give it a public max-age you can live with, and accept that every edge can be stale for that long. The moment the document includes a per-user fragment, it is no longer one page.

The account page has to stay dynamic. It contains one user's name and email. A shared entry for /account would hand that page to the next requester. Send private or no-store, and do not put a response that varies by person into a public cache. Varying on the cookie instead stores a copy per user and fills the edge with private pages, which is the leak with extra steps. The failure is a fast account page that belongs to someone else. The decision is public and a max-age for the script and the shared product page, and no shared storage for /account.`,
      rubric: [
        'The versioned script and the identical product page are cacheable, and the account page is not.',
        'The account page stays dynamic because a shared copy would show one user the name and email of another.',
      ],
      myth: [
        'A CDN caches the site, and dynamic pages just come from a closer server.',
        'It caches responses you allowed it to reuse. A page that contains one user is a different response per user, and storing it publicly shares it.',
      ],
      context:
        'The bug report is a shopper who logged in and saw another customer. The edge served the bytes the Cache-Control header told it to keep.',
      tradeoff:
        'Caching the product HTML cuts origin traffic and serves a stale page at every edge until the TTL or a purge. Leaving it dynamic keeps each view fresh and makes every view an origin trip.',
      mistake: 'Sending Cache-Control public on a layout that later gained the signed-in user name in the header.',
      followUp: 'What do you send if the product document is shared but the cart count in the corner is not?',
      extension: 'Why can the versioned script use a year-long max-age when the product page cannot?',
      alternative:
        'A separate request for the private fragment lets the document stay cached at the edge. That fragment has to stay dynamic, and the page is wrong if the fragment request gets cached too.',
    },
    evening: {
      title: 'A purge the edge has not applied',
      why: 'A purge is a message to many edges, and users are already talking to those edges. Acceptance of the purge is not the same event as every user missing the old object.',
      explain: `You ask the CDN to drop a URL. Each edge drops it when that edge receives and applies the message. Some are slow, some miss the message, and a request already in flight can still be answered from the copy that edge holds. An edge that never gets the purge keeps serving the object until its own TTL. Users close to that edge are ahead of the purge. They see the old bytes, and a checkout that trusts the page can still sell what the page shows.

The API that accepted the purge often returns success when the job is queued, not when the last point of presence has confirmed the delete. Treating that status as global and immediate is how a recall gets closed while orders are still arriving. The failure is a purge used as a synchronous switch. The decision is to stop the action at the origin as well, and to use a new URL or a short TTL so an edge that missed the message heals without it.`,
      question:
        'You purge /products/42 after pulling a recalled SKU. The purge API returns 200. Support says some users still see the product, and one of them just ordered it. Why can users still see the old page, and what did the 200 not mean?',
      hints: [
        'A 200 from the purge API means the purge was accepted, not that every edge has dropped the object.',
        'An edge that has not applied the message keeps serving its copy until the message arrives or the TTL ends.',
      ],
      outline: [
        'The purge is fanout to many edges and is not one global lock.',
        'Edges that have not applied it still serve the cached product page.',
        'The API 200 means the job was accepted, not that every user will now miss.',
        'A user can order from an edge that still has the page, so the recall is not done.',
      ],
      solution: `Users still see the old page because their edge still has it. The purge has not reached that edge, it reached it after the response was served, or the message was lost and the edge will keep the object until the TTL. That is normal for a fleet of caches. The 200 means the CDN accepted the purge. It does not mean every edge has deleted /products/42, and it does not undo a response that already left. The user who ordered hit an edge serving the cached page and a checkout that still allowed the SKU.

Disable the SKU at the origin and in checkout so a stale page cannot complete the order. Keep the purge. It helps the edges that hear it. Use a short TTL, or a new URL for the replacement page, so an edge that missed the fanout stops selling the recall without waiting on a retry of the purge. The failure is reading the 200 as "no user can see this now." The decision is to treat the purge as best-effort fanout, and to make the origin reject the purchase even while some edges are behind.`,
      rubric: [
        'The stale page is an edge the purge has not updated, after the API already returned success.',
        'The 200 is acceptance of the purge, not confirmation that every user will miss the old object.',
      ],
      myth: [
        'A successful purge response means the object is gone for every user.',
        'It means the purge was accepted. Edges apply it when the message arrives, and some users are served before that happens.',
      ],
      context:
        'Takedowns and recalls are where the gap matters. A typo can wait for the TTL. A page that still sells a recalled SKU cannot.',
      tradeoff:
        'Waiting for every edge to acknowledge the purge is slower and still races a request already in flight. Returning as soon as the job is queued is faster and leaves a window where the old page is reachable.',
      mistake: 'Closing the recall because the purge API returned 200 and the origin logs looked quiet.',
      followUp: 'What does checkout have to check so a stale product page cannot place the order?',
      extension: 'How does publishing the recalled page under a new URL change the race, compared with purging the stable URL?',
      alternative:
        'A one-minute TTL and no purge bounds how long a missed message can keep the old page. Every edge then refetches the product once a minute, including edges that already had the new one.',
    },
  },
  pagination: {
    morning: {
      title: 'Inserts move an offset page',
      why: 'An offset is a count from the start of whatever the list is right now. Inserts at the head change what that count points at, so the next page repeats rows the user already saw.',
      explain: `Offset pagination asks for a limit after skipping a count. The count is applied to the list at the moment of the query, not to the list the user saw on the previous page. On a newest-first feed, inserts at the head push every older row down. The next offset lands inside the previous window, and the user sees those boundary rows again. Deletes shift the other way and skip rows. The page number feels stable. The rows are not.

A cursor asks for the next limit after a specific item, usually the sort key plus a unique id of the last row the user was actually shown. Inserts newer than that item are outside the range. The next page continues with rows older than the cursor, so the boundary row is not repeated. The cursor fails when the sort is not unique and two rows tie, because after this key is then ambiguous. The failure of offset under inserts is a repeated page boundary. The decision is a cursor on a stable order when the list is live, and an offset only when the list will not change during the walk or the jump is allowed to be wrong.`,
      question:
        'A feed is newest first, 20 posts a page. The user loads offset 0 and sees P1 through P20, P1 newest. Five posts newer than P1 are inserted. Compare what offset 20 returns with what a cursor on P20 returns.',
      hints: [
        'Offset 20 discards twenty rows of the list as it exists now, including the five new posts.',
        'A cursor on P20 asks for posts older than P20, so the new head is outside that page.',
      ],
      outline: [
        'The five inserts sit in front of P1, so P1 moves from position 1 to position 6.',
        'Offset 20 therefore starts at P16, and the user sees P16 through P20 again.',
        'The cursor on P20 returns the posts older than P20, starting at P21.',
        'Offset repeats five posts. The cursor does not, and the new posts stay at the head.',
      ],
      solution: `Offset 20 repeats posts. After the five inserts, the list is the new posts, then P1 onward. P1 is at position 6, so P16 is at position 21. Skipping 20 rows starts at P16. The user already saw P16, P17, P18, P19, and P20 on page 1, and page 2 leads with those five again before it reaches P21. The page index did not move. The rows did. That is the offset failure under inserts.

The cursor is P20, the last post this user was shown. The next page is the 20 posts older than P20, so it starts at P21. Nothing from page 1 is repeated. The five new posts are newer than P1, so they are not on this page. The user sees them by reloading the head, which is the behavior you want on a feed. The decision is to page with that cursor, ordered by the sort key and a unique id. Offset remains usable for a report that does not change while someone walks it. It is the wrong contract for a feed that inserts.`,
      rubric: [
        'Offset 20 starts at P16 and repeats P16 through P20 because the five inserts shifted the window.',
        'The cursor on P20 continues at P21, without the new head and without repeating page 1.',
      ],
      myth: [
        'Page 2 is the next twenty items after the twenty the user was just shown.',
        'With an offset, page 2 is whatever now sits at those positions. Inserts at the head change which items those positions are.',
      ],
      context:
        'Infinite scroll duplicates a block of posts when new content arrives at the top. The client asked for a position, and positions moved between the two requests.',
      tradeoff:
        'Cursors stay stable under inserts and make a jump to page 50 expensive or meaningless. Offsets jump easily and repeat or skip when the list is changing.',
      mistake: 'Caching each page number as if those offsets were a snapshot of the list.',
      followUp: 'What does the same offset 20 return if five posts are deleted from page 1 instead of inserted?',
      extension: 'Two posts share a timestamp. Why does the cursor need a unique id as well as that timestamp?',
      alternative:
        'Freezing the list into a snapshot at the first page makes offsets stable and forces you to invalidate that snapshot on every insert. The cursor does not need the snapshot.',
    },
    evening: {
      title: 'The order a shopper skipped',
      why: 'A duplicate and a gap are the same moving window. When a row ahead of the shopper disappears, an offset page slides backward and the next fetch jumps over an order they never saw.',
      explain: `Removing a row above the next page decreases every later position by one. The offset the client computed from the previous page now points one row further into the list. The row that slid into the end of the window they already fetched is never returned. They skip it. An insert above them does the opposite and repeats the boundary. You can tell the scheme from the symptom once you know which change happened above the user.

A cursor does not count, so a deletion above the cursor does not move the range after it. The next page still starts at the first row older than the last row they saw, which is the row the offset just jumped. The failure to show is a skipped order, and the scheme that causes it is offset. Blaming the cursor for a gap a page number produced sends you into the wrong fix.`,
      question:
        'Orders are paged 10 at a time, newest first, by order id, using an offset. Page 1 showed 210 down through 201. Order 207 is then cancelled and removed. The shopper opens page 2 and the first order on it is 199. Which order did they skip, and which scheme caused it?',
      hints: [
        'After 207 is removed, order 200 slides into the tenth slot, and offset 10 starts after that slot.',
        'A cursor on 201, the last order they actually saw, would start at orders older than 201.',
      ],
      outline: [
        'Page 1 showed 210 through 201. Removing 207 shifts every later order up by one.',
        'The new tenth order is 200, so offset 10 starts at 199.',
        'The shopper skips 200, an order that was not on page 1 and is not on page 2.',
        'Offset caused the skip. A cursor parked on 201 would have returned 200.',
      ],
      solution: `They skipped order 200. Page 1 had shown 210 down through 201, including 207. After 207 is removed, the list starts 210, 209, 208, 206, 205, 204, 203, 202, 201, 200, and then 199. Offset 10 skips the first ten of those and starts at 199. The shopper already saw everything above 200 except the cancelled 207. They were never shown 200. The next page does not contain it either. One deletion above the boundary skipped one order.

Offset caused it. The client asked for a count, and the count moved when 207 disappeared. A cursor on 201, the last order they actually saw, asks for orders older than 201 and returns 200 first. The same deletion does not create a gap on that path. The failure is a shopper who never meets order 200. The decision is to name offset as the cause and to page this list with the cursor if a missing order is a support ticket you will not accept.`,
      rubric: [
        'The skipped item is order 200, which slid into the offset window after 207 was removed.',
        'The scheme named as the cause is offset pagination, not the cursor.',
      ],
      myth: [
        'A missing row in the middle of a list cannot change which rows a later page returns.',
        'Offset counts positions in the list as it is now. Deleting a row above the next page moves every later position, including the one the offset jumps over.',
      ],
      context:
        'Order history is where a skip becomes a missing purchase. The shopper is sure they placed it. Page 2 started one row too far in.',
      tradeoff:
        'Staying on offsets keeps jump-to-page and will skip or repeat whenever orders are cancelled during the walk. A cursor stops the skip and cannot answer "take me to page 40" without counting.',
      mistake: 'Telling the shopper to refresh page 2, which runs the same offset against the same shifted list.',
      followUp: 'If two orders on page 1 had been removed instead of one, which orders would offset 10 skip?',
      extension: 'The same shopper inserted a brand-new order while sitting on page 1. What does offset 10 show them at the top of page 2?',
      alternative:
        'Keyset pagination on order id is the cursor. It returns 200 after 201. It costs you direct jumps to an arbitrary page number, which this history list can live without.',
    },
  },
  'n-plus-one': {
    morning: {
      title: 'A query inside the loop',
      why: 'One HTTP request can hide a query per row. The access log stays calm, the database log shows a staircase, and an index on each small lookup does not merge them.',
      explain: `An N+1 is a loop of queries inside a single request. The handler loads N parent rows in one query, then for each row loads a related row in its own query. The loop is often not in the route. It is in a template that touches post.author, or in a helper that looks harmless because it fetches just this one record. The user made one call. The database received 1 plus N.

Each of those queries can be a primary-key read and the request can still die at a few hundred rows, because the round trips dominate. A cache inside the helper turns the loop into N cache hops. That can hide the database and keeps the shape. A cold cache is N misses and N origin reads in a burst. The failure is the fan-out, not a bad plan on any one statement. The decision is to count queries for one request id and treat the staircase as the bug.`,
      question:
        'GET /feed returns 50 posts. The handler loads those posts in one query, then calls loadAuthor for each post, and each call queries the database. Where is the loop, and how many origin queries can one feed request make?',
      hints: [
        'Count queries per request, not queries per helper. The helper is invoked from inside the loop.',
        'A cache get inside loadAuthor moves the loop. It does not remove the per-post trip.',
      ],
      outline: [
        'The list query is one round trip that returns the 50 posts.',
        'The loop is loadAuthor, once per post, under that single GET.',
        'With no memoization the request runs 51 origin queries when each author misses.',
        'Shared author ids still query again unless this request keeps a map.',
      ],
      solution: `The loop is loadAuthor, called once per post after the list query. The access log shows one GET. The database log shows a burst of the same author lookup tied to that request. The list query is the 1. The author queries are the N. Fifty posts and no map means 51 round trips when every lookup misses. Ten posts can share an author and it is still 51 if the helper does not remember what this request already loaded.

An index makes each author read fast and leaves the fifty trips in place. A cache inside loadAuthor makes a warm feed into fifty cache gets plus the list query. That is still an N+1, now against the cache, and a cold start is fifty misses. The failure is the per-post query hiding under one route. The decision is to find it by counting statements for one request, and not to declare it fixed because each statement is cheap.`,
      rubric: [
        'The loop is the per-post author query under a single GET, and the count is 1 plus N, 51 when each misses.',
        'A cache inside the helper is described as the same loop against a different store.',
      ],
      myth: [
        'N+1 is fine when every query in the loop is a primary-key read.',
        'Fifty fast queries are still fifty round trips lined up inside one user request. The index does not merge them into one.',
      ],
      context:
        'ORMs produce this when a template reads an association that was not prefetched. The route function can be a single call that returns the posts.',
      tradeoff:
        'Lazy loading keeps the list query small when the caller does not need authors, and it explodes when the template does. Loading authors up front always pays for them, including for callers that never render them.',
      mistake: 'Wrapping loadAuthor in a cache get and marking the feed endpoint fixed.',
      followUp: 'How do you attach the author queries to this GET if the helper opens its own span?',
      extension: 'What does this request do to the database when the feed grows from 50 posts to 500?',
      alternative:
        'A join in the list query removes the loop and can repeat author columns on every post row. It is still one round trip, at the cost of a wider result.',
    },
    evening: {
      title: 'Three queries, and the large one',
      why: 'Replacing a loop with a fixed handful of queries removes the round trips and concentrates the worst order into one statement. That statement is the new cost.',
      explain: `Collect the ids and load each relation once. For an order screen that is the order, then every line item for that order id, then every product for the distinct product ids on those lines. The handler joins them in memory with a map. The request makes the same number of origin queries for 4 lines or for 400. The bound is the number of relations, not the number of rows.

The bound costs its largest input. One of those queries carries an IN list and a result as wide as the biggest order you will render. The database plans and ships that result in one go. The application holds it before the first byte of the page. Callers that did not need products still pay for the product query if you always run the three. The failure you traded away is a thousand round trips. The failure you accepted is one query that is too big, unless the page is capped or the big read is chunked.`,
      question:
        'The order page runs one query for the order, then one query per line item, then one query per product. Replace the loop with a bound number of queries. What is the bound, and what does it cost on a 2,000-line order?',
      hints: [
        'Load all line items for the order id in one query, then all products for those distinct ids in one query.',
        'Three round trips can still move every line and every product of the largest order in a single result.',
      ],
      outline: [
        'One query loads the order. One query loads every line item for that order id.',
        'One query loads the products for the distinct product ids on those lines.',
        'The bound is three origin queries, and it does not grow with the line count.',
        'The 2,000-line order makes the product query and the in-memory map large enough to be the outage.',
      ],
      solution: `Stop querying inside the loop. Load the order by id. Load the line items with one query on order id. Collect the distinct product ids and load those products with one query. Build a map from product id to product and attach them in memory. The request makes three origin queries whether the order has 4 lines or 2,000. That is the bound. The N+1 is gone. A cache is optional after this shape exists. It is not a substitute for it.

The bound costs the worst order. Two thousand lines put up to two thousand ids into the product query and return every column you selected, in one result, before the page can render. That statement can be slow, memory-heavy on both sides, and a different plan from the twelve-line order you tested. The failure you removed is one round trip per line. The failure you accepted is a single uncapped read the size of a wholesale order. Cap the page, select only the columns the screen uses, or chunk the product ids so the bound becomes two plus the number of chunks and each chunk stays small. Three queries is the right shape only while the third query is one the database can answer.`,
      rubric: [
        'The loop is replaced by three queries: order, line items, and products by id. The count does not track the line count.',
        'The cost named is the large product read and the memory it takes on a 2,000-line order.',
      ],
      myth: [
        'Batching the lookups means the request is now one small query.',
        'It is a small number of queries. One of them still has to read every line and every product the page will show.',
      ],
      context:
        'Admin screens and exports are where the batched query becomes the incident. The test order had a dozen lines. The production order is a wholesale cart.',
      tradeoff:
        'Three queries remove the round trips and tie the worst case to the biggest order. The old loop spreads that cost into a timeout made of many small queries, one after another.',
      mistake: 'Building an IN list of every line with no page cap and calling the endpoint fixed.',
      followUp: 'What is the bound if each product also needs its primary image loaded the same way?',
      extension: 'The order page shows 50 lines at a time. How do you keep the product query inside that cap?',
      alternative:
        'One join from order to items to products is a single query and repeats the order columns on every line. It still needs a limit when 2,000 lines come back.',
    },
  },
  'latency-budget': {
    morning: {
      title: 'A number for each hop',
      why: 'The user waits on the sum. A single budget for the API lets the network, the cache, and the origin each spend it, and the page is late before the last hop starts.',
      explain: `A latency budget is the time a visible action may take, split across the hops that action actually waits on. Network, cache, and origin do not share one number. The network is paid on a hit and on a miss, because the user is not inside the data center. The cache lookup is a small slice. The origin slice exists only on the miss, and it is whatever remains after the hops you cannot skip, with something left for jitter.

Write the split from the path you measured, not from a wish. A budget that describes the hit, and a page that sometimes misses, will break on the miss. A hop that exceeds its slice has to get faster or leave the request. It does not borrow the next hop's time, and a retry does not fit in a slice the first attempt already used. The failure is assigning the origin the whole user budget and discovering the network already spent part of it. The decision is a number per hop, including the miss, and a rule to stop waiting when a hop exceeds its number.`,
      question:
        'A product page must be on screen within 250 ms. On a miss the path pays about 70 ms of network, a cache lookup, the origin, and a little time to write the response. Split the 250 ms across network, cache, and origin. What may the origin take?',
      hints: [
        'The network time is paid even when the cache and the origin are instant.',
        'Leave a margin. Do not hand the origin whatever is left after pretending the other hops are free.',
      ],
      outline: [
        'Give the network its measured 70 ms. That slice is not optional on a miss.',
        'Give the cache lookup 10 ms. A hit returns inside that slice and skips the origin.',
        'Hold back 30 ms for jitter and for writing the response.',
        'The origin is allowed the remaining 140 ms, and a miss does not get a second try inside the 250 ms.',
      ],
      solution: `Give the network 70 ms. It is on the miss and on the hit. Give the cache lookup 10 ms. A hit should be done well inside that and should not run the origin. Hold 30 ms for jitter and for assembling the response, which is otherwise pretended to be free. That leaves 140 ms for the origin: 250 minus 70 minus 10 minus 30. If the query is still running at 140 ms, the page is already late even when every other hop was perfect.

The hit path spends about 80 ms and does not get to reassign the 140. Do not publish the hit time as the promise. The promise you have to defend is the miss, because a miss is when the cache did not remove the origin. The failure is giving the database the full 250 ms and then watching the network use 70 of them before the query starts. The decision is the split: 70 network, 10 cache, 140 origin, 30 held back. A hop that needs more than its number has to shrink or leave the path.`,
      rubric: [
        'The 250 ms is split so the origin allowance is what remains after network, cache, and a margin, and that allowance is 140 ms.',
        'The miss path is the budget being defended, with network included, rather than the cache-hit time alone.',
      ],
      myth: [
        'The latency budget is the time the database is allowed to use for the query.',
        'The user waits on the sum. The database slice is what remains after network and cache, not the whole 250 ms.',
      ],
      context:
        'The client team and the database team otherwise spend the same 250 ms twice. The shopper feels the sum, including a network neither of them owns.',
      tradeoff:
        'A tight origin slice protects the page and fails more requests when the database blips. A loose slice keeps those requests and makes the page late, which the shopper already experiences as a failure.',
      mistake: 'Measuring the budget from inside the data center and calling the network a problem for another team.',
      followUp: 'What is the hit-path total under this split, and why is that number not the promise?',
      extension: 'The origin already used its 140 ms and timed out. Where would a retry fit inside the 250 ms?',
      alternative:
        'Caching the rendered page at the edge removes the origin from the hit path. The miss path still has to add up to 250 ms. The budget does not get larger.',
    },
    evening: {
      title: 'Drop the hop that broke the sum',
      why: 'When the measured hops add up past the budget, one of them has to leave the request or the promise changes. Cutting a few milliseconds from every hop does not fix the hop that caused the overage.',
      explain: `Add the hops before you pick. The one to cut is a hop the page can render without, or a hop whose result you can skip, degrade, or serve from a copy you already have. The network stays. The user is on the far side of it. A required read of the product stays if the screen is a product page. An optional enrichment is the usual cut: reviews, recommendations, a secondary image. Dropping it has to be large enough that the new sum fits. A 30 ms decoration does not repair a 100 ms overage.

Look at what the user gets after the cut, not only at the new total. Serving a stale product also shrinks the sum, and it makes the thing they opened the page for wrong. Timing out the database and returning an error meets a deadline by failing the action. The failure is optimizing every hop a little, or cutting the hop the page cannot lose. The decision is to remove the optional call whose removal brings the sum back under the budget.`,
      question:
        'The product page budget is 250 ms. A trace shows 60 ms of network, 15 ms of cache, 140 ms of origin, and 90 ms in a review-summary call the page can render without. The sum is 305 ms. Which hop do you cut, and what does the user get?',
      hints: [
        'Add the hops. The review call is large enough that removing it brings the total under 250 ms.',
        'The origin is the product. Cutting it leaves the page without the thing the shopper opened.',
      ],
      outline: [
        'The measured sum is 305 ms against a 250 ms budget.',
        'Cut the 90 ms review-summary call. The remaining path is 215 ms.',
        'The user gets the product page without a live review summary.',
        'Keep the origin. The network and the cache lookup are not the overage.',
      ],
      solution: `Cut the review-summary hop. The parts you keep are 60 ms of network, 15 ms of cache, and 140 ms of origin, which is 215 ms and fits under 250 with a thin margin. The shopper gets the product page without a live review summary. A static line, or no reviews, is the degraded page. Do not spend the margin on a retry of the origin. There is not a second 140 ms hiding in the 250.

The origin stays, because without it you do not have the product the page is for. The cache lookup is 15 ms and is not the overage. The network is not yours to delete. The failure is a sum that no longer fits, caused by a 90 ms call the screen does not require. The decision is to drop that call so the product path fits, and to put reviews on a later request if the product still wants them after the page is up.`,
      rubric: [
        'The review-summary hop is the one removed, and the remaining 215 ms fits inside 250 ms.',
        'The user still gets the product from the origin, without a live review summary.',
      ],
      myth: [
        'When a page is over budget, make every hop a little faster and the sum will fit.',
        'The overage here is one 90 ms call. Trimming the cache or the network cannot remove those 90 ms. The review call can leave the path.',
      ],
      context:
        'Product pages collect extra calls until the trace no longer matches the number that was promised. The extra call is the one that can leave.',
      tradeoff:
        'Dropping live reviews meets the budget and ships a thinner page. Keeping them preserves the social proof and makes the product page late by the amount you just measured.',
      mistake: 'Adding a retry of the origin inside the same 250 ms after the first attempt already used 140.',
      followUp: 'Where do reviews load if the product page no longer waits for them?',
      extension: 'The review call is only 20 ms and the origin has grown to 220 ms. Which hop do you cut then?',
      alternative:
        'Serving a stale cached product and skipping the 140 ms origin also fits under 250, and the shopper is looking at an old product while you could have kept it current by dropping reviews.',
    },
  },
  'cache-failure': {
    morning: {
      title: 'Refuse the request when Redis is down',
      why: 'A down cache is an error, not a miss. Treating every error as a miss sends the full request rate to an origin that was sized for the hit rate, and refusing the request makes the cache itself the outage.',
      explain: `When the cache stops answering, the lookup does not return "absent." It returns an error. Fail-open treats that error as a miss and calls the origin. Users keep getting answers for as long as the origin survives, and the origin receives the traffic the cache had been absorbing, including every hot key. Fail-closed refuses the request. Users see errors, and the origin stays near the load it had besides those reads.

The two failures are different outages. Fail-open fails by taking down the database and then everyone. Fail-closed fails immediately, while the database may still look idle, and it can be the right outage when the database cannot serve the uncached rate. A permission check has a third trap: treating the cache error as allow is not fail-open. Fail-open for a role cache means read the origin, not skip the check. The failure is one policy for every key. The decision is per path, from what the origin can absorb and from what a wrong answer would do.`,
      question:
        'The cache of rendered product pages stops accepting connections. The database is sized for the usual miss rate, about one tenth of reads, and it cannot serve every page view. Choose fail-open or fail-closed. What does the shopper see, and what would the origin see under the other choice?',
      hints: [
        'Fail-open turns each cache error into an origin read, so the database sees the full page-view rate.',
        'Fail-closed answers the shopper with an error and does not replace the cache with the database.',
      ],
      outline: [
        'Choose fail-closed. The database cannot take a full miss rate.',
        'The shopper sees an error, such as 503, while the cache is down.',
        'The origin stays near its background load instead of taking every page view.',
        'Fail-open would send the full read rate to the database and take that down too.',
      ],
      solution: `Fail closed. The shopper sees a 503, or a static fallback that does not query the database. The product database stays at whatever load it has besides these cached reads. You are choosing a user-visible outage caused by the cache, on purpose, while the origin is still up. That looks wrong on a dashboard that only watches the database. It is the smaller outage given the sizing in the question.

Fail-open would treat every cache error as a miss and send every page view to the database. The database was built for about one tenth of that rate, so the queue grows, queries time out, and the shopper then sees database errors as well. The cache incident becomes a database incident and lasts longer. The failure of the choice you are making is angry shoppers and idle-looking capacity. The decision is fail-closed until the cache returns, because this origin cannot be the backup for a 100 percent miss rate.`,
      rubric: [
        'The choice is fail-closed, so the shopper gets an error and the database is not asked to serve every page view.',
        'Fail-open is described as sending the full read rate to an origin sized for the miss rate, which then falls over.',
      ],
      myth: [
        'If the cache is down, requests should always fall through to the database so users see no errors.',
        'Falling through is safe only when the database can take the full rate. Otherwise the cache outage becomes a database outage.',
      ],
      context:
        'The cache was capacity, not only a latency trick. Removing it does not reveal a database of the same size waiting behind it. It reveals the size you actually bought.',
      tradeoff:
        'Fail-closed protects the database and makes Redis a hard dependency of the product page. Fail-open keeps pages up through a cache blip and can destroy the origin if the blip lasts.',
      mistake: 'Catching the Redis error, calling the origin for every request, and calling that resilience.',
      followUp: 'A role cache returns an error. Why is responding allow a different bug from fail-open?',
      extension: 'The cache stays down for ten minutes. What do you want the database graphs to show under this choice?',
      alternative:
        'Fail-open with a hard cap on concurrent origin fills serves some shoppers and sheds the rest. It needs the cap to be real. An unlimited fall-through is the option this sizing cannot survive.',
    },
    evening: {
      title: 'The origin load when nothing hits',
      why: 'The usual miss rate is the wrong estimate for a dead cache. Every request misses at once, including the keys that were hot, and the origin has to be judged against that number.',
      explain: `Start from the request rate, not from yesterday's miss graph. If you fail open, each cache error becomes an origin call. A route at 10,000 requests a second becomes about 10,000 origin queries a second, one per request, until something sheds or times out. The 90 percent that used to hit is not a remainder you still get to skip. Those keys miss too.

Turn the rate into concurrency before you decide it will be fine. Concurrent work is roughly rate times query time. A pool can serve only pool size divided by query time. When arrival is several times that service rate, the queue grows every second, waits exceed the client timeout, and retries add arrivals on top of the 10,000. The failure is estimating the origin at its normal miss rate during a total miss. The decision is to publish the full-rate number, the concurrency, and the fact that the pool cannot drain it.`,
      question:
        'The home-feed cache dies and you fail open. The feed is 10,000 requests a second, normally 90 percent hits, so the origin usually sees 1,000 queries a second. Each miss runs one 20 ms query. The pool has 50 connections. Estimate the origin load when every request misses at once.',
      hints: [
        'A dead cache does not keep the old hit rate. Every one of the 10,000 requests becomes a query.',
        'Concurrency is about rate times query time. Compare that with 50 connections before you call the database fine.',
      ],
      outline: [
        'Origin load jumps from about 1,000 queries a second to about 10,000.',
        'That is 10 times the usual load, not a small step up from the miss rate.',
        'The queries need about 200 in flight, and 50 connections can serve about 2,500 a second.',
        'The queue grows by thousands of requests a second, then timeouts and retries make the offered load worse.',
      ],
      solution: `The origin sees about 10,000 queries a second, one per feed request. The usual 1,000 was the 10 percent miss rate. That rate is gone. Every key misses, including the hot ones, so the load is 10 times normal, not 1,000 plus a bump. At 20 ms a query, 10,000 a second wants about 200 queries in flight if nobody is waiting. The pool has 50 connections and can complete about 2,500 queries a second. Arrival exceeds that by about 7,500 a second, so the queue grows immediately.

Within a second, thousands of requests are waiting. They pass the latency budget, clients time out, and retries arrive on top of the original 10,000. The database does not run a bit hot and recover. It falls over, and the fail-open plan fails with it. The failure is a total miss estimated as the ordinary miss rate. The decision is to treat 10,000 queries a second and about 200 of needed concurrency against a pool of 50 as an overload, and to shed before the queue is the outage.`,
      rubric: [
        'The estimate is about 10,000 origin queries a second, roughly 10 times the usual 1,000, because every request misses.',
        'The pool of 50 cannot hold the concurrency or the rate, so the queue grows and retries make the load worse.',
      ],
      myth: [
        'If the cache dies, the origin sees a modest increase around its normal miss rate.',
        'Fail-open turns cache errors into misses. The requests that used to hit miss too, so the origin sees the full request rate.',
      ],
      context:
        'This is the graph where database connections peg, feed latency dies, and someone says the cache was only a performance optimization. It was also the capacity.',
      tradeoff:
        'Shedding at the pool protects the database and returns errors to most of the 10,000. Letting the queue grow tries to serve everyone and then serves no one, including the writes sharing that database.',
      mistake: 'Paging on hit rate alone and leaving the database pool at the size the 90 percent hit rate had allowed.',
      followUp: 'If clients retry once on timeout, what can the offered query rate become above 10,000?',
      extension: 'What pool size would you need to drain 10,000 queries a second at 20 ms without a growing queue?',
      alternative:
        'Fail-closed on this feed keeps the origin near 1,000 queries a second, or lower, and every shopper sees an error immediately. That is a smaller database incident and a larger product one.',
    },
  },
};
