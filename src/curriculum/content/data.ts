import type { LessonPair } from './publish';

export const dataLessons: Record<string, LessonPair> = {
  'relational-modeling': {
    morning: {
      title: 'Tables for a seat sale',
      why: 'A sold seat is a workflow, not a flag on one row. If the hold, the payment, and the ticket are not separate rows with keys, the database cannot refuse a second buyer.',
      explain: `A venue sells seats. The seats table is the catalog: a primary key, plus a unique pair of venue and label so two rows cannot name the same chair. A claim is a different row, inserted when a buyer holds a seat and updated when they pay. Payments are a third table. Each payment has a foreign key to one claim, and that foreign key is unique, so a claim is paid once. The workflow is which row you insert, not a status string the handler interprets alone.

The constraint that makes the hold real is a partial unique index on claim seat id where the state is held or sold. Released claims stay in the table for history and drop out of the index. A second live claim for that seat fails with unique_violation. A check constraint keeps the payment amount above zero. The handler still chooses what to insert. The keys are what make an illegal sale an error instead of a second row.`,
      question:
        'Model a seat sale as tables, keys, and constraints. A buyer holds a seat, pays once, and that hold becomes a sold seat. Released holds must remain queryable. Two buyers must not both hold or buy the same seat.',
      hints: [
        'Put the catalog, the hold, and the payment in different tables, and connect them with foreign keys.',
        'A unique index that only covers live claims leaves released rows in place and still blocks a second sale.',
      ],
      outline: [
        'Seats are a catalog with a primary key and a unique venue-plus-label.',
        'Claims reference a seat. A partial unique index covers only held and sold claims.',
        'Payments reference one claim, and that foreign key is unique.',
        'A check constraint rejects a payment amount that is not positive.',
      ],
      solution: `Use three tables. seats has id as primary key and a unique constraint on (venue_id, label). claims has id as primary key, seat_id as a foreign key to seats, buyer_id, a state restricted by a check to held, sold, or released, and expires_at. A partial unique index on claims(seat_id) where state is held or sold allows many released rows and refuses a second live claim. payments has id as primary key, claim_id as a unique foreign key to claims, and amount_cents with a check that it is greater than zero.

The sale is two steps. Insert a claim in state held. The partial index is the hold. When the buyer pays, one transaction inserts the payment and updates that claim from held to sold, with the update qualified by state = held so an expired claim is not paid. Releasing a claim sets state to released, which removes it from the unique index and frees the seat. A status column on seats is not required. The live claim is the occupancy. If the unique index is missing, two inserts both succeed and the seat is sold twice.`,
      rubric: [
        'The sale is modeled as seats, claims, and payments, with foreign keys between them.',
        'A partial unique index prevents two live claims for one seat while released claims remain stored.',
      ],
      myth: [
        'A status column on the seat is the constraint that stops a double sale.',
        'A status value is whatever the last writer stored. A unique index on live claims is what rejects the second writer.',
      ],
      context:
        'Ticketing, inventory reservations, and "one active booking" all have the same shape: a row that appears for the attempt, a unique index for the conflict, and another row for the money.',
      tradeoff: 'Keeping released claims makes disputes easy to audit and makes the claims table grow. Deleting them keeps the table small and throws away the proof that a hold existed.',
      mistake: 'Updating a status column on seats from the application and treating that column as proof the seat is taken.',
      followUp: 'What does the payment transaction do if the claim was already moved to released?',
      extension: 'Where would you put a ticket row if a sold claim still needs a delivery address that payments should not store?',
      alternative: 'A single seat_state row per seat, updated in place, enforces occupancy with the primary key. It makes history a separate audit table you have to write on purpose.',
    },
    evening: {
      title: 'One active plan, checked in the handler',
      why: 'The subscription service already refuses a second plan. It does the refusal in a query the database will not repeat. Two app servers can both pass it.',
      explain: `The handler loads the account, counts subscriptions with status active, and inserts a new row only when the count is zero. That rule lives in application code. PostgreSQL runs the count and the insert as separate statements. Under read committed, both can see zero and both can insert. The unique primary key on subscription id does not care that the account id is the same.

The database should enforce the rule the handler is already trying to enforce. A partial unique index on account id where status is active makes the second insert fail with unique_violation, including an insert from a script that never called the handler. The handler can stay, so the API returns a clear error. It is no longer the thing that makes the rule true. A check constraint is the wrong tool here: the conflict is across rows, not inside one column.`,
      question:
        'The billing handler runs a count of active subscriptions for the account and inserts one only when the count is zero. Two signups for the same account both get a plan. Which rule is the application enforcing, and what should the database enforce instead?',
      hints: [
        'The count and the insert are not one atomic predicate unless a constraint makes them so.',
        'The rule is "one active row per account," which is a partial unique index, not a check on a single column.',
      ],
      outline: [
        'The handler enforces one active subscription per account with a read, then an insert.',
        'Two transactions can both count zero and both insert.',
        'A partial unique index on account id where status is active rejects the second insert.',
        'The handler may catch unique_violation. It is not the enforcement.',
      ],
      solution: `The application is enforcing "an account has at most one subscription in status active." It does that with a select count and a later insert. Those are two statements. Two billing servers, or two requests on one server, can both read zero active rows before either insert commits. Both inserts succeed. The primary key on each new subscription id does not express the business rule.

Put the rule in PostgreSQL: a unique index on subscriptions(account_id) where status = 'active'. The second insert fails, whether it came from the handler or from a console. Keep the count in the handler if you want a friendly response, and catch unique_violation for the race. Do not add a check constraint on status alone. That only limits the allowed words. It does not limit how many active rows an account has. When a subscription ends, set status to ended so the row leaves the partial index and the account can subscribe again.`,
      rubric: [
        'The missing enforcement is one active subscription per account, currently done by a count in the handler.',
        'The database fix is a partial unique index, and the racy count is not treated as sufficient.',
      ],
      myth: [
        'If every writer goes through the handler, a check before insert is as strong as a constraint.',
        'Two handlers can both pass the check. A constraint is evaluated for every insert, including ones that skip the handler.',
      ],
      context:
        'The same hole shows up as "one open cart per shopper" and "one pending email change per user." The handler reads, the database writes, and the gap between them is the bug.',
      tradeoff: 'A partial unique index rejects the race and adds an index the writer must maintain. Leaving the check in the handler avoids that write cost and allows double plans.',
      mistake: 'Wrapping the existing count and insert in a transaction and expecting read committed to make the count stable.',
      followUp: 'What should the API return when the insert hits unique_violation because a plan already exists?',
      extension: 'How would you allow one active plan per account per product, rather than one plan for the whole account?',
      alternative: 'Serializing all subscription writes for one account with a row lock on the account stops the race and blocks unrelated account updates behind a signup.',
    },
  },
  normalization: {
    morning: {
      title: 'The email stored on every order',
      why: 'An order row that also stores the customer email looks convenient until a customer changes address. Some orders change with it and some do not, and the table now holds two facts.',
      explain: `Take orders with order_id as the primary key, plus customer_id, customer_email, and customer_city. The email does not depend on the order. It depends on the customer. The customer id depends on the order. That chain, order to customer to email, is a transitive dependency. Third normal form says a non-key column should depend on the key, not on another non-key column. This table fails that test.

What the normal form protects you from is an update anomaly, and the delete anomaly that rides with it. Change a customer's email and you must update every order row that copied it. Any row you miss keeps the old email, so the database disagrees with itself about one person. Delete that customer's last order and, if you had no customer table, you delete the only copy of the email. The failure is not "the table is wide." The failure is one fact stored in many places. The decision is a customers table that owns email and city, and an orders.customer_id foreign key.`,
      question:
        'orders has order_id as primary key, plus customer_id, customer_email, and customer_city. Say what third normal form protects you from here, and what goes wrong if you change one customer email in place.',
      hints: [
        'Ask which columns depend on customer_id rather than on order_id.',
        'The damage shows up when one customer has two orders and you update only one of them.',
      ],
      outline: [
        'customer_email depends on customer_id, which depends on the order.',
        'That transitive dependency violates third normal form.',
        'Third normal form protects you from an update anomaly on the copied email.',
        'A customers table owns the email. Orders keep a foreign key.',
      ],
      solution: `Third normal form protects you from update and delete anomalies caused by a transitive dependency. In this table, order_id determines customer_id, and customer_id determines customer_email and customer_city. The email is a fact about the customer, stored once per order. The normal form is the rule that moves that fact out.

If you change the email on one order and leave the other orders, the table now has two emails for one customer_id. Nothing in the schema is false in a way a check constraint can see: each row is internally fine, and the rows disagree. If you delete the last order, the email disappears with it. Put email and city on customers, with customer_id as primary key. Keep customer_id on orders as a foreign key. Then an email change is one update, and deleting an order does not delete the customer. You have not made the order "cleaner" for its own sake. You have made one fact have one home.`,
      rubric: [
        'Third normal form is tied to the transitive dependency from order to customer to email.',
        'The failure named is an update anomaly: one customer ends up with two emails, or the email is lost with the last order.',
      ],
      myth: [
        'Normal form means making tables narrower so queries run faster.',
        'Third normal form removes a second home for a fact. Speed is a separate decision you make later, on purpose, when you copy a value back.',
      ],
      context:
        'This is the shape of a checkout table that "helpfully" copies the shipping address, the loyalty tier, and the email onto every line. Support then updates one line.',
      tradeoff: 'A customer table makes an email change one write and makes the order list join to customers. Copying the email onto orders avoids the join and creates the anomaly.',
      mistake: 'Splitting the table and then updating email in both places from the handler, so the second home remains.',
      followUp: 'Which anomaly appears if you delete the last order and email lived only on that row?',
      extension: 'How does the dependency change if the email on the order is the address you shipped to, and the customer may edit their profile later?',
      alternative: 'A generated view that joins orders to customers gives readers one email without storing it twice. Writers still update customers only. The view is not a second stored fact.',
    },
    evening: {
      title: 'A total kept on the order header',
      why: 'The order list cannot sum every line on every page view. Copying the total onto the header makes that page one index read, and it creates a second fact that can drift.',
      explain: `You deliberately denormalize. order_lines holds sku, quantity, and line_total_cents. orders.total_cents stores the sum so the account page can list a hundred orders without aggregating lines. That copy is a decision, not a form you forgot. Third normal form would keep the sum as something you compute from the lines, because the total depends on them.

The write anomaly is an update anomaly. A support tool changes a line total after a pricing mistake and does not change orders.total_cents. The header and the lines now disagree, and every screen that trusted the header is wrong. There is a second form of the same hole: two requests each read the header, add their own delta in the application, and write the result back. One addition is lost. The denormalized column is only safe when every writer updates it in the same transaction as the line change, with an increment on the header rather than a value computed outside the database.`,
      question:
        'The account page lists many orders and must not sum lines for each one. Choose a deliberate denormalization for that page, and name the write anomaly it creates when a line changes.',
      hints: [
        'Store a value the page needs so the read is one row, and accept that the value is derived.',
        'The anomaly appears when a line is updated and the stored derived value is not.',
      ],
      outline: [
        'Copy the sum of line totals onto orders.total_cents for the list page.',
        'The copy is deliberate so the page does not aggregate lines.',
        'The write anomaly is an update anomaly when a line changes and the header does not.',
        'Writers must update the header in the same transaction, as an increment.',
      ],
      solution: `Store total_cents on orders, maintained from the line totals, so the account page reads one row per order. That is the denormalization. The lines remain the detail. The header is a cache with a primary key, and it will be wrong if any writer treats it as optional.

The anomaly is an update anomaly. Change order_lines.line_total_cents and forget orders.total_cents, and the list page shows a total the lines do not add up to. A refund that updates only the line does this. So does a lost update: two transactions read total_cents as 1000, one writes 1500, the other writes 1200, and one line is missing from the header. The rule that keeps the copy honest is mechanical. In the same transaction as the line insert, update, or delete, run ` +
        `UPDATE orders SET total_cents = total_cents + :delta WHERE id = :order. Do not read the total into the application and write back an absolute number. If a writer cannot meet that rule, drop the column and pay for the sum on read. The anomaly is the cost of the column.`,
      rubric: [
        'The denormalization is a stored order total, chosen so the list page does not sum lines.',
        'The write anomaly named is the header drifting from the lines, including a lost increment.',
      ],
      myth: [
        'A stored total is still normal form if a trigger could have maintained it.',
        'The column is a second copy of the lines whether or not you meant to maintain it. The anomaly is the missed update, and a trigger is one way to make the miss harder.',
      ],
      context:
        'Item counts, unread badges, and account balances copied onto a parent row are this same denormalization. The read is cheap. The writers are now part of the invariant.',
      tradeoff: 'The stored total makes the account page one index lookup and makes every line write responsible for the header. Computing the sum on read keeps one fact and makes the page depend on how many lines an order has.',
      mistake: 'Updating the header in a second request after the line update succeeds, so a crash between them leaves the anomaly in place.',
      followUp: 'What does the header show if a line delete commits and the total update rolls back?',
      extension: 'How would you detect existing drift between orders.total_cents and the sum of the lines?',
      alternative: 'A materialized view of order totals can serve the list page and be refreshed on a schedule. Between refreshes the page is stale for every order, not only for the order a writer forgot.',
    },
  },
  identifiers: {
    morning: {
      title: 'The key PostgreSQL mints',
      why: 'The primary key decides who can collide, what leaks in a URL, and how wide every index that starts with that key will be. The generator is part of the decision.',
      explain: `For the orders table, the primary key is a bigint identity column. PostgreSQL generates the value on insert from the identity sequence. The application omits the column. There is no clock in the key, no client-chosen value, and no second writer. The sequence lives with the table. After a crash, committed ids are in the table and the sequence has moved past them, as long as you do not restore an old sequence value on top of newer rows.

This is the right generator when the id does not need to exist before the insert and is not a secret by itself. Internal foreign keys from order_lines.order_id use this compact key. Public URLs do not. A separate public token, random and unique, is what goes in an email link. That token is not the primary key. Mixing the two jobs is how a sequence ends up in a URL. The failure you are avoiding is a key the application invents, which can collide or encode something you did not mean to publish. The decision is that PostgreSQL mints orders.id, and the application mints only the unguessable public token.`,
      question:
        'Choose a primary key for orders. Lines, payments, and refunds will reference it. The id does not need to exist before the insert. Say who generates it, and what you refuse to put in a customer-facing URL.',
      hints: [
        'A compact key generated inside the insert avoids a client and a clock.',
        'The value foreign keys store does not have to be the value you put in an email.',
      ],
      outline: [
        'orders.id is a bigint identity column and the primary key.',
        'PostgreSQL generates it on insert. The application omits it.',
        'Foreign keys from lines and payments use that id.',
        'A separate random token is what appears in a public URL.',
      ],
      solution: `Choose orders.id as bigint generated by default as identity, primary key. PostgreSQL generates it. The insert from the application lists buyer, totals, and timestamps, and it does not send an id. order_lines and payments store that bigint as a foreign key. The identity sequence is the writer. Two app servers cannot hand out the same value.

Do not put this id in a customer-facing URL or in an email. It is ordered, so a shopper can guess neighbors and can watch the number climb. Add a public_token column, unique, generated by the application as a random 128-bit value, and use that in links. The token is an attribute. It is not the primary key, because foreign keys should stay narrow and stable, and because rotating a leaked link should not require rewriting every child row. If you later need the id before the insert for an idempotency scheme, that is a different table's key, generated by the application and constrained unique. It is not a reason to stop using identity here.`,
      rubric: [
        'The primary key is a bigint identity, and PostgreSQL is named as the generator.',
        'The public URL uses a different random token, so the sequence is not the customer-facing id.',
      ],
      myth: [
        'The application should always generate primary keys so the database stays a dumb store.',
        'Who generates the key is part of the design. For this table the database can mint a compact id at insert time, and that removes a class of client collisions.',
      ],
      context:
        'Warehouse references, outbox rows, and ledger lines want the same kind of key: small, ordered, and useless as a capability. The link you email is a different column.',
      tradeoff: 'An identity key keeps indexes narrow and makes inserts simple, and it reveals order if you publish it. A random primary key hides order and widens every foreign key and every index.',
      mistake: 'Using the identity value in the tracking URL because it is already unique and then calling the leak "just a number."',
      followUp: 'After a restore, what must be true of the identity sequence relative to the maximum id in the table?',
      extension: 'Which key should order_lines use as its own primary key, and who generates that one?',
      alternative: 'An application-generated UUIDv7 primary key is reasonable when the client must name the row before the insert returns. It is wider, and it is the wrong trade for a key that never leaves the database.',
    },
    evening: {
      title: 'Milliseconds as the order id',
      why: 'A timestamp feels unique because time moves forward. At insert rate, time stands still for many requests, and the id also publishes the clock.',
      explain: `The tempting scheme is orders.id = the current time in milliseconds, generated in each application process, with no sequence. It sorts by creation time. It needs no extra column for created_at if you are willing to decode the key. Two checkout servers, or two requests on one server, can read the same millisecond. Both build the same primary key. One insert wins. The other gets unique_violation, or, worse, a careless upsert overwrites the first order.

The same key leaks. Anyone who can see an order id knows when it was created, to the millisecond, and can probe the next few milliseconds to see which ids exist. A competitor watching their own purchases can estimate your volume from the gaps. Clock steps make it worse: NTP stepping a host backward reissues ids that already committed. The failure is a collision under ordinary concurrency, plus a leak you cannot take back once the id is in a browser. The decision is to reject the scheme.`,
      question:
        'The team wants the primary key of orders to be the current time in milliseconds, generated by the application, so the table sorts by time with no sequence. Explain the collision or the leak that scheme causes.',
      hints: [
        'Uniqueness has to hold across processes, not just across one thread of one server.',
        'A key a customer can see is also a key a customer can decode and guess around.',
      ],
      outline: [
        'Two inserts in the same millisecond generate the same primary key.',
        'The second insert fails, or an upsert destroys the first order.',
        'The id reveals the creation time and is easy to probe.',
        'A clock step backward reissues keys that already committed.',
      ],
      solution: `The collision is the failure that hits first. The application sets the primary key to the millisecond clock. That value is not unique. Two requests in the same millisecond on one host, and any overlap across hosts, produce the same id. The unique index then rejects the second checkout, so a busy second becomes a cluster of failed orders. If the write path uses an insert that updates on conflict, the second request replaces the first order. A clock stepped backward by NTP repeats the problem against rows that committed minutes ago.

The leak is the same column. The id is the creation time. A buyer, a partner, or a log aggregator can read when the order happened and can request neighboring milliseconds to enumerate orders. You do not need a separate attack for the leak. You published the clock by using it as the key. Reject the scheme. Keep a database-generated identity as the primary key, store created_at as its own column if you need to sort, and put a random token in anything a customer sees. A millisecond prefix plus a random suffix is a different design. A bare timestamp is not an identifier.`,
      rubric: [
        'The collision is two writers producing one millisecond key, with a failed insert or an overwrite.',
        'The leak is that the key reveals time and can be probed, or a clock step reissues old keys.',
      ],
      myth: [
        'A millisecond timestamp is unique because a server only does one thing at a time.',
        'A server does many things in one millisecond, and you have more than one server. The clock is not a sequence.',
      ],
      context:
        'The same temptation shows up as "the id is the date plus a counter we read from max(id)." Two hosts read the same max. The timestamp version just hides the read inside the clock.',
      tradeoff: 'Encoding time in the key lets you sort without a created_at index and makes collisions and enumeration part of the key. A separate timestamp column needs an index and keeps the key boring.',
      mistake: 'Catching unique_violation and retrying with a new timestamp, so the collision becomes a latency spike and the leak stays.',
      followUp: 'What changes if each host appends its process id and you still have two workers in one process?',
      extension: 'How does a restore that resets the system clock interact with keys that were minted before the restore?',
      alternative: 'UUIDv7 keeps a time order in the high bits and uses random bits to avoid the collision. It still leaks approximate time if you publish it, so it belongs inside the database or behind a token.',
    },
  },
  indexes: {
    morning: {
      title: 'The inbox query gets an index',
      why: 'An index on every column of orders feels thorough and helps almost none of the queries. The inbox has one shape. The index has to match that shape.',
      explain: `The open-order inbox runs one query all day. It filters on tenant_id and status = 'open', orders by placed_at descending, and stops at 30 rows. An index on status alone matches a column. It does not match the query. Status is shared by every tenant, so the database would still filter tenant and sort. An index on tenant_id alone matches the start of the predicate and still leaves a sort of every order that tenant ever placed.

The index that matches is (tenant_id, status, placed_at desc). Equality columns come first, in the order the query supplies them, and the sort column comes last so PostgreSQL can walk the newest open orders and stop at the limit. A query that loads one order by primary key does not use this index and does not need it. A query that searches by email does not use it either. You are not indexing the orders table. You are indexing this inbox. If the limit and the order are not in the query, the column order in the index is a different decision.`,
      question:
        'The inbox runs: filter orders by tenant_id and status open, order by placed_at descending, limit 30. Match an index to that query. Explain why an index on status alone is an index on a column, not on this query.',
      hints: [
        'Put the equality columns first and the sort column where the limit can stop early.',
        'A column that appears in the select list does not automatically belong in the index.',
      ],
      outline: [
        'The query equals tenant_id and status, then sorts by placed_at and limits.',
        'The index is (tenant_id, status, placed_at descending).',
        'An index on status alone still filters by tenant and still sorts.',
        'Lookups by primary key do not use this index and do not need it.',
      ],
      solution: `Create an index on orders (tenant_id, status, placed_at desc). The inbox predicate is equality on tenant_id and status, then a descending scan of placed_at that stops after 30 rows. That index lets PostgreSQL find the tenant's open slice and walk it in order. The limit is cheap because the matching rows are adjacent. Include only the columns the plan needs for the filter and the order. The select list can be fetched from the heap unless you have a measured reason to cover it.

An index on status alone is the wrong match. Every tenant's open orders share it, so the engine filters tenant_id afterward and sorts the survivors to apply the limit. An index on (tenant_id, placed_at) is closer and still wrong for this query: closed orders sit in the same tenant slice, so a page of "newest" rows may not contain 30 open ones, and the database keeps scanning. Do not add an index per column of orders "so the table is indexed." Each extra index is a structure the inbox never asked for. Match the next index to the next query, the same way, when that query has evidence it is expensive.`,
      rubric: [
        'The index column order matches tenant equality, status equality, and the placed_at sort with a limit.',
        'An index on status alone is rejected because it does not serve the tenant filter and the ordered limit.',
      ],
      myth: [
        'Every column in the where clause should have its own index.',
        'A single index with the right column order serves this query. Separate one-column indexes do not reproduce that order.',
      ],
      context:
        'Admin inboxes, "my open tickets," and tenant job queues repeat this shape: equality on the owner and the state, then the newest few rows.',
      tradeoff: 'A narrower index on (tenant_id, placed_at) is smaller and makes the open-status filter scan extra rows. The three-column index is larger and stops at the limit.',
      mistake: 'Adding three single-column indexes, on tenant_id, status, and placed_at, and expecting the planner to behave as if they were one ordered index.',
      followUp: 'What happens to this index if the inbox also filters on warehouse_id with an equality?',
      extension: 'Which query would justify a second index that starts with placed_at rather than tenant_id?',
      alternative: 'A partial index on (tenant_id, placed_at desc) where status is open is smaller if closed rows are most of the table. It does not help a query for closed orders.',
    },
    evening: {
      title: 'The tax index on every checkout',
      why: 'A report that runs once a month can still change the cost of every order insert. The index is maintained on the write path, not on the path that asked for it.',
      explain: `Finance runs one query a month: sum of totals for tax_region = 'EU-IOSS' over a year. Someone adds an index on (tax_region, placed_at) so that query can avoid a sequential scan. The report is happy. Checkout is the write path that pays. Every insert into orders must add a tuple to that index, write WAL for it, and split pages when the leaf fills. Orders that are not EU-IOSS still update the index. The rare read did not create a rare write.

Physical replicas do not save you. They replay the same WAL, so they maintain the same index. You cannot keep the index only on the replica and leave the primary unburdened. The failure is a slower insert on the checkout path, including lock and I/O time inside the transaction the shopper is waiting on. The decision is to drop the index and let the monthly query scan, on a replica if you want the I/O off the primary. The scan is allowed to be slow. The insert is not.`,
      question:
        'You added an index on orders (tax_region, placed_at) so a monthly tax report can avoid a sequential scan. Show the write path that gets slower because of that index, and say what you do with the report.',
      hints: [
        'An insert maintains every index on the table, not only the indexes that query will use.',
        'A replica of a physical backup applies the same index updates the primary did.',
      ],
      outline: [
        'Checkout inserts into orders on the primary.',
        'That insert updates the tax_region index and writes WAL for it.',
        'Orders outside that tax region still pay the index maintenance.',
        'Drop the index. Let the monthly report scan, on a replica if the I/O matters.',
      ],
      solution: `The write path is the checkout insert. INSERT INTO orders writes the heap tuple, the primary key index, and every secondary index, including (tax_region, placed_at). That is extra WAL and an extra btree descent on the path the shopper waits for. The monthly report touched a fraction of the rows. The insert path now does work for every row. A region value of NULL or a domestic code does not skip a plain btree. The index entry is still made.

Drop the index. Run the monthly sum as a sequential scan. If the scan's I/O bothers the primary, run it on a replica, accepting that the replica is where the read load goes, not a place where you can have a private index under physical replication. The report can take minutes. It is not a checkout. If the report later becomes a product query with a latency budget and evidence from the planner, you can add an index then, with the write cost in the decision. Adding it for a notebook that runs once a month was the failure. The insert latency is the symptom.`,
      rubric: [
        'The slower path is the order insert, which maintains the tax index and its WAL on every checkout.',
        'The report is moved to a sequential scan, and the index is not kept as a replica-only structure.',
      ],
      myth: [
        'An index only slows down the queries that do not use it. Writes are unchanged.',
        'Every insert and every update of an indexed column maintains the index. The report query is not the path that pays that cost.',
      ],
      context:
        'Audit flags, rare status codes, and one-off backfill columns attract this kind of index. The write path is the production traffic. The report is a guest.',
      tradeoff: 'Keeping the tax index makes the monthly report fast and adds latency and WAL to every order insert. Dropping it makes the report a scan and keeps checkout to the indexes the product queries use.',
      mistake: 'Creating the index concurrently on the primary during the day and calling it free because CREATE INDEX did not lock writes for long.',
      followUp: 'Which updates, not only inserts, would maintain this index a second time?',
      extension: 'What would a partial index on tax_region where the region is EU-IOSS change about the write cost?',
      alternative: 'A monthly job that writes a small summary table can serve finance without an index on orders. The job is another writer you have to run, and checkout does not maintain it.',
    },
  },
  'query-plans': {
    morning: {
      title: 'Twelve rows, then forty thousand',
      why: 'A plan is a proposal. The access method is what it will do, the row counts are what it believes, and the belief is the part that picks a nested loop you will regret.',
      explain: `Read EXPLAIN ANALYZE, not the cost numbers alone. After a bulk import of customers, a support query joins customers to invoices. The plan is a nested loop. The outer node is an index scan on customers. The estimate says 12 rows. The actual count is 40,000. The inner node is an index scan on invoices, executed once per outer row. The access method is that nested loop of index scans. The rows that matter are the pair: estimated 12, actual 40,000. The dangerous guess is the 12.

The planner picked the nested loop because 12 inner lookups looked cheaper than hashing the invoices. The guess came from statistics that predate the import. pg_class and pg_stats still describe the old table. EXPLAIN without ANALYZE would have shown you the 12 and hidden the 40,000, so the plan would look calm. ANALYZE on customers recomputes the stats. The next plan can be a hash join. Until then, the database is faithfully executing a bad guess. The failure is not "it used an index." The index scan was fine. The row estimate was not.`,
      question:
        'EXPLAIN ANALYZE shows a nested loop. The outer index scan on customers estimates 12 rows and actually returns 40,000. The inner index scan on invoices runs once per outer row. Read the plan: access method, rows, and the dangerous guess. What do you run before you add an index?',
      hints: [
        'Compare estimated rows with actual rows on the outer node before you blame the join type.',
        'Statistics from before a bulk load are a reason to ANALYZE, not a reason to add an index yet.',
      ],
      outline: [
        'The access method is a nested loop of index scans, inner side once per outer row.',
        'Estimated rows are 12. Actual rows are 40,000.',
        'The dangerous guess is the estimate of 12, which made the nested loop look cheap.',
        'Run ANALYZE on customers before considering an index. The stats are stale.',
      ],
      solution: `The access method is a nested loop. For each of the outer rows, PostgreSQL does an index scan on invoices. The outer access method is an index scan on customers. Read the actual row counts next to the estimates. The outer node expected 12 rows and produced 40,000. That ratio is the plan telling you it chose a strategy for the wrong size. The dangerous guess is the estimate of 12. It made tens of thousands of inner index probes look cheaper than a hash join. The indexes were used. They were used far too many times.

Do not add an index as the next step. The import changed the table and left the planner's statistics behind. Run ANALYZE on customers, then read EXPLAIN ANALYZE again. If the estimate moves near 40,000, the planner can pick a hash join with the indexes you already have. An extra index will not fix a lie about how many rows the outer side returns. If, after ANALYZE, the estimate is honest and the access method is still a sequential scan of a large invoices table, that is a different plan and a different decision. This plan's failure is the guess.`,
      rubric: [
        'The access method is the nested loop, and the row evidence is the estimate of 12 against the actual 40,000.',
        'The dangerous guess is that estimate, and ANALYZE comes before any new index.',
      ],
      myth: [
        'A nested loop in the plan means you are missing an index.',
        'This nested loop is already using index scans. The bad input is the row estimate, and a fresh ANALYZE addresses that input.',
      ],
      context:
        'Bulk loads, restores, and a session that disabled autovacuum for a migration all leave plans in this state. The plan is confident and wrong.',
      tradeoff: 'ANALYZE takes a lock-light sample and some I/O, and it can change plans immediately after. Skipping it leaves the nested loop in place until autovacuum happens to reach the table.',
      mistake: 'Adding an index on invoices because the inner scan appears thousands of times, without noticing the outer estimate.',
      followUp: 'What does EXPLAIN without ANALYZE hide that made this guess look safe?',
      extension: 'How would a correlation between two predicates make a fresh ANALYZE still estimate badly?',
      alternative: 'Raising the statistics target on customers and running ANALYZE gives the planner a finer histogram. It is the next step if a default ANALYZE is still far from the actual row count.',
    },
    evening: {
      title: 'A seq scan is not a ticket',
      why: 'Sequential scan is a normal access method for a small table. Treating the words in a plan as a work order is how databases fill up with indexes nobody measured.',
      explain: `Support looks up a user by lower(email) a few times a day. The users table has about 2,000 rows. EXPLAIN shows a sequential scan. A teammate wants an expression index on lower(email) because the plan "is not using an index." That is not evidence. A sequential scan of 2,000 rows that live in memory is a few pages. The planner is allowed to prefer it. An index would add maintenance on every email write for a read that is already cheap.

Evidence that would justify the index is specific. pg_stat_statements shows the statement is frequent enough, or slow enough in total, that it matters next to the rest of the database. EXPLAIN (ANALYZE, BUFFERS) after a fresh ANALYZE shows the scan reading a large number of buffers to return a small number of rows, on a table that is no longer tiny. The predicate is selective and stable, so a btree on lower(email) matches it. You also know the write rate, so you can say the extra index maintenance is acceptable. This lookup has the sequential scan and none of the rest. The decision is to not add the index.`,
      question:
        'A lookup of users by lower(email) sequential-scans a table of about 2,000 rows, a few times a day. What evidence would justify an index before you add one, and does this query have that evidence?',
      hints: [
        'A plan node name is not a measurement. Frequency and buffers are.',
        'Run ANALYZE and EXPLAIN ANALYZE before you treat a sequential scan as a defect.',
      ],
      outline: [
        'Justification needs statement frequency or total time from pg_stat_statements.',
        'EXPLAIN ANALYZE after ANALYZE must show a large scan returning few rows.',
        'The predicate must match the index you would add, and the write cost must be acceptable.',
        'This 2,000 row lookup does not have that evidence. Do not add the index.',
      ],
      solution: `Justify an index with measurements, in this order. Confirm the statement in pg_stat_statements: calls and total time, not a single EXPLAIN someone ran in a console. Run ANALYZE so the planner is not guessing from an empty stats snapshot. Then run EXPLAIN (ANALYZE, BUFFERS). You want actual rows much smaller than the rows scanned, a large shared read or hit count, and a predicate an index can apply. Then name the write that will maintain the index and accept that cost. Frequency plus a bad access method plus selectivity is the evidence. "The plan says Seq Scan" is not.

This query does not have it. A few lookups a day against about 2,000 rows are a sequential scan of a small heap. Adding an expression index on lower(email) would make every email change maintain that index, to save a read that is not showing up as a problem. Leave the scan. If the table later grows into millions of rows and the same statement shows up as real time in pg_stat_statements, with buffers to match, the evidence has changed and the index becomes the right tool. Until those numbers exist, the sequential scan is the correct access method, not a bug.`,
      rubric: [
        'The justifying evidence includes real frequency or time, buffer and row counts after ANALYZE, and a predicate the index matches.',
        'The 2,000 row lookup is refused an index because that evidence is absent.',
      ],
      myth: [
        'A sequential scan in EXPLAIN means the query is missing an index.',
        'Sequential scan is the right method when the heap is small. The plan is a choice, not a defect report.',
      ],
      context:
        'This is the pressure that fills a schema with indexes after every incident review that pasted a plan and stopped reading at the first node.',
      tradeoff: 'Waiting for evidence leaves a small lookup as a scan and keeps email writes cheap. Adding the index now makes the plan look "proper" and taxes every update of the email.',
      mistake: 'Creating the expression index in production because a staging EXPLAIN on a 2,000 row copy showed a sequential scan.',
      followUp: 'Which pg_stat_statements columns would you compare before and after a later index, to see if it paid off?',
      extension: 'What evidence would move you from "no index" to "add it" if the table grew but the lookup stayed at a few calls a day?',
      alternative: 'A generated column of lower(email) with an index is the same access path with the expression stored. It costs a column and an index, and this query still has no evidence that asks for either.',
    },
  },
  transactions: {
    morning: {
      title: 'The ticket sale is one commit',
      why: 'A seat can be paid and not ticketed, or ticketed and not paid, if those writes are allowed to succeed alone. The unit of work is the set that must be true together.',
      explain: `The unit of work for selling a held seat is three changes: insert the payment, insert the ticket, and move the claim from held to sold. If the payment exists and the ticket does not, the buyer was charged and has nothing to show at the door. If the ticket exists and the payment does not, the venue let someone in for free. If the claim stays held after a ticket is issued, the partial unique index still treats the seat as occupied and also allows a sweeper to release it. Those three writes commit together or not at all.

The confirmation email is outside the unit. The mail server is slow and it fails for reasons that should not roll the sale back. You send it after commit, and a missing email is a retry, not an undone payment. Inventory of "seats left" on a display counter is also outside, if you can recompute it from claims. Put it inside only when a wrong counter would sell a seat you do not have. The failure is a sale you can observe halfway. The decision is one transaction around payment, ticket, and the claim update, and a deliberate list of what you left out.`,
      question:
        'Define the unit of work for turning a held seat into a sale. Say which writes must commit or not commit together, and name one side effect you leave outside the transaction on purpose.',
      hints: [
        'Look for rows that contradict each other if only one of them exists.',
        'A slow external system inside the transaction holds the seat lock for the whole round trip.',
      ],
      outline: [
        'The payment insert, the ticket insert, and the claim update are one unit.',
        'A charge without a ticket, or a ticket without a charge, is the failure.',
        'They run in one transaction that commits or rolls back as a whole.',
        'The confirmation email is sent after commit and is not part of the unit.',
      ],
      solution: `The unit of work is the payment, the ticket, and the claim. In one transaction: insert into payments for that claim, insert into tickets for that claim, and update the claim from held to sold with a predicate on the current state and the expiry. Commit. If the ticket insert fails, the payment rolls back with it. If the claim update matches zero rows because the hold expired, roll back so you do not keep a payment for a claim you did not win. A buyer must not be able to see a receipt without a ticket, or a ticket without a receipt.

Leave the confirmation email outside. After a successful commit, enqueue or send the mail. If the mail fails, the sale still stands and you retry the mail. Putting the SMTP call inside the transaction couples the seat's locks to a network you do not control, and a timeout then undoes a sale that was fine. A display counter of remaining seats can stay outside if every sale is a claim row you can count. The decision is the boundary: money and entitlement together, notification after. Write that boundary down in the handler so the next side effect does not get "while we are here" treatment and join the transaction.`,
      rubric: [
        'Payment, ticket, and the claim transition are one transaction that cannot commit partially.',
        'The email or another notification is explicitly outside the transaction, with a reason.',
      ],
      myth: [
        'A transaction should wrap every side effect the user expects from the click.',
        'The transaction wraps the database facts that must agree. An email is a later attempt to tell the user what already committed.',
      ],
      context:
        'Checkout, booking, and issuing a license all have this boundary. The entitlement and the charge share a commit. The message you send about them does not.',
      tradeoff: 'A larger transaction keeps more facts consistent and holds row locks longer. A smaller one frees the locks and can commit a payment the ticket insert has not seen yet.',
      mistake: 'Sending the confirmation email before the commit, so a rollback leaves the buyer with a message for a sale that does not exist.',
      followUp: 'What do you do with the seat if the process dies after commit and before the email is sent?',
      extension: 'Which of these joins the unit of work: decrementing a denormalized seats-left counter that buyers use to decide whether to purchase?',
      alternative: 'Writing the sale as one row in a single table avoids a multi-table transaction and forces payment fields and ticket fields to change shape together. The unit of work is then that one insert.',
    },
    evening: {
      title: 'Two queries, one refund',
      why: 'The handler reads top to bottom, so it looks like one action. The connection pool commits each statement alone. A crash in the middle refunds the money and keeps the seat sold.',
      explain: `The refund handler updates payments, adding to refunded_cents where the new sum still fits under the amount captured. It then updates the claim, or the inventory row, to return the seat. In node-postgres those are two pool.query calls. Each call borrows a connection, runs one statement, and commits. There is no BEGIN around them. If the process dies after the first call, or the second statement hits a constraint and throws, the payment is refunded and the seat is still sold.

Nothing in the handler's control flow makes those writes a transaction. They share a function, not a connection in an open transaction. A try/catch that logs the second error does not roll back the first update: that update already committed. The failure is a refund you cannot tell from a finished one by reading the payment, while the entitlement is unchanged. The decision is to take one client from the pool, BEGIN, run both updates, and COMMIT, or ROLLBACK if either one fails or touches zero rows.`,
      question:
        'A refund handler calls pool.query to increase payments.refunded_cents, then calls pool.query again to return the seat. Find the two writes that are accidentally not in one transaction, and say what a crash between them leaves behind.',
      hints: [
        'Each pool.query call is its own committed statement unless you hold a client and begin a transaction.',
        'A catch block in the handler runs after the first update has already committed.',
      ],
      outline: [
        'The first write updates the payment and commits on its own.',
        'The second write returns the seat and commits on its own.',
        'A crash or a thrown error between them leaves the refund without the seat.',
        'One client, BEGIN, both updates, then COMMIT or ROLLBACK, is the fix.',
      ],
      solution: `The two writes are the update of payments.refunded_cents and the update that returns the seat. They are not in one transaction. node-postgres commits a successful pool.query before the function moves to the next line. A crash, a deploy, or a constraint error on the seat update happens after the money has moved. The buyer has a refund. The venue still has the seat marked sold. Retrying the handler can hit the payment predicate and refund a second time, or it can skip the payment and return the seat, depending on which statement you run again. The database did what it was asked. The handler asked twice.

Take one client from the pool. BEGIN. Run the payment update with the predicate refunded_cents + delta <= amount_cents, and stop if it updates zero rows. Run the seat update. COMMIT. On any failure, ROLLBACK, which removes both. The refund and the returned seat are then the unit of work. Do not "fix" this by ignoring the second error. Do not insert a compensation in a third autocommit and hope the process stays up for it. Compensation is a second transaction you need when the first already committed. Here the first transaction should not have committed.`,
      rubric: [
        'The payment update and the seat update are identified as two autocommit writes.',
        'The crash window leaves a refunded payment and a seat that is still sold, and the fix is one explicit transaction.',
      ],
      myth: [
        'Statements in one handler function share one transaction because they serve one request.',
        'They share a transaction only when one connection has BEGIN open around both. The pool commits each query by itself.',
      ],
      context:
        'ORMs that save() per repository call do this to refunds, to inventory, and to "update the order, then update the invoice." The stack trace is one request. The commits are two.',
      tradeoff: 'Holding one client for both updates ties up a pool connection for the length of the transaction. Releasing it between the two queries frees the connection and reopens the crash window.',
      mistake: 'Adding a third query that writes a "please reconcile" row after the first update, still on autocommit, and calling the refund safe.',
      followUp: 'What does the handler return to the client if the seat update matches zero rows and the transaction rolls back?',
      extension: 'How would you detect refunds that were already split this way before the transaction was added?',
      alternative: 'A database function that performs both updates in one procedure gives you one round trip and one transaction. The handler can still forget to use it and call the two statements itself.',
    },
  },
  isolation: {
    morning: {
      title: 'Both doctors go off duty',
      why: 'Repeatable read sounds like the level that freezes the world. It freezes the rows you read. An invariant that spans two rows can still break when each transaction writes a different one.',
      explain: `You chose repeatable read, which in PostgreSQL is snapshot isolation. Each transaction sees a snapshot from its first statement. Dirty reads do not happen. If you read the same row twice, you see the same version. The invariant you care about is different: at least one doctor in the shift table stays on duty. There are two rows, Ada and Bao, both on duty. Each doctor runs a transaction that counts on-duty rows, sees two, and updates their own row to off duty.

Both transactions commit. They did not update the same row, so they never waited on each other. Each snapshot still showed two doctors, because the other's update committed after the snapshot was taken, and a snapshot does not show that commit. The table ends with zero doctors on duty. That phenomenon is write skew, a serialization anomaly. Repeatable read still allows it. The count was stable and the invariant was not. Serializable would abort one transaction with SQLSTATE 40001. Repeatable read will not.`,
      question:
        'You chose repeatable read. Two doctors each count on-duty rows, see two, and set their own row off duty. The rule is that at least one doctor stays on duty. Explain the phenomenon this isolation level still allows.',
      hints: [
        'Each transaction updates a different row, so they do not block each other.',
        'A snapshot that was true at the first select can be the wrong input for a later update of a different row.',
      ],
      outline: [
        'Repeatable read gives each doctor a snapshot where both are on duty.',
        'Each updates their own row. The two writes do not conflict.',
        'Both commit, and nobody is on duty.',
        'The phenomenon is write skew. Serializable would abort one of them.',
      ],
      solution: `The phenomenon is write skew. Under repeatable read, Ada's transaction and Bao's transaction each run select count(*) from shift where on_duty and get 2. That count stays stable if they read it again in the same transaction. Ada updates the Ada row. Bao updates the Bao row. PostgreSQL does not treat those as a conflict, because they are different tuples. Both commit. The predicate "at least one doctor is on duty" was true in each snapshot and is false afterward.

Repeatable read already forbids dirty reads and non-repeatable reads of a row you are looking at. It does not forbid two transactions from making a decision on overlapping reads and then writing disjoint rows. Naming the level is not the explanation. The explanation is that the invariant was not a constraint on one row, and the snapshot hid the other doctor's update. If you need this invariant, repeatable read will not provide it. Serializable isolation, and a retry when the error is 40001, will abort one of the two. A lock on a single sentinel row would also serialize the decision. That is a different mechanism. The level you chose still allows the anomaly.`,
      rubric: [
        'Write skew is explained with both transactions committing after reading a count of two.',
        'The outcome is zero doctors on duty, and repeatable read is not described as preventing it.',
      ],
      myth: [
        'Repeatable read means the transaction sees a database that cannot change underneath an invariant.',
        'It means rows you read stay stable for your transaction. Another transaction can still change a different row your decision depended on.',
      ],
      context:
        'On-call rotations, "at least one admin remains," and account pairs that must not both go negative are this shape. The bug is quiet because each transaction looked correct alone.',
      tradeoff: 'Repeatable read avoids the aborts serializable would raise here, and it allows the invariant to break. Serializable protects the invariant and forces the application to retry 40001.',
      mistake: 'Adding a check constraint on the boolean column, which limits one row and does not express "at least one row stays true."',
      followUp: 'What does the aborted doctor do after serializable returns SQLSTATE 40001?',
      extension: 'How would the outcome change if both doctors updated the same sentinel row instead of their own rows?',
      alternative: 'Locking one shared duty row with SELECT FOR UPDATE at the start of both transactions serializes the decision under read committed. Every duty change waits, which is acceptable when there are two doctors and a bad trade if thousands of rows share one sentinel.',
    },
    evening: {
      title: 'A debit and the lock it holds',
      why: 'A balance update looks like it needs the strongest isolation level. The invariant is one row. The cost you pay is whoever else has to wait for that row, and how long you hold it.',
      explain: `Account 17 has a balance. A transfer debits 40 dollars only if the balance covers it, and it inserts a ledger row for the audit. The predicate and the change are one row. You do not need a snapshot of the whole database. You need the debit to see the latest committed balance and to exclude a concurrent debit of the same account until it is done.

Pick read committed, and do the check inside the update: SET balance = balance - 40 WHERE id = 17 AND balance >= 40. PostgreSQL locks that row for the update. A second debit waits, then tests the predicate against the committed balance, not against the number it might have read earlier. If the row count is zero, the debit did not happen and you roll back the ledger insert with it. The cost is lock waits on account 17. A transaction that debits the account and then calls a fraud API before commit holds the lock for the whole call, and every other debit queues. Serializable would add a different cost, aborts with 40001, which you are not choosing because the one-row update already serializes this invariant.`,
      question:
        'Pick an isolation level for debiting account 17 by 40 dollars when the balance must cover it, and for inserting the matching ledger row. Say what that choice costs under concurrent debits.',
      hints: [
        'Put the balance test in the UPDATE predicate so the lock and the check are the same statement.',
        'The cost shows up as other debits waiting, and it grows if the transaction does slow work before commit.',
      ],
      outline: [
        'Use read committed, not a stronger level, for this one-row predicate.',
        'UPDATE subtracts 40 where the id matches and the balance covers the debit.',
        'Insert the ledger row in the same transaction, and roll back if the update touched zero rows.',
        'The cost is row-lock waits on that account for as long as the transaction stays open.',
      ],
      solution: `Pick read committed. In one transaction, update accounts set balance = balance - 40 where id = 17 and balance >= 40. If that updates one row, insert the ledger line and commit. If it updates zero rows, roll back and return insufficient funds. A concurrent debit of account 17 blocks on the row lock, then rechecks the balance against what the first debit committed. Two debits cannot both pass a check they each read before either wrote. You do not read the balance into the application and write back a new absolute total. That form loses one of the debits under read committed.

The cost is waiting on the row lock for account 17. Contended accounts queue. The wait is as long as the transaction holds the lock, which is until commit. Keep the transaction to the update and the ledger insert. A fraud HTTP call belongs before you begin, or after you commit, with a plan for a decline you discover late. You are not picking serializable. Its extra cost on this shape is serialization_failure and a retry, and the retry has to be idempotent or the ledger doubles. The row lock already orders the debits. Pay for the wait. Do not pay for aborts the invariant does not require.`,
      rubric: [
        'Read committed is the level, and the balance predicate is inside a single UPDATE rather than a read-modify-write in the application.',
        'The cost named is row-lock waiting on that account, tied to how long the transaction stays open.',
      ],
      myth: [
        'Money movement requires serializable isolation or the balance will be wrong.',
        'A single-row conditional update under read committed locks the row and rechecks the predicate. Serializable is for invariants that span rows.',
      ],
      context:
        'Wallet debits, inventory decrements, and rate-limit counters that must not go below zero are this pattern. The hot account is a lock queue, which is the cost you accepted.',
      tradeoff: 'Read committed with a row lock queues debitters and lets them proceed in order. Serializable turns some of those conflicts into aborts and retries, which moves the wait into the client.',
      mistake: 'Selecting the balance, computing the new value in the handler, and updating the row to that value.',
      followUp: 'What should the handler do if the conditional update reports zero rows?',
      extension: 'How does the cost change if the transaction also posts a second ledger row in another account before it commits?',
      alternative: 'SELECT FOR UPDATE on the account, then an update, is correct under read committed when the new balance is not a simple subtraction. It holds the lock from the select onward, which is longer than a single update statement.',
    },
  },
  locks: {
    morning: {
      title: 'Account 14 waits on account 22',
      why: 'A deadlock is not a slow query. Two transactions are each holding the row the other needs, and neither can commit until one of them is destroyed.',
      explain: `Transfer A updates account 14, then updates account 22. Transfer B updates account 22, then updates account 14. A gets the row lock on 14. B gets the row lock on 22. A then waits for 22, which B holds. B waits for 14, which A holds. Each wait shows up in pg_stat_activity as wait_event_type Lock. Neither statement finishes. Neither transaction reaches commit. They are not waiting on disk. They are waiting on each other.

PostgreSQL does not leave them there forever. After deadlock_timeout, by default one second, the deadlock detector notices the cycle and aborts one transaction with SQLSTATE 40P01. The other proceeds and can take the lock it was waiting on. The aborted transfer has done nothing visible: its updates roll back. The application sees an error, not a timeout, if it is still waiting on that statement. The failure is the cycle. The detector is the backstop, not the design. Until it fires, both transfers occupy a connection and hold the locks they already took.`,
      question:
        'Transfer A updates account 14 and then account 22. Transfer B updates account 22 and then account 14, at the same time. Describe how the two transactions wait on each other, and what PostgreSQL does about the cycle.',
      hints: [
        'Each transaction already holds one row lock before it asks for the second.',
        'The wait event is a lock wait, and the end of the cycle is an abort of one transaction.',
      ],
      outline: [
        'A holds the lock on account 14 and waits for account 22.',
        'B holds the lock on account 22 and waits for account 14.',
        'Neither can commit. pg_stat_activity shows lock waits.',
        'The deadlock detector aborts one transaction with SQLSTATE 40P01.',
      ],
      solution: `A and B wait in a cycle. A's first update locks account 14. B's first update locks account 22. A's second update needs 22 and waits for B. B's second update needs 14 and waits for A. You can see both sessions non-idle, wait_event_type Lock, each blocked by the other. There is no third waiter required. Two transactions are enough when each lock is taken in the opposite order. Reads of other accounts continue. These two transfers do not.

The deadlock detector breaks the cycle. After deadlock_timeout it aborts one of the two with SQLSTATE 40P01 deadlock_detected, and that transaction's locks drop. The survivor takes the row it was waiting on and can commit. The aborted application must retry the whole transfer. If it retries with the same order, it can deadlock again against the next opposite transfer. The detector kept the database moving. It did not make the lock order safe. A transfer that locks 14 then 22 will keep drawing this picture against a transfer that locks 22 then 14, and one customer in each pair will see an error you could have avoided.`,
      rubric: [
        'The cycle is described: each transaction holds one account and waits for the account the other holds.',
        'PostgreSQL aborts one transaction with a deadlock error so the other can continue.',
      ],
      myth: [
        'Deadlock means the database is overloaded and queries are waiting on CPU.',
        'These two sessions are waiting on each other's row locks. Extra CPU does not break the cycle. Aborting one transaction does.',
      ],
      context:
        'Any two-row update can draw this cycle: account to account, inventory to bin, parent row to child row, when the handlers take locks in opposite orders.',
      tradeoff: 'A short deadlock_timeout aborts a cycle quickly and can false-positive a lock wait that was about to end. A long one leaves both connections stuck until the detector runs.',
      mistake: 'Retrying the aborted transfer immediately in the same lock order, so the next opposite transfer deadlocks with it again.',
      followUp: 'What does the surviving transfer do once the aborted one has rolled back?',
      extension: 'How would you confirm the cycle from pg_locks rather than from the application error alone?',
      alternative: 'A single UPDATE that locks both account rows in one statement with an ORDER BY on the id can take the locks in a stable order. Both handlers have to use that statement, or one of them can still grab a row early.',
    },
    evening: {
      title: 'Sku first, then the bin',
      why: 'Picking and restocking deadlock because they lock the same two rows in opposite orders. A global table lock would end the deadlock by stopping the warehouse.',
      explain: `A pick handler locks the sku row, to decrement on-hand stock, and then locks the bin row, to record that the unit left that location. A restock handler locks the bin first, to see that it has room, and then locks the sku, to increment on-hand stock. When they touch the same sku and the same bin, you get the cycle from the account transfers, with different table names. The pick holds the sku and waits for the bin. The restock holds the bin and waits for the sku.

Choose one order and use it in both handlers. Lock sku rows first, in sku id order if there are several, then lock bin rows, in bin id order. Both the pick and the restock follow that order, even when the story of the operation sounds like the bin comes first. The cycle is gone. A pick of sku 9 and a restock of sku 3 do not share a sku lock, so they run together. You did not take a table lock on skus or on bins. The whole service is not serialized. Only workers that need the same sku, or the same bin, wait, and they wait in one direction.`,
      question:
        'Picking locks the sku row and then the bin row. Restocking locks the bin and then the sku. Choose a lock order that removes that deadlock without serializing every pick and restock in the service.',
      hints: [
        'Both handlers must take the shared rows in the same order, whatever the business story says.',
        'A lock on the table would remove the cycle by making every warehouse write wait.',
      ],
      outline: [
        'Both handlers lock sku rows before bin rows.',
        'Several skus are locked in sku id order, then bins in bin id order.',
        'The opposite-order cycle between pick and restock disappears.',
        'Workers on different skus still run at the same time. There is no table lock.',
      ],
      solution: `Lock the sku before the bin in both handlers. If a pick or a restock touches several skus, lock those sku rows in ascending sku id, and then lock the bin rows in ascending bin id. The pick decrements the sku only after it holds that lock, even though the interesting fact for a human is which bin lost a unit. The restock checks the bin only after it holds the sku lock. The extra moment of holding the sku lock is the cost. The deadlock between pick and restock on the same pair is the failure you removed.

This does not serialize the service. A pick for sku 9 and a restock for sku 3 take different sku locks and proceed together. Two picks for sku 9 wait on that sku, which is ordinary contention, not a cycle. Do not LOCK TABLE skus. That also removes the deadlock, and it makes every pick in the building queue behind one restock. Do not take an advisory lock on the word "warehouse" either. The order is enough because the cycle required opposite orders. One order, applied to every handler that touches these rows, including a future "move bin" job, is the fix. A handler that locks the bin "just for a moment" at the start puts the cycle back.`,
      rubric: [
        'A single lock order, sku before bin, is applied to both pick and restock.',
        'Different skus still run concurrently, and a table lock is not the mechanism.',
      ],
      myth: [
        'The only way to stop deadlocks is to make all warehouse writes take one lock.',
        'Deadlocks here come from opposite orders. The same order removes the cycle and leaves unrelated skus alone.',
      ],
      context:
        'Any two handlers that touch a parent and a location, or an account and a fee row, need the same kind of order. The order is a property of the code, not of the database default.',
      tradeoff: 'Locking the sku before the bin makes a restock hold the sku lock while it inspects the bin. Locking in the storytelling order preserves the restock's shorter sku hold and keeps the deadlock.',
      mistake: 'Taking LOCK TABLE skus in restock only, so picks queue behind every restock and the deadlock remains when a pick locks a sku first.',
      followUp: 'Where does a third handler that moves stock between two bins fit in this order?',
      extension: 'What deadlock remains if the pick also locks the shopper row before the sku, and checkout locks the shopper row after the sku?',
      alternative: 'Doing the stock change and the bin change as one UPDATE ... FROM that locks rows in id order inside a single statement removes the cycle for these two handlers. A third statement that locks early can still create one.',
    },
  },
  replication: {
    morning: {
      title: 'The standby flushes, then applies',
      why: 'A commit that waited for a replica did not wait for your read. People treat "synchronous" as "the standby can already see the row." PostgreSQL waits for a flush unless you asked for apply.',
      explain: `The primary accepts writes. It assigns a WAL position, writes the commit record, and, with synchronous_commit on, flushes that WAL to its own disk before it tells the client the transaction committed. A replica does not accept those writes. With hot_standby on, it replays WAL and serves reads. An insert you send to the replica fails. If you somehow wrote there, that write is not in the primary's WAL and will diverge.

What is synchronous depends on synchronous_standby_names and synchronous_commit. With the standby named and synchronous_commit set to on, the primary waits until that standby has flushed the commit's WAL to disk. It does not wait until the standby has applied the WAL into the tables a query reads. Apply is synchronous_commit = remote_apply. The usual "sync replica" setting makes the flush synchronous and leaves apply behind. If synchronous_standby_names is empty, even synchronous_commit on waits only for the primary's local flush. The replica is then asynchronous. The decision is to say which of those you configured, and to stop describing the replica as caught up because the commit returned.`,
      question:
        'Separate the primary from the replica in a PostgreSQL pair. With synchronous_standby_names set and synchronous_commit on, say what the commit waits for, and what it does not wait for.',
      hints: [
        'Writes go to one side. The other side replays WAL and can serve reads.',
        'Flushing a WAL record on the standby is a different event from applying it to the heap.',
      ],
      outline: [
        'The primary accepts the write and flushes its own WAL before commit returns.',
        'The replica replays WAL and does not take ordinary writes.',
        'synchronous_commit on waits for the named standby to flush that WAL.',
        'It does not wait for apply. remote_apply is the setting that does.',
      ],
      solution: `The primary is the only side that takes the insert. Commit, with synchronous_commit on, returns after the primary has flushed its WAL. The replica is a standby: it receives the WAL stream, and with hot_standby it applies that stream for readers. You do not point writes at it. Promotion is how it becomes a primary later. Until then it is a copy being built by replay.

With synchronous_standby_names naming that standby and synchronous_commit on, the primary also waits for the standby to flush the commit record to the standby's disk. That is the synchronous part: the WAL is on two disks before the client hears success. Queries on the standby can still miss the row, because apply has its own queue. replay_lsn can sit behind flush_lsn. If you need the standby's next query to see the commit, the setting that waits for that is remote_apply, and it makes commit latency include apply, not only fsync. If you thought "sync" meant "a read after commit on the replica is safe," you configured the wrong wait. Say the flush is synchronous. Say the apply is not.`,
      rubric: [
        'The primary is the writer and the replica is the WAL replay side that serves reads.',
        'The synchronous wait is the standby WAL flush, and apply is called out as a separate, later step.',
      ],
      myth: [
        'A synchronous replica can always see a transaction as soon as the primary commit returns.',
        'The default synchronous wait is for the standby to flush WAL. Visibility on the standby waits for apply, which is a different setting.',
      ],
      context:
        'Failover design depends on this split. A standby that flushed the WAL can be promoted without losing that commit. A reader on that standby may still not see it yet.',
      tradeoff: 'Waiting for remote flush loses the primary if the standby cannot fsync, and it keeps that commit on two disks. Not waiting keeps commits local and loses them if the primary dies before the WAL ships.',
      mistake: 'Pointing a migration's writes at the replica because it is "the same data" and then failing when the replica rejects the insert.',
      followUp: 'What does a commit wait on if synchronous_standby_names is empty?',
      extension: 'Which LSN column on pg_stat_replication tells you the standby has flushed, and which tells you it has applied?',
      alternative: 'synchronous_commit = remote_apply waits until the standby has applied the commit, so a following read on that standby can see it. Commit latency then includes replay delay, including delay caused by a heavy read on the standby.',
    },
    evening: {
      title: 'The receipt mailer missed 881',
      why: 'The payment committed. The worker that sends receipts reads the replica and finds no row, so it sends nothing. The customer has a 201 and no mail, and the row is not gone.',
      explain: `Payment 881 commits on the primary. The handler returns 201. Replication is asynchronous: the commit waited for the primary's WAL flush and did not wait for the replica. The receipt worker is connected to the replica. It selects that payment id, gets zero rows, and decides there is nothing to send. On the primary the row is visible. On the replica, replay_lsn has not reached the commit's LSN. The write is committed and not applied. Those are both true.

This is not a failed insert and not a wrong id. pg_stat_replication on the primary shows the replica behind: sent_lsn or replay_lsn has not caught the commit. If the replica is only a little behind, the row appears a moment later and the worker has already moved on. If the primary dies before the WAL is shipped, the commit can be lost as well. While both are up, the failure the worker hit is lag, not loss. The decision is that "no row on the replica" is not evidence the payment is absent. The worker reads the primary, or it waits until the replica's replay_lsn passes the LSN the insert returned.`,
      question:
        'Payment 881 commits on the primary and the client receives 201. The receipt worker reads the replica, finds no row, and sends no mail. Explain how that committed write is missing, and what the worker should use as proof the payment does not exist.',
      hints: [
        'Compare the commit LSN with the replica replay position before you call the insert a failure.',
        'Asynchronous commit returns after the primary flush. The replica applies later.',
      ],
      outline: [
        'The insert committed on the primary and the WAL flush there succeeded.',
        'The replica has not applied that WAL, so the select misses the row.',
        'replay_lsn behind the commit LSN is the evidence.',
        'The worker must not treat a replica miss as proof. It reads the primary or waits for replay.',
      ],
      solution: `The write committed on the primary. The client was allowed to hear 201 because asynchronous replication does not include the replica in the commit. The WAL record exists on the primary. The replica applies it later, when replay reaches that LSN. Until then a select on the replica does not see payment 881. The worker's empty result is the apply lag, visible as replay_lsn behind the commit position in pg_stat_replication. The payment is not rolled back. The mailer looked at a copy that has not caught up.

The worker must not use that empty result as proof the payment does not exist. Proof of absence, for a row that was just written, is a read from the primary, or a read from a replica after replay_lsn has passed the insert's LSN. Practical choices: point the receipt query at the primary, or store the commit LSN with the job and delay the job until the replica has replayed it. Retrying the select once on the same replica and then giving up repeats the bug with a shorter race. And do not "fix" a missing receipt by inserting the payment again. It is already there. You would create 882 and mail the wrong thing, or hit a unique key and mail nothing still.`,
      rubric: [
        'The committed primary write is distinguished from replica apply, with lag as the reason the select misses.',
        'A replica miss is rejected as proof of absence. The worker uses the primary or waits for replay.',
      ],
      myth: [
        'If the replica does not have the row, the transaction did not commit.',
        'Commit and apply are different events when replication is asynchronous. The replica can be missing rows the primary has already acknowledged.',
      ],
      context:
        'Email workers, search indexers, and caches that "confirm" a write by reading a replica all drop or duplicate work in this window. The 201 already happened.',
      tradeoff: 'Reading the receipt from the primary sees the row and spends primary capacity on a worker. Waiting for replay spreads the read and delays the mail by however far the replica is behind.',
      mistake: 'Inserting a replacement payment when the replica select returns zero rows.',
      followUp: 'What would the worker see if it had read the replica after replay and the payment had been deleted on purpose?',
      extension: 'How does this miss change if the replica is synchronous with remote flush and still not remote apply?',
      alternative: 'Putting the receipt job in the same database transaction as the payment, via an outbox row on the primary, means the worker reads the primary for the job. The replica is not on the path that decides whether the payment exists.',
    },
  },
  'replication-lag': {
    morning: {
      title: 'The profile that ignored the save',
      why: 'The user saved their name, landed on their profile, and the old name was still there. They did not imagine it. The read went to a copy that had not caught up to their write.',
      explain: `The user submits a new display name. The handler updates the primary and commits. The next request is GET /profile, and the load balancer sends it to a replica. The replica's replay is behind that commit. The select returns the old name. The screen the user sees is the screen from before the save. They edit again, or they file a bug that the save button does nothing. The write is on the primary the whole time.

This bug has a name: read-your-writes. The reader is the same client that just wrote, and the guarantee they need is that a later read sees that write. Replication lag breaks it when the later read is allowed to go to a replica that has not applied the commit. It is not a stale cache you forgot to expire, and it is not an update that failed. You can confirm it by reading the same profile on the primary and seeing the new name while the replica still has the old one. The failure is the routing. The decision is to recognize the bug before you look for a lost UPDATE.`,
      question:
        'A user updates their display name, then immediately opens their profile and sees the previous name. The update committed on the primary. The profile read used a replica. Name the bug lag caused, and say how you would confirm it.',
      hints: [
        'Compare what the primary returns for that user with what the replica returns, before you blame the form.',
        'The reader and the writer are the same person, a moment apart. That is the guarantee that failed.',
      ],
      outline: [
        'The name update commits on the primary.',
        'The following profile read is served from a replica that has not applied it.',
        'The bug is a read-your-writes failure caused by replication lag.',
        'Confirm by reading the primary and the replica for the same user at the same time.',
      ],
      solution: `The bug is read-your-writes, caused by replication lag. The session wrote the display name to the primary and then read the profile from a replica whose replay_lsn was still behind that commit. The user is entitled to see their own write. The replica served an older snapshot, so the page contradicted the save that just succeeded. A second save from the user writes the name again. You now have two updates and a confused client, and the first update was never lost.

Confirm it while the replica is behind: select the display name on the primary and on the replica for that user id. The primary has the new name. The replica has the old one. pg_stat_replication shows the lag that made the read late. If both sides show the old name, the update did not commit and this is a different bug. If both show the new name, you missed the window, or the read never went to the replica. Do not start by adding a cache invalidation. There is no cache in this path. The copy is the replica. The name of the bug is how you route the next read.`,
      rubric: [
        'The bug is named read-your-writes, and lag is the reason the replica served the old name.',
        'Confirmation is a primary read and a replica read that disagree, not a search for a failed update.',
      ],
      myth: [
        'If the user cannot see their update, the update transaction rolled back.',
        'The update can be committed on the primary and invisible on a replica that has not applied the WAL. The user hit that replica.',
      ],
      context:
        'Profile saves, "my order appeared empty," and a toggle that flips back are the support tickets this bug produces. The writer and the reader share a session and not a database connection.',
      tradeoff: 'Sending the next read to the primary fixes read-your-writes for that session and adds read load to the writer. Sending it to any replica protects the primary and brings the bug back.',
      mistake: 'Telling the user to refresh until the name appears, which trains them to submit the form again.',
      followUp: 'What does a second replica, even further behind, do to a retry of the profile read?',
      extension: 'How would you recognize this bug if a connection pooler mixed the two hosts inside one request?',
      alternative: 'Passing the commit LSN to the next read and waiting until the replica has replayed it preserves read-your-writes and still uses the replica. The wait is the lag, paid on that read instead of on the primary.',
    },
    evening: {
      title: 'Where the debit is allowed to read',
      why: 'Not every select is the user's own write. Sending them all to the primary wastes the replica. Sending the balance check to the replica spends money you do not have.',
      explain: `Lag is acceptable when being a little late does not change a decision. The product catalog, another shopper's public profile, and a report of payments that settled yesterday can run on a replica. A shopper who sees a price that changed a second ago is looking at a replica doing its job. A warehouse report for a closed day is safe once the replica's replay has passed the end of that day.

The read that decides money is different. Before a debit, the balance you look at must be the primary's balance, and the debit itself must run on the primary. A replica can omit a debit that already committed and let the application believe the account still covers a second transfer. The profile read immediately after a save is the same class: it is a read of this session's write, so it goes to the primary, or to a replica that has replayed that write's LSN. The decision is a map, not a single rule. Primary for the debit's balance and for read-your-writes. Replica for the catalog and for yesterday once replay has passed it.`,
      question:
        'Choose where each read goes. The balance check before a debit, the profile read right after that user saves, the public product catalog, and yesterday's settled-payment report. Say which must use the primary and where a replica is acceptable.',
      hints: [
        'A read that authorizes a write has to see commits the replica may not have applied.',
        'A read of data this session just wrote is a different case from a read of the catalog.',
      ],
      outline: [
        'The balance check before a debit goes to the primary, and the debit runs there too.',
        'The profile read immediately after a save goes to the primary or to a caught-up replica.',
        'The product catalog may use a replica.',
        'Yesterday's settled report may use a replica once replay has passed the end of that day.',
      ],
      solution: `The balance check goes to the primary. It is an input to a debit. A replica that has not applied a recent debit will show money the account no longer has, and the application will authorize a transfer the primary would refuse. Run the debit on the primary as a conditional update anyway. Do not use the replica number as the authority and then "just write" the result. The profile read right after a save also goes to the primary, or waits for a replica whose replay_lsn has passed that save. That is the read-your-writes case. A replica chosen at random will show the old name.

The public catalog goes to a replica. It is shared, it changes on a human schedule, and a second of lag does not double-spend anything. Yesterday's settled-payment report goes to a replica once replay is past the end of yesterday. If the replica is hours behind, it is not acceptable for that report yet, and you either wait or read the primary. The map is: primary when the read authorizes a write or returns this session's own recent write; replica when the reader can tolerate lag and you have checked that the replica has reached the time the report claims to include. Pointing every statement at the primary is safe and throws away the replica. Pointing the balance check at the replica is the expensive kind of safe.`,
      rubric: [
        'The balance check and the post-save profile read are on the primary, with a reason tied to commits the replica may lack.',
        'The catalog and the closed-day report are allowed on a replica, the report only if replay has passed that day.',
      ],
      myth: [
        'Replicas are for every read, and the primary is for every write. Routing inside reads does not matter.',
        'Some reads authorize writes or confirm this session's write. Those reads belong on the primary even though they are selects.',
      ],
      context:
        'Marketplaces mix these four reads on one page: a balance, a flash of "saved," a product tile, and a chart. One connection string cannot serve all four.',
      tradeoff: 'Routing the debit's read to the primary avoids an overdraft and concentrates those reads on the writer. Routing it to a replica spreads load and authorizes transfers against a balance that has already changed.',
      mistake: 'Using one replica connection for the request after any recent write, including the balance check that follows a deposit.',
      followUp: 'What do you do with the yesterday report if the replica is three hours behind?',
      extension: 'How would you pin only the next profile read to the primary without pinning the catalog on the same page?',
      alternative: 'A session flag that sends all of that user's reads to the primary for a few seconds after any write covers the profile and also sends their catalog browsing to the primary. It is simpler and broader than a per-query map.',
    },
  },
  sharding: {
    morning: {
      title: 'Orders live with the customer',
      why: 'The access pattern is not "orders exist." It is "this signed-in customer reads and writes their orders." A shard key that ignores that fans the common path out to every machine.',
      explain: `Checkout and the order history page always know the customer id from the session. They insert an order for that customer and list orders for that customer. They almost never start from a bare order id. In Citus you distribute orders with create_distributed_table on customer_id. A query that includes WHERE customer_id = ... is a single-shard query. The lines table is distributed on customer_id too, and colocated, so the join that builds one customer's receipt stays on that shard.

The key you are rejecting is order_id. It makes a fetch by id local and makes "my orders" a scatter to every shard, which is the page you serve all day. You are also rejecting a shard key of placed_at. Today's orders would pile onto one shard, and a customer's history would still scatter. The failure of a bad key is not uneven disks someday. It is the hot path becoming a distributed query now. The decision is customer_id, because that is the column every ordinary query already has.`,
      question:
        'Checkout and order history always run as the signed-in customer. Support rarely opens an order by id alone. Choose a shard key for orders, and say why order_id and placed_at are the wrong keys for this access pattern.',
      hints: [
        'The common query should include the distribution column so it hits one shard.',
        'Colocate the line items with the orders they belong to, on the same column.',
      ],
      outline: [
        'The access pattern is read and write by customer_id.',
        'Distribute orders and order lines on customer_id so they are colocated.',
        'A history query with that column is a single-shard query.',
        'order_id scatters history. placed_at piles writes onto one shard and still scatters history.',
      ],
      solution: `Choose customer_id. Distribute orders on it, and distribute order_lines on customer_id as well, colocated with orders. Checkout inserts the order and its lines in one shard. The history page selects where customer_id equals the session customer and runs on that shard. You are matching the key to the access pattern you actually serve, not to a unique column you happen to have.

Reject order_id. A link that already contains the order id would be local, and the history page would ask every shard for a customer's orders and merge the results. That page is the common path. Reject placed_at. Writes for the current time land on one shard, so the cluster's ingest rate collapses to that shard's ingest rate, and a customer's orders across months are still a scatter. The key is allowed to make rare queries harder. It is not allowed to make "my orders" a cluster-wide query. If a later feature is "fetch any order by id from a public link" and that becomes the common path, you reopen the key. It is not the path you have.`,
      rubric: [
        'customer_id is the shard key, tied to checkout and history being single-customer queries.',
        'order_id and placed_at are rejected for scattering history, and placed_at also for concentrating current writes.',
      ],
      myth: [
        'The primary key should be the shard key so every lookup is local.',
        'The shard key should be the column the common query has. A primary key lookup that users do not perform is the wrong thing to optimize first.',
      ],
      context:
        'Multi-tenant SaaS has the same pattern under the name tenant_id. The session knows the tenant. A shard key of the row id makes every tenant page a scatter.',
      tradeoff: 'Sharding by customer keeps one shopper fast and makes a global admin query touch every shard. Sharding by order id keeps a single-order fetch fast and makes every shopper history page pay for the fan-out.',
      mistake: 'Distributing orders by customer_id and order_lines by order_id, so the receipt join crosses the network for every page view.',
      followUp: 'What does the history query do if the application forgets to include customer_id in the WHERE clause?',
      extension: 'Why is a unique constraint on order_number alone a problem once orders are distributed by customer_id?',
      alternative: 'A directory that maps order_id to customer_id lets you shard by customer and still route an id lookup to one shard. You now have a second store to write in the same commit, or a shard of its own to keep up to date.',
    },
    evening: {
      title: 'The packing slip has no customer',
      why: 'Support has the order number printed on a box. They do not have the customer id. The key that made checkout local makes this lookup ask every shard.',
      explain: `The shard key is customer_id. That was the right call for the shopper. The support tool's query is different: select the order where order_number equals the code on the packing slip. The code is unique in the business. It is not the distribution column. Citus cannot prune to one shard. The coordinator sends the query to every shard, waits for all of them, and merges. One slow shard sets the latency. Adding shards to give shoppers more room makes this lookup touch more machines.

The query is expensive because of the key you chose, not because the table is missing an index. Each shard can index order_number and still has to be asked, because any shard might hold that customer. A unique index on order_number alone is not even available as a global constraint when the distribution column is customer_id. The failure is a support lookup whose cost grows with the cluster. The decision is to see that cost before you tell support to "just query orders." You do not change the shard key to make this one query local and the shopper path a scatter.`,
      question:
        'Orders are sharded by customer_id. Show a query that this shard key makes expensive. Use the support lookup of an order number from a packing slip, which does not include the customer id.',
      hints: [
        'A filter that does not include the distribution column cannot be pruned to one shard.',
        'An index on each shard does not stop the coordinator from contacting every shard.',
      ],
      outline: [
        'The query filters on order_number and does not include customer_id.',
        'The coordinator scatters it to every shard and merges the replies.',
        'Latency tracks the slowest shard and grows as shards are added.',
        'The shopper key stays. This lookup needs a different route, not a new distribution column.',
      ],
      solution: `The query is SELECT order_id, customer_id, total_cents FROM orders WHERE order_number = 'HN-44021'. It does not constrain customer_id. With orders distributed on customer_id, the coordinator scatters that statement to every shard. Each shard probes its local index, most find nothing, one finds the row, and the coordinator returns it. The shopper's history query stayed on one shard. This one touches the cluster. If a shard is checkpointing or rebuilding an index, support waits on it even though the order lives somewhere else.

Do not "fix" it by redistributing on order_number. You would make this lookup local and make every checkout history a scatter, which is the common path. Keep customer_id. Give support a route that has the distribution column: a small directory from order_number to customer_id that you write in the same transaction as the order, or include the customer id in the packing-slip code so the query can prune. Until one of those exists, this lookup stays a scatter and you treat it as an expensive admin path, not as something you hide behind the shopper's shard key. An index on order_number inside each shard makes the local probe cheap. It does not make the fan-out cheap.`,
      rubric: [
        'The expensive query filters on order_number without customer_id and is described as a scatter to every shard.',
        'The cost is tied to the customer_id shard key, and the key is not flipped to serve support.',
      ],
      myth: [
        'Once each shard has an index on order_number, a lookup by that number is a single-shard query.',
        'The index makes each shard fast. The coordinator still has to ask every shard, because the shard key is not in the predicate.',
      ],
      context:
        'Packing slips, chargeback notices, and "the id from the customer email" are how a good tenant shard key meets a query that does not know the tenant.',
      tradeoff: 'Leaving the lookup as a scatter keeps shopper queries local and makes support slower as you add shards. A directory makes support local and adds a write that must not drift from the order.',
      mistake: 'Running the support query in a loop from the application, one shard at a time, and calling that cheaper because the database did not show a distributed plan.',
      followUp: 'What does support latency do when you double the shard count and change nothing else?',
      extension: 'How would you keep a directory of order_number to customer_id in the same commit as the order insert?',
      alternative: 'Encoding the customer id into the packing-slip code lets this query include the shard key without a directory. The code gets longer, and old slips printed without it stay scatters.',
    },
  },
  'hot-partitions': {
    morning: {
      title: 'Every insert has today in the key',
      why: 'A partition per day looks like a way to age out old data. It also decides where writes go. Writers insert "now," so one partition takes the whole ingest rate.',
      explain: `The events table is partitioned by range on occurred_on, a date. Each day is a partition. It feels even, because days are the same size on a calendar. Writers do not insert even days. They insert the current date. On 2026-10-25 every insert carries that date and lands in the partition for that day. Yesterday's partition receives nothing. Last month's partitions sit idle. The btree on today's partition takes every new tuple, every page split, and every index lock.

The key is occurred_on. It receives a disproportionate share of writes because the value everyone writes is "today," not because one customer is famous. The cluster's disks do not help. The idle partitions are other tables as far as the insert path is concerned. Throughput of ingest collapses to what today's partition can absorb. The failure is structural skew. You will see it as insert latency and contention on that partition while the rest of the data directory looks bored. The decision is to call the date the hot key, not to blame a bad batch job.`,
      question:
        'Events are partitioned by range on the date occurred_on. Writers always insert the current date. Explain which key receives a disproportionate share of writes, and why the other partitions do not absorb it.',
      hints: [
        'Look at the value the inserts actually contain, not at how many partitions exist.',
        'A partition that does not match the inserted date is never a candidate for that insert.',
      ],
      outline: [
        'The partition key is the date occurred_on.',
        'Every current insert uses today, so one partition receives the writes.',
        'Older partitions stay idle because new rows do not fall in their ranges.',
        'Ingest throughput is capped by that one partition index and its locks.',
      ],
      solution: `The hot key is the date occurred_on, and the hot value is the current day, 2026-10-25 in this example. Range partitioning sends every row to the partition whose bounds contain that date. Writers do not spread themselves across the calendar. The application stamps occurred_on with the current date, so the partition for today takes the insert stream. Its indexes grow. Its page splits show up on the insert path. A vacuum or an index build on that partition competes with ingest.

The other partitions do not absorb the share. A row dated today is not allowed to land in yesterday's partition. Those files can be large and quiet. Adding more historical partitions, or putting the table on a bigger array, does not create a second place for today's key to go. You still have one btree leaf path for the values everyone is inserting. That is the disproportion: one key value, one partition, the full write rate. It is not a temporary hotspot from a single client. Tomorrow the hotspot moves to a new partition, and that partition becomes the only one that matters. The shape stays.`,
      rubric: [
        'The date key, specifically the current day, is identified as the value taking the writes.',
        'Idle partitions are explained as ranges that current inserts cannot use.',
      ],
      myth: [
        'Daily partitions spread write load because there are many of them.',
        'They spread stored history. Current inserts all carry one date, so they share one partition.',
      ],
      context:
        'Logs, click events, and audit tables partitioned by day or by month meet this on the first busy afternoon. The partition you created for next year does not help today.',
      tradeoff: 'Range partitions by day make it easy to drop old data and concentrate every insert on the live day. A hash across all time spreads inserts and makes dropping a day a delete, not a detach.',
      mistake: 'Adding partitions for future weeks and expecting today's insert rate to split across them.',
      followUp: 'What does the insert path do at midnight when the new day's partition was not created?',
      extension: 'How would the hotspot move if the key were the hour instead of the day?',
      alternative: 'Partitioning by hash of event_id spreads inserts across a fixed set of partitions and removes the daily key. Dropping a day of data becomes a filtered delete in every partition.',
    },
    evening: {
      title: 'Sixteen ways through today',
      why: 'You can cool a single btree without pretending Tuesday is as busy as a day last June. The split changes the latch. It does not change the fact that the writes are now.',
      explain: `Today's range partition is the bottleneck. Subpartition it by hash of event_id into 16 children. An insert still has occurred_on = current_date, so it still enters today's range. Inside that range, the hash picks one of 16 btrees. Page splits and index locks spread across those children. A single latch is no longer the whole ingest rate. Queries that name event_id and the date can prune to one child. A query for all of today's events touches 16.

The skew did not vanish. Those 16 children are the busy part of the table. The partition for a quiet day last year still receives none of this traffic. You did not make the workload uniform over time. You made the hot day wider. If you tell yourself the table is "balanced" because there are thousands of daily partitions on disk, you will be surprised when today's 16 are the only ones with insert latency. The failure you fixed is the single-index convoy. The decision is to keep saying the live day is hot.`,
      question:
        'Today's date partition cannot take the insert rate on one index. Propose a split or a queue that cools that key. Say plainly what skew remains after you do it.',
      hints: [
        'A hash underneath the date spreads today without sending new rows into last month.',
        'Any read of the whole day now has to visit every child you created.',
      ],
      outline: [
        'Subpartition the live day by hash of event_id into 16 children.',
        'Inserts for today spread across 16 indexes instead of one.',
        'The 16 children of today stay hot. Older days stay idle.',
        'A full-day query touches all 16. The time skew remains.',
      ],
      solution: `Split the daily range partition by hash of event_id, modulus 16. PostgreSQL already supports a range partition that is itself partitioned. Keep occurred_on as the route into today. Add the hash so two events on the same day with different ids use different children. Inserts no longer queue on one btree. You get 16 page-split domains and 16 sets of index locks for the live day. That is the cool-down: the hot key's value, today, has more than one physical destination.

Say what remains. All 16 children are still "today," and they still take essentially all of the write rate. A day from last month is still quiet. You widened the hotspot. You did not remove the reason it exists, which is that writers stamp the current date. A query that counts today's events now plans 16 scans and merges them. A query that detaches an old day still detaches a range, and under it 16 hash children, so the operational win of dropping a day survives. Do not describe the table as evenly loaded. Describe it as a hot day with 16 doors. If 16 is not enough, raise the modulus. The calendar will not help you.`,
      rubric: [
        'The proposal splits the hot day into hash children, or an equivalent queue, and says how inserts spread.',
        'Time skew is still true afterward: the live children are hot and older days are not.',
      ],
      myth: [
        'Hashing the event id removes the skew because hash partitions are balanced by definition.',
        'The hash balances rows inside today. It does not move writes onto quiet days. The skew across time is still there.',
      ],
      context:
        'This is the same move as splitting a hot tenant into buckets. The tenant is still your largest customer. You stopped making one lock do all of their work.',
      tradeoff: 'Sixteen children cool the latch and make every whole-day query a 16-way merge. One child keeps whole-day queries simple and caps ingest at one index.',
      mistake: 'Creating 16 hash partitions of the whole table with no date, then claiming you can still drop a day in one metadata operation.',
      followUp: 'What does a query for one event_id on a known date do after the split, if you have both values?',
      extension: 'How do you raise the modulus later without rewriting history that is already cold?',
      alternative: 'A queue in front of the insert, with workers draining into the daily partition at a controlled rate, cools the latch by adding delay. The rows still land on today's key. The queue length is the skew, now visible as lag.',
    },
  },
  'postgresql-ops': {
    morning: {
      title: 'The commit that replay can see',
      why: 'After a crash, people look for the last checkpoint and assume that is how far the data got. The commit survived because its WAL was flushed. The checkpoint only decided where replay starts.',
      explain: `With synchronous_commit on, a transaction's commit returns after PostgreSQL has flushed that commit record to the WAL on disk. The heap page can still be dirty in shared buffers. Durability of the commit is the WAL flush, not a write of the data file. If the process dies in that window, the row is not in the data file yet and it is still durable, because the WAL has the commit.

A checkpoint writes those dirty buffers out and records a redo location in the WAL. Recovery after a restart does not replay the entire history of the cluster. It starts at the last checkpoint's redo LSN and replays WAL from there, including commit records that happened after the checkpoint. A commit that flushed and was not checkpointed yet is redone and remains. A transaction that had no commit record, or whose commit was not flushed because synchronous_commit was off, does not come back. The checkpoint exists so replay is bounded and so old WAL can be recycled once replicas and the archive have it. It is not a second commit. Turning fsync off, or treating a checkpoint timestamp as "what we saved," is the failure. The decision is: WAL flush makes the commit durable, the checkpoint bounds restart, restart replays from that bound.`,
      question:
        'Connect WAL, checkpoints, and a restart. A transaction commits, the checkpoint has not run yet, and the process crashes. Is the transaction still there when PostgreSQL comes back, and why?',
      hints: [
        'Ask whether the commit record reached disk in the WAL, not whether the heap page was written.',
        'Recovery starts at the last checkpoint and moves forward through later WAL.',
      ],
      outline: [
        'synchronous_commit on means commit waits for a local WAL flush.',
        'A checkpoint writes dirty buffers and records the redo LSN.',
        'Restart replays WAL from that redo LSN, including later commits.',
        'The flushed commit is still there. The checkpoint is not what saved it.',
      ],
      solution: `The transaction is still there, provided synchronous_commit was on and the commit call had returned. Returning means the commit record was flushed to WAL. The data file did not need to contain the row. On restart, PostgreSQL finds the latest checkpoint and replays WAL from its redo location through the end of the log. The commit record is in that range, because it was written after the checkpoint and it is still on disk. Replay inserts or updates the row again and the transaction is visible. That is the connection: WAL is the durability, the checkpoint is the start line for replay, and the restart is replay.

If the crash happened before the WAL flush, the client should not have been told success, and recovery will not show the transaction. If someone set synchronous_commit off, the client may have been told success and the crash can still drop the commit, because the record was only in the OS cache or in WAL buffers. A checkpoint that finished after the commit would also have saved the row via the data files, and you do not need that race. Do not delay acknowledgements until the next checkpoint. Do not delete WAL you have not checkpointed past, and do not delete WAL a replica still needs. The restart you want is a bounded replay of flushed commits, not a restore from the last time dirty buffers happened to be written.`,
      rubric: [
        'The commit survives because its WAL record was flushed, and recovery replays it from the checkpoint redo point.',
        'The checkpoint is described as the replay boundary, not as the thing that made this commit durable.',
      ],
      myth: [
        'PostgreSQL saves your commit when the next checkpoint writes the data files.',
        'The checkpoint bounds recovery. The flushed WAL is why a commit that has not been checkpointed yet still returns after a crash.',
      ],
      context:
        'This is the mechanics under a crash loop, a killed backend, and a host that lost power. The question in the review is which commits the WAL still has, not when the last checkpoint finished.',
      tradeoff: 'More frequent checkpoints shorten crash recovery and write more dirty data more often. Rare checkpoints lengthen recovery and let writers dirty a lot of buffers between them.',
      mistake: 'Setting synchronous_commit off to make inserts faster and expecting a crash to keep every commit the client was shown.',
      followUp: 'What does recovery do with a transaction that updated rows and never wrote a commit record?',
      extension: 'Why can WAL from before a checkpoint still be required by a replica or by an archive?',
      alternative: 'synchronous_commit = off acknowledges before the flush and shortens the apparent commit time. A crash can remove those acknowledged transactions. That is a different durability contract, not a faster checkpoint.',
    },
    evening: {
      title: 'Commits wait, selects do not',
      why: 'Writes have stalled and reads look fine. Restarting, or adding a replica, is a guess. The sessions that are stuck already say whether they are waiting on a disk, a standby, or a lock.',
      explain: `Reads continue, so the postmaster is up, shared buffers are serving selects, and you are not in a total outage. Writes stall when COMMIT, or the statement that must flush WAL, cannot finish. That wait is visible on the session. Look at pg_stat_activity for backends that are not idle. Read wait_event_type and wait_event next to the query text. A writer in WALWrite or WALSync is stuck on the WAL volume. A writer in SyncRep is stuck because a synchronous standby has not confirmed the flush. A writer in Lock is stuck on another transaction, which may be one hot row rather than the disk.

Check that before you restart PostgreSQL or add capacity. A restart when the WAL disk is full comes back into the same full disk. A new replica does not unblock SyncRep until it is the standby the primary is waiting for, and creating it during the stall is the long way around. The failure you are sorting is "every commit waits" versus "one lock waits." Reads surviving points you at the commit path, because a select does not flush WAL and does not wait for synchronous replication. The decision is the first query: the wait events of the sessions that are trying to write.`,
      question:
        'Writes stall and reads continue. Say what you check first, and how that check tells a stuck WAL disk or a silent synchronous standby apart from a lock.',
      hints: [
        'The stalled sessions have a wait event. Start there, not at a restart.',
        'SELECT does not flush WAL. A wait that only commits hit is on the commit path.',
      ],
      outline: [
        'Read pg_stat_activity for non-idle writers and record the wait event.',
        'WALWrite or WALSync points at the WAL disk. SyncRep points at the standby.',
        'Lock points at a blocker, which may be one row rather than the volume.',
        'Restarting or adding a casual replica is not the first move.',
      ],
      solution: `Check pg_stat_activity first. Filter to sessions that are not idle and look at wait_event_type, wait_event, and the query. If the stalled writes show IO and WALSync or WALWrite, the WAL volume is slow or full. Check that filesystem before you change a query or restart. If they show IPC and SyncRep, the primary is waiting for a standby named in synchronous_standby_names. Look at pg_stat_replication for a peer that is disconnected or not flushing. Reads continue in both cases because they do not take that wait.

If the wait is Lock, you do not have a WAL stall. You have a blocker. pg_blocking_pids on the waiting session tells you who. That can stall many writers if they all touch one row, and it still is not fixed by a replica. The reason this is the first check: the three causes look the same from a client timeout and they are different repairs. Restarting into a full WAL disk repeats the outage. Adding a read replica does not acknowledge synchronous replication. Killing a lock holder you have not identified rolls back work you did not mean to lose. The wait event is the sort. Do it before the dramatic step.`,
      rubric: [
        'The first check is the wait event of the stalled writers in pg_stat_activity.',
        'WALSync or WALWrite, SyncRep, and Lock are separated as disk, standby, and blocker.',
      ],
      myth: [
        'If reads work and writes do not, the table is locked and you should restart the database.',
        'Reads can succeed while commits wait on WAL I/O or a synchronous standby. The wait event says which, and a restart is not that evidence.',
      ],
      context:
        'This is the page you get when a WAL disk fills, when a sync replica across a bad link stops acknowledging, or when one session holds a row and then calls a slow HTTP endpoint.',
      tradeoff: 'Waiting to collect the wait event costs a minute at the start of an incident and prevents a restart that makes it worse. Restarting immediately feels decisive and repeats the stall if the disk is still full.',
      mistake: 'Adding a new read replica because writes are slow, without noticing the primary is stuck in SyncRep on the existing standby.',
      followUp: 'What do you look at on the host if the wait event is WALSync?',
      extension: 'How does a checkpoint writing data files on the same disk as the WAL show up next to these waits?',
      alternative: 'log_lock_waits and a sampled pg_stat_activity from a script give you the same sort without opening a console. The script still has to record the wait event, or it is just another graph of "sessions are active."',
    },
  },
  'document-modeling': {
    morning: {
      title: 'The cart is one read',
      why: 'A cart page loads one shopper's items, prices, and quantities together. Modeling them as a graph of rows you always join is a relational habit. The access is an aggregate.',
      explain: `The cart is the aggregate. Its identity is the shopper. In MongoDB the document _id is the user id. Inside it, items is an array of sku, quantity, and the unit price copied when the shopper added the sku. The cart page reads this document and renders it. It does not look up each sku in a catalog collection to find out what the shopper currently holds. One round trip, one consistency boundary: the items change together when the shopper edits the cart.

Leave the catalog and the stock count outside. The catalog is a different aggregate, shared by every shopper, with its own edit rate. Stock is a third, decremented when someone pays, not when someone stares at a cart. Embedding either one would copy a shared fact into every cart and make a price change or a stock change a rewrite of every shopper. Copying unitPriceCents at add-to-cart time is deliberate: the open cart does not change because merchandising edited the catalog. The failure is a document that contains whatever the page happened to display, including data owned by someone else. The decision is the boundary: one shopper's current items in, shared stock out.`,
      question:
        'Model a shopping cart as a document aggregate that is read together. Say what is inside the document, what stays outside, and why the unit price can be copied onto the item.',
      hints: [
        'The document key is the shopper, because that is the read.',
        'Stock and the catalog are shared and change on a different schedule from one cart.',
      ],
      outline: [
        'One document per shopper, keyed by user id, holds the cart items.',
        'Each item stores sku, quantity, and the unit price from add-to-cart time.',
        'The catalog and the stock count stay out of the cart document.',
        'The cart page reads that one document and does not rejoin the catalog.',
      ],
      solution: `Key the document by user id. Store items as an embedded array. Each element has sku, qty, and unitPriceCents set when the shopper adds the sku. updatedAt sits on the document so a write has a version you can see. The cart page loads this document by id and renders it. Adding, changing quantity, and removing an item are updates to this aggregate, and they are the writes you expect to make together. A cart does not have meaning as a pile of item rows fetched from five collections for this page.

Keep products in their own collection, and keep stock in its own. Those are read and written on different paths: merchandising edits a product, checkout decrements stock for a sku that many carts mention. If you embed the product manual or the live stock into the cart, every catalog edit or every purchase rewrites unrelated carts, and two carts can disagree about a stock figure that was supposed to be one number. The copied unit price is not that mistake. It is the price the shopper was offered, and it should survive a later catalog change. If the business rule is "carts always show the latest price," you stop copying and you read the catalog. That is a different aggregate boundary. This one matches a cart that is read as a whole and priced when it changes.`,
      rubric: [
        'The cart document is one shopper's items, read as a single document, with sku, quantity, and captured price.',
        'Catalog and stock stay outside because they are shared aggregates with their own writes.',
      ],
      myth: [
        'A document database means putting the whole page, including live stock and the catalog entry, into one JSON blob.',
        'The document is the aggregate you read and write together. Shared data with its own lifecycle stays a reference, or you copy it on purpose at a moment you can name.',
      ],
      context:
        'Draft orders, support tickets with their messages, and a booking with its passengers follow the same cut: embed what the screen loads, reference what other screens update on their own.',
      tradeoff: 'Embedding items makes the cart one read and makes a shared stock figure the wrong thing to embed. Referencing every sku keeps stock honest and makes the cart page a fan-out of reads.',
      mistake: 'Embedding the current warehouse stock on each cart item so the page can show "12 left" without a second read.',
      followUp: 'What does the cart document show after merchandising changes the catalog price?',
      extension: 'How would you model a saved shipping address that several carts and the profile all edit?',
      alternative: 'Storing each cart item as its own document keyed by user id plus sku makes a single-item update smaller and makes the cart page a query for many documents. Use that when carts get large enough that the array rewrite hurts.',
    },
    evening: {
      title: 'Marking one notification read',
      why: 'The profile document got the feed pasted into it because the app loads them on one screen. The write the user actually performs is one flag, and the database rewrites the entire history.',
      explain: `The user document contains the name, the preferences, and a feed array of every notification, each with a body and a read flag. The screen loads the profile and the latest notifications together, so someone embedded them. The common write is not "replace the user." It is "notification 442 was opened." In MongoDB that update produces a new stored version of the whole document: name, preferences, and every feed entry, to flip one boolean.

As the feed grows, the write gets more expensive and the document moves toward the 16 MB BSON limit, even though the change is a bit. A second device marking a different notification read rewrites the same large value and can lose the first flag if you replace the array from a stale copy. The failure is a document shaped for a convenient read and punished on the common update. The decision is to stop embedding the feed. The user document keeps name and preferences. Each notification is its own document, small enough that "mark read" rewrites one notification. The screen issues two reads. That cost is the point of the split.`,
      question:
        'Show a document shape that makes one common update rewrite too much. Use a user document that embeds the whole notification feed, and the update that marks one notification read.',
      hints: [
        'Compare the size of the change the user made with the size of the document the storage engine writes.',
        'The 16 MB document limit is the wall at the end of an array that only grows.',
      ],
      outline: [
        'The user document embeds profile fields and the entire feed array.',
        'Marking one notification read rewrites that whole document.',
        'The write grows with the feed and contends with every other feed update.',
        'Split notifications into their own documents so the common update stays small.',
      ],
      solution: `The shape is a user document whose feed array holds every notification. Marking one item read is an update to that document. The logical change is one flag. The stored change is a new version of the whole BSON: profile, preferences, and the full history. Two clients that each read the document, change a different flag, and write the array back will drop one of the flags. The write amplification is the bug you can measure: bytes written per "mark read" climb as the user accumulates notifications, and a large enough feed hits the 16 MB limit and the update fails outright.

Split it. The user document stores the name and the preferences, which change rarely and are read as a unit. Notifications are separate documents, each with user id, notification id, body, and read. Marking one read updates one small document. Loading the screen is a point read plus a query for the latest notifications for that user. You pay a second round trip so the common write stops copying the profile. Embedding the latest handful and archiving the rest is a compromise that still rewrites the embedded handful on every flag, and it needs a rule for which ones stay embedded. The failure to avoid is the unbounded array inside the user. The feed looked like part of the user until you named the update.`,
      rubric: [
        'The embedded feed makes a one-flag update rewrite the whole user document, and that cost grows with history.',
        'The replacement stores notifications as separate documents so the common write is one small update.',
      ],
      myth: [
        'If the page reads the profile and the feed together, they belong in one document.',
        'Read-together is the test for an aggregate until the common write touches one element of a growing array. Then the write, not the first page load, sets the boundary.',
      ],
      context:
        'Chat threads embedded in a user, order history embedded in a customer, and audit entries embedded in an account all pass the first demo and fail on the update that appends one element.',
      tradeoff: 'One document serves the profile screen in a single read and rewrites history on every flag. Separate notification documents keep the flag small and make the screen two reads.',
      mistake: 'Replacing the feed array from a client copy on every "mark read," so two devices clobber each other's flags and also rewrite the profile.',
      followUp: 'What happens to mark-read when the embedded feed finally exceeds the document size limit?',
      extension: 'How would you migrate an existing embedded feed into per-notification documents without missing a flag the user just set?',
      alternative: 'Embedding only the unread notifications keeps the array shorter and still rewrites every unread item when one of them flips. It works while unread stays tiny, and it needs a place to put the item the moment it becomes read.',
    },
  },
  'redis-durability': {
    morning: {
      title: 'Thumbnails in a stream',
      why: 'A Redis queue is not durable because Redis is up. The structure decides whether a dead worker drops the job. The persistence setting decides whether a dead Redis drops the jobs it already accepted.',
      explain: `The job is thumbnail generation. The original image is already in object storage. A worker must produce a thumbnail and write it back. The structure that matches is a Redis stream, with a consumer group. The API XADDs a job. A worker XREADGROUPs it, writes the thumbnail, then XACKs. If the worker dies after the read and before the ack, the entry stays pending and another worker can claim it. A pub/sub channel would drop the job if nobody was subscribed at that instant. A list with RPOP removes the job as the worker takes it, so a crash in the middle loses it.

The persistence setting that matches is AOF with appendfsync everysec. Restart loads the stream, including jobs not yet acknowledged, as of the last fsync. You accept about a second of hole because a sweeper can scan object storage for originals older than a minute with no thumbnail and XADD them again. appendfsync always would fsync every accepted job and cap intake at the disk. This job does not need that. RDB snapshots alone would stretch the hole to the snapshot interval. The decision is stream plus everysec, and a sweeper for the hole you just chose.`,
      question:
        'Match a Redis structure and a persistence setting to thumbnail jobs. The original image is in object storage. A worker that crashes mid-job must not drop it. A Redis crash may lose a short window, because a sweeper can requeue.',
      hints: [
        'Pick a structure that keeps an entry until the worker acknowledges it, not one that forgets when the subscriber is gone.',
        'everysec matches a hole a sweeper can fill. Fsync on every job is a different budget.',
      ],
      outline: [
        'Use a stream and a consumer group: XADD, XREADGROUP, XACK.',
        'A worker crash leaves the entry pending for another worker.',
        'AOF appendfsync everysec reloads acknowledged-to-disk entries after a Redis restart.',
        'A sweeper requeues uploads that missed the one-second hole. Pub/sub and a bare RPOP do not fit.',
      ],
      solution: `Use a stream named for thumbnails, a consumer group for the workers, and AOF with appendfsync everysec. The producer XADDs the object key. A worker reads with the group, writes the thumbnail to object storage, and XACKs. Pending entries are the jobs a worker took and did not finish. That is why the structure is a stream and not pub/sub, and not a list you RPOP from. Pub/sub has no stored entry. RPOP deletes the entry at the moment the worker is least done.

everysec is the persistence setting because this job has a repair path. On a Redis restart you keep every XADD the AOF thread fsynced, and you can lose about a second of XADDs that had already returned OK. The sweeper lists originals without thumbnails and enqueues them again, so that second does not become a permanent missing image. Choose appendfsync always only if you cannot sweep and a lost accepted job is a lost thumbnail forever. Choose no AOF only if Redis is a hint and the sweeper is the real queue, in which case you should say that plainly and not pretend the stream is durable. The match is the structure for worker crashes and the setting for a Redis crash you can repair.`,
      rubric: [
        'The structure is a stream with a consumer group, so an unacked job survives a worker crash.',
        'The setting is AOF appendfsync everysec, matched to a sweeper that can refill a short hole.',
      ],
      myth: [
        'Redis persistence does not matter if you use a consumer group, because the group remembers the jobs.',
        'The group is data in Redis. If the process dies and the AOF never got the XADD, the group has nothing to remember.',
      ],
      context:
        'Webhook deliveries and image pipelines get this wrong in the same way: a list for the happy path, no AOF, and a worker that dies after the pop. The thumbnail is the version you can still see in a bucket.',
      tradeoff: 'everysec keeps XADD throughput high and leaves a one-second hole for the sweeper. appendfsync always closes that hole and makes every enqueue wait for disk.',
      mistake: 'Using pub/sub because the workers are "usually" connected, so a deploy that restarts them drops every publish during the gap.',
      followUp: 'What does a second worker do with an entry that stayed pending after the first worker died?',
      extension: 'What changes about the setting if there is no sweeper and the stream is the only record of the job?',
      alternative: 'BRPOPLPUSH into a processing list keeps a job after the pop, which a bare RPOP does not. You still need AOF for a Redis crash, and a stream's pending entries are the clearer version of the same idea.',
    },
    evening: {
      title: 'The second Redis did not fsync',
      why: 'The producer got OK from XADD and moved on. The crash took the AOF tail with it. The thumbnail queue does not contain those jobs, and nothing in the API log looks like a failure.',
      explain: `You chose appendfsync everysec. Redis replies to XADD before the background thread fsyncs the AOF, and that thread runs about once a second. A crash, a kill, or a power loss drops the commands that were answered and not fsynced. On the way back up, Redis loads the AOF it has. The stream is missing those thumbnails. The originals are still in object storage. The workers have nothing to read. The producer will not retry, because Redis said OK.

The window is about one second when the disk keeps up, and longer when fsync is late and writes continued. Jobs whose XADD was fsynced are still in the stream, still pending if nobody XACKed them. You did not lose the keyspace. You lost the tail. An XACK that was in the tail is a different wound: the job can be delivered again after restart, which is a duplicate thumbnail, not a missing one. The failure the setting creates is the silent hole. The decision is to have the sweeper look for originals with no thumbnail, and to treat a green XADD as "Redis accepted it," not as "it will survive this process."`,
      question:
        'Thumbnails use a stream with AOF appendfsync everysec. Explain what a Redis crash loses under that setting, and what is still there when the process comes back.',
      hints: [
        'The reply to the client and the fsync of the AOF are not the same event under everysec.',
        'Separate jobs that never reached disk from jobs that were fsynced and not yet acknowledged.',
      ],
      outline: [
        'everysec replies to XADD and fsyncs the AOF about once a second.',
        'A crash drops XADDs that returned OK and were not fsynced.',
        'Fsynced entries, including ones not yet XACKed, are loaded with the AOF.',
        'The hole is about one second, longer if fsync is late. The sweeper has to refill it.',
      ],
      solution: `The crash loses the XADD commands Redis already acknowledged and had not fsynced. Those jobs were visible to the producer as success and are absent from the stream after restart. Workers will not generate those thumbnails. The originals in object storage are untouched, because they were never in Redis. The loss window is about one second in the usual case. If the disk is slow and the fsync thread falls behind, Redis can acknowledge more than one second of writes, and the crash takes all of that tail. That is the setting you chose when you picked everysec.

What remains is the AOF prefix: every entry the fsync thread got to disk, whether or not a worker had XACKed it. Pending jobs in that prefix are still pending. Completed jobs whose XACK is in the lost tail can show up as pending again and run twice, which wastes work and should overwrite the same thumbnail key rather than create a second object name. You do not lose the whole stream, and you do not lose jobs that were only in a replica you did not configure. RDB would have lost back to the last snapshot. You did not choose RDB. Repair is the sweeper: anything older than the window, with an original and no thumbnail, gets a new XADD. Without the sweeper, everysec means a crash silently cancels a slice of accepted work.`,
      rubric: [
        'The loss is acknowledged XADDs not yet fsynced, about one second, longer if the disk is behind.',
        'Fsynced stream entries are still present after restart, and the sweeper is what fills the hole.',
      ],
      myth: [
        'Append-only file means every command that returned OK is on disk.',
        'Under appendfsync everysec, OK means the command is in memory and will be fsynced within about a second. A crash before that fsync drops it.',
      ],
      context:
        'This is the incident where the queue depth drops across a restart and nobody can find an error. The producers logged success. The AOF tail is the missing page.',
      tradeoff: 'everysec loses a short acknowledged tail and keeps enqueue latency low. appendfsync always loses that tail and makes every XADD wait on fsync.',
      mistake: 'Assuming the consumer group will redeliver the lost jobs after restart, when the XADD itself never reached the AOF.',
      followUp: 'What does the sweeper use as proof that a thumbnail job from the lost second is missing?',
      extension: 'What happens to a job whose XADD was fsynced and whose XACK was in the lost tail?',
      alternative: 'appendfsync always makes an acknowledged XADD durable across a process crash, at the cost of a disk sync on the produce path. A crash can still lose a command that had not been acknowledged yet, which the client should retry.',
    },
  },
  backups: {
    morning: {
      title: 'Sunday is the start, not the age',
      why: 'A base backup taken at 01:00 is not "data as of 01:00" once you keep the WAL. It is also not current if the WAL never left the primary. Age is how far you can replay.',
      explain: `A physical backup from pg_basebackup is a copy of the cluster files taken while PostgreSQL is running, plus backup_label marking the checkpoint where recovery must start. The copy is not consistent by itself. It becomes consistent when WAL is replayed through the stop-backup record. With archive_command shipping each WAL segment to object storage, later segments can roll the same backup forward past the moment the base copy finished. Roles and data files are in that physical copy. A logical pg_dump is a different artifact and is not what you have here.

How old a restore may be is the time of the newest WAL segment you can actually replay in a continuous chain, not the clock time on the base backup. If the archive is keeping up and archive_timeout is 60 seconds, the newest restorable commit is often about a minute old, even though the base backup is from Sunday 01:00. If a segment never reached the bucket, you cannot replay past that gap. Then the age jumps back to the last continuous point, which might be the end of the base backup. The decision is to describe contents and age in those terms. "We have a backup from Sunday" does not say either one.`,
      question:
        'Every night at 01:00 you take a pg_basebackup, and archive_command ships WAL to object storage with archive_timeout at 60 seconds. Define what this backup contains, and how old a restore from it may be.',
      hints: [
        'The base copy becomes consistent only after WAL is replayed through the end of the backup.',
        'The newest archived segment you really have is the age, not the filename of the base backup.',
      ],
      outline: [
        'The base backup contains cluster files and backup_label, not a consistent database by itself.',
        'Archived WAL after the backup start can roll the restore forward.',
        'Age is the latest continuous archived segment, often near a minute when archiving is healthy.',
        'A missing segment moves the age back to the last point you can reach.',
      ],
      solution: `The backup contains the physical cluster from pg_basebackup: data files, including globals such as roles, and backup_label for the start checkpoint. It contains enough WAL to reach consistency only if that WAL was included with the backup or is present in the archive. It does not, by itself, contain transactions committed after the backup ended. Those live in later WAL segments. If archive_command has been shipping them, a restore of Sunday's base backup plus the archive can replay to a later time. If it has not, those commits exist only on the primary's disk, which is the disk you are backing up because you might lose it.

How old the restore may be: with archive_timeout at 60 seconds and a healthy archive, you can usually reach a commit from about the last minute, because a segment is forced out within that interval and then has to finish uploading. Measure it by the newest segment in the bucket and the chain back to backup_label, not by "Sunday." If segment in the middle is missing or short, replay stops there and the practical age is that gap, which can be hours behind a base backup you thought was current. State both numbers when you talk about this backup. Contents: a base image plus a WAL chain. Age: the end of the chain you have, or the hole in it.`,
      rubric: [
        'The backup is described as a base image plus the WAL required to make it consistent and to roll forward.',
        'Age is the latest continuous archived WAL, not the clock time of the base backup.',
      ],
      myth: [
        'The timestamp on the nightly base backup is how old the data is.',
        'That timestamp is when the base copy started. With archived WAL the restore can be much newer, and with a broken archive it can be stuck at the base copy.',
      ],
      context:
        'This is the conversation after someone asks "what is our RPO?" and the answer "we back up every night" does not match an archive that is actually minutes behind.',
      tradeoff: 'A short archive_timeout keeps the newest restorable time close to now and ships more partial segments. A long one reduces archive chatter and extends how much committed work exists only on the primary.',
      mistake: 'Deleting the WAL archive because the base backup file is present and looks large enough to be the whole database.',
      followUp: 'What is the age if the newest archived segment is four hours old and the base backup is from last night?',
      extension: 'What does a logical pg_dump contain that this base backup plus WAL does not restore the same way?',
      alternative: 'A pg_dump taken at 01:00 contains a consistent logical snapshot as of the dump and cannot roll forward through later WAL. Its age is the dump time, up to a day, which is a different product from this physical backup.',
    },
    evening: {
      title: 'The segment that never landed',
      why: 'The bucket has thirty days of base backups and a graph of object counts that looks alive. Nobody has replayed them. The first time you need a database, a hole in the WAL chain is when you learn you do not have one.',
      explain: `An object in a bucket is a file. A backup is a restore you have finished. You have not proven the base copy is complete, that backup_label matches WAL you still have, or that archive_command told the truth. A common lie: the archive command returns success, the script times out or the upload ends early, and segment 000000010000000A0000003C in the bucket is missing or short. Every check that counts objects stays green. Recovery is the first reader that needs that exact segment, and it stops.

Until you restore, you also do not know that the backup is the cluster you think it is. A killed pg_basebackup can leave a directory your uploader stored. A second tool can be uploading an empty file on a schedule that looks like freshness. The failure is a chain you have never asked PostgreSQL to replay. The decision is to stop calling the bucket a backup. The proof is a restore that reaches consistency and returns a row you expect from a time you named.`,
      question:
        'You have thirty days of pg_basebackup artifacts in object storage and you have never restored one. Explain why that is not a backup, using the WAL chain as the concrete failure.',
      hints: [
        'archive_command can report success and still leave a segment the next restore cannot read.',
        'Object counts do not start PostgreSQL and do not run recovery.',
      ],
      outline: [
        'A base backup is usable only with a continuous WAL chain from its start.',
        'A missing or truncated segment stops recovery, and upload metrics can still look fine.',
        'A partial base copy can sit in the bucket with a plausible size and timestamp.',
        'A backup is the restore you have done to a consistent database and a known row.',
      ],
      solution: `It is not a backup because you have never shown that recovery can replay it. The base file needs every WAL segment from the checkpoint in backup_label through the stop-backup record, and any later segment you meant to include. If segment 000000010000000A0000003C never finished uploading, and archive_command still returned zero, the primary kept running and your dashboards counted a success. On restore, PostgreSQL asks for that segment, cannot build a consistent cluster, and stops. The files on either side of the hole do not help. WAL is a sequence. A gap is the end of the backup, and you discover the gap at the moment you needed the database.

A restore drill is the test that reads backup_label, fetches the chain, reaches consistency, and selects a payment you know existed at the target time. Without that, a growing bucket is compatible with a partial tar, a wrong cluster, and a year of green archive metrics. Do not treat "we can see the object" as "we can serve traffic from it." Schedule the replay. When it fails on a missing segment, you still have the primary, and you can fix archive_command. When you discover the same hole during an outage, the bucket is a museum of files. The word backup belongs to the one you have restored.`,
      rubric: [
        'The failure is a WAL chain that has not been replayed, with a missing or short segment as the concrete break.',
        'Metrics on the bucket are rejected as proof. A finished restore to a known row is the proof.',
      ],
      myth: [
        'If the backup object exists and is recent, you have a backup.',
        'You have a file. A backup is a chain PostgreSQL has replayed to a consistent state. Existence in a bucket does not do that replay.',
      ],
      context:
        'The same gap shows up with a volume snapshot that does not include the WAL disk, or a dump job that exits non-zero and still uploads a partial file the monitor never opens.',
      tradeoff: 'Restoring on a schedule costs a host and engineering time and finds a broken segment while the primary is alive. Skipping the restore saves that host and moves the discovery into the incident.',
      mistake: 'Alerting on the age of the newest object in the bucket and never checking that consecutive WAL names are present.',
      followUp: 'What does recovery print when the needed WAL segment is absent, and what state is the data directory in then?',
      extension: 'How would you test that archive_command only returns success after the segment is fully readable from the bucket?',
      alternative: 'A tool that restores every backup into a scratch instance and runs a checksum query is the same proof, automated. A tool that only lists object names is the dashboard you already have.',
    },
  },
  'restore-drills': {
    morning: {
      title: 'From the bucket to a writer',
      why: 'A restore that ends with files on disk is not a database you can serve. Something has to replay, something has to promote, and the old primary has to be unable to take a write.',
      explain: `Walk it in order. Use a host whose PostgreSQL major version matches the backup, with the same extensions installed as shared libraries the cluster will load. Stop any empty instance the package started. Replace its data directory with the base backup and confirm backup_label is there. In postgresql.conf set restore_command so it fetches the WAL segment name from the archive. Create recovery.signal in the data directory. If you need a point in time, set recovery_target_time and recovery_target_action to pause. Start PostgreSQL. It replays until the cluster is consistent and until your target, then pauses if you asked it to.

Connect and select a row you know existed at that time, a specific payment id, not a count of tables. Then promote with pg_promote so it stops recovering and accepts writes. Insert a canary row and read it back. The database is serving only after that, and only after you fence the old primary. If the old primary still has its address and its clients, it will take writes the new one will never see. Revoke its network identity or shut it down before you move the application. The failure is a restored host that cannot replay, or two writers. The decision is this sequence, including the fence, practiced when you do not need it.`,
      question:
        'Walk the steps from a base backup and a WAL archive to a database the application can use as its writer. Include how you know replay worked, and what you do with the old primary.',
      hints: [
        'recovery.signal and restore_command are what turn a data directory into a replay.',
        'Promotion is a separate step from replay. The old primary must lose the ability to accept writes.',
      ],
      outline: [
        'Lay the base backup on a host of the same major version, with the extensions installed.',
        'Set restore_command, add recovery.signal, and start PostgreSQL so it replays.',
        'Read a known row, promote, and confirm a new write.',
        'Fence the old primary before the application points at the new one.',
      ],
      solution: `Start with a matching major version and the extensions the cluster loads. Put the base backup in the data directory and check that backup_label exists, so you are not replaying onto a leftover cluster. Point restore_command at the archive. Add an empty recovery.signal. Set a recovery_target_time only if you must stop short of the end of the WAL. Start the server and watch the log until recovery reports the database is consistent and, if you set a target, that it is paused there. If it is asking for a segment and not getting one, you are not ready to serve. Fix the fetch before you talk about traffic.

Prove the data: select one payment id you recorded when that payment was created, at a time your target should include. Then pg_promote(). The server leaves recovery and will take writes. Insert a canary and read it. Only then move the application connection string. Before that move, fence the old primary: security group, DNS, or power, something that makes its commits stop. A restore that leaves the old primary writable is two databases. Clients will split. The serving database is the one that replayed, promoted, accepted a write, and is the only writer the application can reach. Practice the walk until the slow part is the WAL download and not a debate about the next command.`,
      rubric: [
        'The walk includes a matching version, restore_command with recovery.signal, replay, a known-row check, and promotion.',
        'The old primary is fenced before the application uses the new host as its writer.',
      ],
      myth: [
        'Once the base backup is copied onto a new disk, you have a serving database.',
        'You have files. Serving starts after replay reaches consistency, you promote, a write succeeds, and the previous primary cannot still accept commits.',
      ],
      context:
        'This is the drill for a failed primary, a bad migration you must rewind past, or a region you are standing up from the archive. The steps do not change because the incident is stressful.',
      tradeoff: 'Pausing at a recovery target lets you inspect before you promote and adds a step you can forget, leaving the server read-only. Replaying to the end of the WAL promotes a hotter copy and gives you no moment to look.',
      mistake: 'Pointing the application at the new host while it is still in recovery, so writes fail and someone re-enables the old primary.',
      followUp: 'What do you do if the known payment id is missing and the recovery target was "latest"?',
      extension: 'Which clients reconnect to the new writer, and which ones cache the old address?',
      alternative: 'A replica that is already warm, promoted in place, skips the base-backup copy when it has been applying continuously. You still fence the old primary and still confirm a write. The cold restore from the bucket is the path when that replica died too.',
    },
    evening: {
      title: 'Recovery asks, the archive says no',
      why: 'The version matched and the server started. The drill still never reaches a consistent database. The command that fetches WAL is the step with a new host's identity, and that identity is the one people forget.',
      explain: `The drill host is the same major version as the backup. PostgreSQL starts, which it will not do if the data directory was written by a different major version: that fails early with a message that the files are incompatible with the server. It also got far enough to enter recovery, so a config error that prevents startup, such as ssl_cert_file pointing at a path only the old host had, is not what you are looking at. The log shows restore_command exiting non-zero. The output is AccessDenied, or a missing profile, from the object store.

The step that failed is credentials. The new host does not have a principal that can read the WAL bucket. The primary did, because its instance role was attached years ago and never copied into the drill script. Version was the check you already passed by booting this data directory. An unrehearsed config change fails the start, before replay asks for a segment. This failure happens one step later: startup succeeded, recovery cannot fetch, and PostgreSQL retries restore_command until someone notices the 403. The decision is to fix the archive identity for the drill host and to put that identity in the drill, not only on the primary.`,
      question:
        'A restore drill uses the same PostgreSQL major version as the backup. The server starts, then never leaves recovery. The log shows restore_command failing with AccessDenied. Of credentials, version, or an unrehearsed config change, which failed, and what would the other two have looked like?',
      hints: [
        'A major version mismatch dies at startup, before recovery fetches WAL.',
        'AccessDenied is the archive client talking to the bucket, not PostgreSQL rejecting a GUC.',
      ],
      outline: [
        'The server entered recovery, so the data directory version was acceptable.',
        'restore_command fails with AccessDenied from the object store.',
        'The failed step is credentials for the drill host to read the archive.',
        'A bad config path would have stopped startup. A version mismatch would have too.',
      ],
      solution: `Credentials failed. restore_command is running and the archive is refusing the caller. The drill host's role, key, or profile cannot read the bucket. PostgreSQL will sit in recovery and retry. The data you restored is fine. The identity around it is not. Look at the command stderr in the log: a 403, an expired key, or a profile that exists on the primary and was never granted to this instance. Attach the right principal, confirm the same command can fetch the segment name recovery is asking for, and let the retry proceed. Do not rebuild the base backup to fix a denial.

Version would not look like this. A data directory from a different major version fails at startup, before restore_command runs, with an incompatibility between the files and the server. An unrehearsed config change looks like a GUC the new host cannot honor: a certificate path, a socket directory, a shared_preload_libraries entry whose .so is not installed. Those abort startup. You got past them, because recovery started and then could not fetch. The step drills miss, once the package version is in the script, is the archive credential that lived only on the old machine. Put it in the drill checklist beside the version, or the next host will boot and wait in the same place.`,
      rubric: [
        'Credentials are named, with restore_command and AccessDenied as the evidence.',
        'Version and a bad config path are distinguished as startup failures, which this drill already passed.',
      ],
      myth: [
        'If PostgreSQL will not finish recovery, the backup was taken with the wrong server version.',
        'A version mismatch stops the server from starting on that data directory. A server that is retrying restore_command has already accepted the version and cannot read the archive.',
      ],
      context:
        'New accounts, new regions, and a laptop restore for a drill all have a primary that can read the bucket and a second machine that cannot. The backup did not move the permission with the files.',
      tradeoff: 'Giving every drill host long-lived archive credentials makes the drill work and spreads a key that can read every WAL segment. Using a short-lived role makes the drill script request access on purpose and fails closed when someone skips that request.',
      mistake: 'Re-copying the base backup or upgrading PostgreSQL because recovery is retrying, without reading the restore_command exit status.',
      followUp: 'How do you check the archive fetch without waiting for PostgreSQL to retry restore_command?',
      extension: 'What unrehearsed config change would have stopped this host before recovery, and where would it appear in the log?',
      alternative: 'Shipping WAL to a second bucket the drill account already owns avoids using the primary's role and doubles the archive cost. The drill then fails on a bucket you control, which is a clearer credential story.',
    },
  },
  'data-model-choice': {
    morning: {
      title: 'The ledger stays in PostgreSQL',
      why: 'A transfer touches two balances and a history row, and it must not apply twice. That is a transaction and a constraint. The store you pick is the one that makes that the ordinary path.',
      explain: `The workload is a wallet. A transfer debits one account and credits another, the debited balance cannot go below zero, a retried request must not post a second transfer, and support lists every transfer for one account. Pick PostgreSQL. One transaction updates both balances with a conditional debit, inserts one ledger row, and relies on a unique idempotency key. Foreign keys tie the ledger to accounts that exist. The history query is an index on account id. WAL makes the commit durable when it has been flushed.

Reject Redis as the system of record. A Lua script can touch two keys on one node, and AOF appendfsync everysec can still drop a script the client was told succeeded. There is no foreign key from a ledger entry to both accounts, and a crash in that window loses money the API already acknowledged. Reject a document database as the home of the ledger too. Each account would be a document. The transfer writes two of them, so every payment is a multi-document transaction, the case that model makes expensive. Embedding the transfer in both account documents copies it, and one copy can be updated without the other. The failure is picking a store whose strengths are a single key or a single aggregate, for a write that is a constraint across two balances. The decision is PostgreSQL.`,
      question:
        'Pick one store for wallet transfers: debit one account, credit another, never go below zero, ignore a retry, and list history for one account. Reject Redis and a document database, with a reason for each.',
      hints: [
        'The ordinary write updates two balances and a ledger row, and those must commit together.',
        'A store that loses an acknowledged second, or that copies the transfer into two documents, fails this workload.',
      ],
      outline: [
        'Choose PostgreSQL for one transaction across both balances and the ledger row.',
        'A conditional update protects the debit. A unique key protects the retry.',
        'Reject Redis: a crash can drop an acknowledged write, and the history constraint is not a key.',
        'Reject documents: the transfer is two aggregates, so you copy it or you pay a multi-document transaction.',
      ],
      solution: `Pick PostgreSQL. The transfer is one transaction: a conditional update that subtracts only when the balance covers it, an update that adds to the other account, and an insert of the ledger row with a unique idempotency key. If the debit matches zero rows, the transaction rolls back and nothing is credited. Support's history query is an index range on one account id. Commit durability is the WAL flush you already counted on. This workload is rows, constraints, and a transaction. That is the product PostgreSQL is.

Reject Redis. Even with a Lua script that updates two balances atomically in memory, appendfsync everysec can lose an acknowledged transfer on a crash, and the client will not retry a call that returned OK. Making it appendfsync always still leaves you without a durable relational history: listing "every transfer that touched this account," including the other side, is a structure you would be inventing on top of keys. Reject a document store. An account document that embeds its transfers does not include the counterparty's view unless you copy the transfer into both documents, and those copies can diverge. A transfer collection with multi-document transactions pays the cross-document cost on every single payment, which is the whole workload, not the rare one. Choose PostgreSQL so the invariant stays one commit.`,
      rubric: [
        'PostgreSQL is chosen, with one transaction covering both balances, the non-negative debit, and the idempotency key.',
        'Redis is rejected for durability of acknowledged writes, and the document store is rejected because the write spans two aggregates.',
      ],
      myth: [
        'Any store with a transaction can hold a ledger, so the choice is whichever is fastest to prototype.',
        'The workload is a cross-row constraint on every write, plus a history query. A store built for one key, or for one document, makes that path the hard case.',
      ],
      context:
        'This is the choice people reopen when a demo used Redis for balances and the first crash deleted a deposit the UI had confirmed. The second demo embeds transfers in a user document and cannot show the other party.',
      tradeoff: 'PostgreSQL makes the transfer one commit and makes a single hot account a row-lock queue on one primary. Redis would spread keys and then lose the meaning of a commit that spans two of them across a crash.',
      mistake: 'Keeping balances in Redis for speed and writing the ledger to PostgreSQL afterward, so a crash between them debits a balance with no ledger row.',
      followUp: 'What does the unique idempotency key return to a client that retries a transfer that already committed?',
      extension: 'Which part of this decision changes if the product only stores a single-user shopping cart with no cross-account rule?',
      alternative: 'A document store can hold the ledger if every transfer is forced through a multi-document transaction and history is a single collection, not an embedded array. You are paying the model's weak case on the hot path, which is why it lost the choice.',
    },
    evening: {
      title: 'The region that cannot reach the primary',
      why: 'More reads are a replica. A region that must commit transfers while cut off from the primary is a different product. That requirement is the one that reopens the store.',
      explain: `You picked PostgreSQL because one primary can commit both sides of a transfer. Product now asks for two things. The balance page should take about ten times the reads. And a region must keep accepting transfers when it cannot open a connection to the primary region. Those are not the same kind of pressure. Reads of a balance that can be a moment late, or even a balance page that must be current, can be served by a replica or by the primary you already have. They do not change the commit path.

The partition does. A single primary cannot accept a commit in a region that cannot reach it. A replica in that region can serve reads and cannot take the transfer. If the requirement stands, the reason you chose one PostgreSQL primary is false. You reopen the store, and the new design needs a rule for two regions debiting one account while they cannot see each other. That rule might be "only the home region of the account accepts debits," which can stay PostgreSQL with a different topology, or it might be a ledger that merges conflicts. You do not reopen it for the read multiplier. The first requirement that forces the conversation is the write that must succeed while disconnected.`,
      question:
        'You stored the wallet in PostgreSQL. Product wants ten times the balance-page reads, and it wants a region to accept transfers during a network partition from the primary. State the first requirement that makes you revisit the choice, and why the other one does not.',
      hints: [
        'A replica takes reads. It does not take commits when the primary is unreachable.',
        'Reopening the store means naming a conflict rule for two debits, not only naming a new product.',
      ],
      outline: [
        'The partition requirement is the one that revisits the choice.',
        'One primary cannot commit a transfer for a region that cannot reach it.',
        'Ten times the balance reads is a replica, or primary capacity, not a new store.',
        'The revisited design needs a rule for two regions debiting the same account.',
      ],
      solution: `The first requirement that makes you revisit is that a region must commit transfers while it cannot reach the primary. The store you picked is one transactional writer. A network partition removes that writer from the region, and a replica there will not accept the insert. You cannot meet the requirement by adding nodes of the same primary. You have to decide, before you pick a technology, what happens when two regions both debit account 17 offline: one wins, both apply and you repair, or the account has a home region that is the only writer. That decision can send you back to PostgreSQL with a strict home region, or to something that merges divergent ledgers. Either way the original "one primary" choice is open again.

Ten times the balance-page reads does not revisit it. Add a replica, or read from the primary if the page authorizes a debit and must be current. The commit path stays the one you designed. Treating the read spike as a reason to move balances into Redis splits the ledger you just refused to split, and it does not help the region that cannot reach a writer. Order the requirements. The disconnected write is first because it falsifies the topology. The read multiplier fits inside the topology. If product drops the partition requirement, you close the choice and keep PostgreSQL. If they keep it, you write the conflict rule down before you name a database.`,
      rubric: [
        'The disconnected regional write is the requirement that reopens the choice, because one primary cannot commit there.',
        'The read multiplier stays on PostgreSQL with a replica or the primary, and does not by itself change the store.',
      ],
      myth: [
        'Any growth means the first database was the wrong choice and you should move the ledger.',
        'Growth of reads fits a replica. Growth of writers in a place that cannot reach the primary falsifies a single-primary design. Those are different requirements.',
      ],
      context:
        'This is the architecture review where "we need multi-region" arrives as one sentence and means either a read replica in another place or an active writer in each place. The store depends on which.',
      tradeoff: 'Keeping one primary preserves the transfer transaction and makes a partitioned region unable to debit. Allowing each region to write preserves availability and creates two debits you have to reconcile.',
      mistake: 'Moving balances to a regional Redis cluster to satisfy the partition, while the ledger stays on the original primary that the region cannot reach.',
      followUp: 'What rule do you want when two regions debit the last 40 dollars on account 17 while partitioned?',
      extension: 'How does a home-region rule let you keep PostgreSQL and still refuse a write in the wrong region?',
      alternative: 'Synchronous multi-region commit, waiting for a remote primary before success, keeps a single ledger and does not satisfy the requirement. The region that cannot reach the peer cannot commit. It is the current design with a longer wait.',
    },
  },
};
