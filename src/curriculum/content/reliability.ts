import type { LessonPair } from './publish';

export const reliabilityLessons: Record<string, LessonPair> = {
  'sli-slo': {
    morning: {
      title: 'An SLI a user would notice',
      why: 'A target that users cannot feel will stay green while checkout is broken. The indicator has to be something a person at the screen would recognize, and the objective needs a window.',
      explain: `An SLI is the measurement. For checkout it is the fraction of POST /checkout requests, seen in the edge access log, that return a status below 500 and finish in under 400 milliseconds. A user recognizes both parts: the payment failed, or it was slow enough to feel. CPU idle, process up, and "the pod is running" are not that fraction. They can all be true while the button spins.

An SLO puts a target and a window on that SLI. 99.9% of those requests, over a rolling 30 days, is an objective. 99.9% with no window is a target you cannot miss or meet, because you never said over what. The window is what makes a bad hour expensive and a bad minute survivable. Write the indicator and the objective as two sentences. Do not fold the measurement into the target and then argue about both at once.`,
      question:
        'Write one SLI for checkout that a user could recognize, and an SLO that uses it. Include the threshold, where you measure, and the time window. Leave contracts and credits out of it.',
      hints: [
        'Use the edge log of POST /checkout, not a host metric. Status and latency are what the user can tell apart.',
        'Put a percent and a window on that fraction. A percent alone does not say when you have failed it.',
      ],
      outline: [
        'The SLI is the fraction of POST /checkout that return below 500 and finish in under 400 milliseconds.',
        'It is measured at the edge access log, which is the hop the user actually waited on.',
        'The SLO is 99.9% of those requests over a rolling 30 days.',
        'Host CPU and process uptime are not the indicator, because a user cannot recognize them.',
      ],
      solution: `The SLI is the fraction of POST /checkout requests that return a status below 500 and complete in under 400 milliseconds, measured in the edge access log. That is the user's view of the button. A 500 is a failed checkout. A response slower than 400 milliseconds is a slow one. Measuring at the edge counts a gateway timeout as a failure even when the app never logged an exception. Measuring inside the handler would hide that, and the user would not agree with the graph.

The SLO is 99.9% of those requests over a rolling 30 days. The percent is the target. The 30 days is the window that stops you from declaring success on a quiet morning after a bad week. A calendar month is a reasonable alternative window if the business already talks that way. What is not acceptable is "99.9% uptime" with the indicator left as "the service is up." Uptime of a process is not checkout. Write the route, the status cutoff, the latency cutoff, the place you measure, and the window. That is the whole objective.`,
      rubric: [
        'The SLI is a user-visible checkout outcome, with a status cutoff and a latency cutoff, measured where the user waited.',
        'The SLO attaches a percentage and an explicit window, such as 99.9% over 30 days, to that same indicator.',
      ],
      myth: [
        'If the process is up and CPU is calm, the SLO is being met.',
        'Those are host facts. The SLO is a fraction of user requests over a window. A calm host can still fail checkout at the edge.',
      ],
      context:
        'The edge log is the same place a client timeout shows up when the handler still thinks it succeeded. The SLI belongs there so the objective and the user are counting the same events.',
      tradeoff: 'A 400 millisecond cutoff pages you on slowness users feel and pages you on a dependency that is merely slower than your guess. A multi-second cutoff stays quiet while the button feels broken.',
      mistake: 'Setting the SLO on the app process uptime and calling that checkout reliability.',
      followUp: 'A request is slow because the user is on a bad network after the bytes left your edge. Should this SLI count it?',
      extension: 'What second SLI would you add if a checkout that returns 200 in 100 milliseconds can still charge the wrong amount?',
      alternative: 'A synthetic probe that posts a fake checkout every minute measures the path when there is no traffic. It is a poor SLI for a 30-day objective, because it is not the users, and a good spare signal when real traffic is stopped.',
    },
    evening: {
      title: 'The objective is not the contract',
      why: 'An SLO tells the team when to act. A contract tells a customer when you owe them money. Using one number for both means you either page too late or pay on an internal target.',
      explain: `The SLO you wrote is an internal objective: 99.9% of checkout requests succeed, under 400 milliseconds, over 30 days. Missing it is a reason to page, to stop risky launches, to spend the error budget. Nobody outside the company is paid because you missed it. An SLA is the contract that does pay. It names a different, usually looser, threshold, a customer, and a credit.

Keep them apart on purpose. A workable split is an internal SLO at 99.9% and a contract that credits 10% of the month's fee if that customer's checkout success, over the calendar month, falls below 99.5%. You want to be in trouble with yourself before you are in debt to the customer. If the contract is the only number, you will discover the miss when finance does. If you paste the SLO into the contract, you owe credits for a target you set as an early warning.`,
      question:
        'Your SLO is 99.9% of POST /checkout requests succeeding under 400 milliseconds over a rolling 30 days. Define a contract that pays a customer when you miss a lower bar, and say why that contract is not the SLO.',
      hints: [
        'The contract needs a payee, a threshold, and a consequence. The SLO has none of those.',
        'Make the contractual threshold looser than 99.9%, so the internal miss happens first.',
      ],
      outline: [
        'The SLO stays 99.9% over 30 days and triggers an internal response, not a payment.',
        'The contract credits the customer 10% of the monthly fee if their checkout success drops below 99.5%.',
        'The contract window can be a calendar month, which is not the rolling SLO window.',
        'Missing 99.9% does not by itself pay anyone. Missing the contract does.',
      ],
      solution: `Leave the SLO as an internal target: 99.9% over a rolling 30 days, used to page and to decide whether you ship. The contract is separate. If a customer's checkout success over the calendar month is below 99.5%, they receive a credit of 10% of that month's fee. The 99.5% is the SLA. It is looser than the SLO so a slide from 99.9% to 99.7% hurts the team and does not yet write a credit. The windows differ too. Rolling 30 days is how you operate. The calendar month is how the invoice works.

The SLO is not the contract because nobody is paid when you miss it, and the contract is not the SLO because you should not wait for a credit event before you act. Put the SLO in the runbook. Put the SLA in the agreement. Do not call the SLO an SLA in the status page, or customers will treat 99.9% as the promise you pay on. The gap between 99.9 and 99.5 is the room you bought by keeping the words apart.`,
      rubric: [
        'The SLO remains an internal 99.9% target with no payment, and the contract is a looser threshold with an actual credit.',
        'The two are separated by who they bind and by when each one is allowed to fire.',
      ],
      myth: [
        'An SLO and an SLA are two names for the reliability target you show customers.',
        'The SLO is the internal line you operate to. The SLA is a contract with a credit. They should be different numbers so you hurt internally first.',
      ],
      context:
        'Status pages get this wrong in both directions. Some publish the SLO and then refuse credits they seemed to promise. Some publish nothing and page only when a customer asks for money.',
      tradeoff: 'A wide gap between 99.9% and 99.5% gives you room to burn budget without paying customers, and it lets reliability slide a long way before the contract cares. A narrow gap keeps the team honest and makes credits more likely.',
      mistake: 'Copying the SLO percentage into the customer agreement so the early-warning line becomes a financial promise.',
      followUp: 'You ran at 99.7% for the rolling 30 days and at 99.6% for a customer’s calendar month. Who is owed what?',
      extension: 'What do you tell a customer who asks you to raise the contractual 99.5% to match the internal 99.9%?',
      alternative: 'One number for both, with credits starting at the same 99.9% you page on, removes the gap. You will either page on noise you now owe money for, or you will loosen the page and find out from invoices.',
    },
  },
  'error-budgets': {
    morning: {
      title: 'The unreliability you can spend',
      why: 'A 99.9% objective is also a permission to fail 0.1% of the time. Writing that permission as a count is what makes it spendable. A percent alone is not a budget.',
      explain: `Subtract the SLO from 100% and apply the remainder to the window. An SLO of 99.9% over 30 days leaves a budget of 0.1%. If the month contains 40,000,000 checkout requests, the budget is 40,000 requests that may be failed or slower than the SLI allows. In time, a full outage version of the same budget is 30 days times 0.1%, which is 43.2 minutes. Both counts are the budget. They answer different questions: how many bad requests, or how long a total outage.

Spending is not a metaphor. A bad deploy that fails 10,000 checkouts has used a quarter of the 40,000. You can see it. A team that only watches "are we above 99.9% right now" cannot tell a slow bleed from a budget that is already gone. Track the consumed fraction of the window, not a single-hour success ratio with no memory.`,
      question:
        'The SLO is 99.9% of checkout requests over 30 days. The window is expected to contain 40,000,000 requests. Turn that SLO into a budget in requests, and into minutes of total outage.',
      hints: [
        'The budget fraction is 100% minus 99.9%. Multiply that by the request count.',
        'For a full outage, multiply 30 days by 0.1% and convert the result to minutes.',
      ],
      outline: [
        'The unreliability allowed is 0.1% of the window.',
        '0.1% of 40,000,000 requests is 40,000 bad checkout requests.',
        '0.1% of 30 days is 0.72 hours, which is 43.2 minutes of total outage.',
        'Either figure is the budget. Partial failure spends it request by request.',
      ],
      solution: `The budget is 0.1%, because 100% minus 99.9% is 0.1%. On 40,000,000 checkout requests that is 40,000,000 * 0.001, which is 40,000 requests. Those may fail or exceed 400 milliseconds, and after that the SLO is missed if the window is full. A single outage that takes checkout down completely spends the same budget in time. Thirty days is 43,200 minutes. Times 0.001 that is 43.2 minutes. One 43 minute total outage consumes the month. So does a long stretch of 1% errors, which is ten times the allowed rate and burns the budget in about three days.

Use the request count when traffic is uneven. A quiet night of downtime burns minutes and may burn few requests. The SLO was defined on requests, so the 40,000 is the budget that matches the objective. The 43.2 minutes is the translation people can picture, and it overstates a quiet hour and understates a bad minute during a sale. Say which one you are spending. Do not add them together. They are two views of one 0.1%, not two budgets.`,
      rubric: [
        'The request budget is 0.1% of 40,000,000, equal to 40,000 bad requests.',
        'The full-outage translation is 0.1% of 30 days, equal to 43.2 minutes, and the two are not added together.',
      ],
      myth: [
        'A 99.9% SLO means the service is not allowed to fail.',
        'It means 0.1% of the window is the failure you already accepted. Hiding that count makes every incident look like a policy breach and every quiet week look like infinite room.',
      ],
      context:
        'Burn alerts are this budget given a speed. Spending the 40,000 in an hour is a page. Spending them evenly across the month is the plan you already agreed to.',
      tradeoff: 'Tracking the budget in requests matches the SLO and is harder to explain at 3am. Tracking it in minutes is easy to say and wrong when traffic is bursty.',
      mistake: 'Treating any 500 as a budget breach, instead of counting it against the 40,000.',
      followUp: 'A deploy fails 8,000 checkouts in twenty minutes. What fraction of the monthly request budget did it use?',
      extension: 'How many requests can fail per day if you want the 40,000 to last a 30-day window evenly?',
      alternative: 'A burn-rate alert on the last hour, with no monthly remaining count, catches a fast fire and cannot tell you that the month was already spent before the fire started.',
    },
    evening: {
      title: 'What stops when the budget is gone',
      why: 'The budget is a decision about shipping, or it is only a graph. When it is gone, something specific has to stop, named in advance, or the graph changes nothing.',
      explain: `Spending the budget means the window is already at the SLO. Further risky change spends reliability you no longer have. The thing that stops is new feature work on that surface: the new payment form, the ranking experiment on checkout, the refactor you cannot roll back. The thing that does not stop is the repair. A patch that reduces checkout failures, a rollback, and a security fix are how you stop spending.

Decide this while the budget still exists. In the incident is a bad time to invent a philosophy. Write the freeze as a list of changes that do not ship, and a list that still do. "Be more careful" is not a decision. The payment-form release either waits or it does not.`,
      question:
        'The 30-day checkout budget of 40,000 bad requests is already used. A new payment form is queued to launch this week, and so is a patch that cuts checkout 500s. What do you stop shipping, and what do you still ship?',
      hints: [
        'The form is new risk on the surface that is already out of budget. The patch spends risk to buy the budget back.',
        'A freeze that also blocks the repair makes the budget a reason to stay down.',
      ],
      outline: [
        'Stop the new payment form and other feature launches on checkout.',
        'Stop experiments whose failure mode is a bad checkout.',
        'Still ship the patch that reduces checkout 500s, plus rollbacks and security fixes.',
        'The freeze ends when a new window has budget, not when the form’s stakeholders are tired of waiting.',
      ],
      solution: `Stop the new payment form. Stop the checkout ranking experiment and any other launch whose blast radius is this SLO. The budget of 40,000 is gone, so a form that might fail even a small extra fraction has nowhere to spend it. The team that owns the form does not get a waiver because the work is already built. The cost of waiting is a delayed feature. The cost of shipping is a missed objective you already missed.

Still ship the patch that cuts checkout 500s. Still ship a rollback of whatever is failing now, and a security fix you would ship on a frozen service. Those changes exist to put budget back or to stop an active loss. A freeze that blocks them confuses "no new risk" with "no changes." Say this in the release meeting in one sentence: the form waits, the 500 patch does not. Revisit when the rolling window has shed the bad period, or when you explicitly set a new SLO. Do not reopen the form because a quiet afternoon made the hourly graph look green.`,
      rubric: [
        'Feature work on checkout, including the new payment form, stops because the budget is already consumed.',
        'The reliability patch, a rollback, or a security fix is explicitly still allowed to ship.',
      ],
      myth: [
        'An empty error budget means the team stops all changes and waits for the month to roll over.',
        'It means you stop spending the budget on new risk. Repairs that buy reliability back are the changes you still ship.',
      ],
      context:
        'A launch freeze is the error budget meeting the deploy pipeline. If the pipeline cannot express "features no, fixes yes," the budget is a document and the form will ship.',
      tradeoff: 'A hard feature freeze protects the remaining users and delays work that may have been safe. A soft freeze that lets "small" features through spends the rest of an empty budget on a feeling about size.',
      mistake: 'Shipping the payment form because it was already on the calendar, and calling the patch a reason the form is safe.',
      followUp: 'The 500 patch itself causes a new class of slow checkouts. What do you ship the next morning?',
      extension: 'Who is allowed to declare the freeze over, and which number do they have to point at?',
      alternative: 'Slowing the form to a 1% canary still spends budget if that 1% fails open. It is a smaller spend, not a freeze, and it needs a halt rule before it is a compromise worth making.',
    },
  },
  'useful-metrics': {
    morning: {
      title: 'The few metrics that would page',
      why: 'A dashboard of fifty charts will not wake the right person. A handful of metrics that mean user pain or imminent user pain will, and you should be able to say why the rest will not.',
      explain: `A paging metric needs an action at the time it fires. Checkout success ratio, because users are failing and you can roll back or fail over. Checkout p99 latency, because the button is slow and the same actions apply. Database pool saturation, because the wait is about to become those user symptoms and you can shed or move traffic before the SLO graph catches up.

The rest of the catalog is not useless. It is the wrong trigger. Request rate rising may be a sale. CPU at 40% has no action if latency is fine. Disk at half full is a ticket for this week, not a page tonight. A metric you cannot act on at 3am trains people to ignore pages. Choose the few, and write the action next to each one so the choice is falsifiable.`,
      question:
        'Choose up to three metrics that would page you for the checkout service, and say why request rate, CPU at 40%, and a half-full disk would not. Name the action each page causes.',
      hints: [
        'A page needs user pain now, or a saturation signal that becomes user pain before a human would notice from the SLO alone.',
        'If the honest response is "look, then go back to sleep," it is not a page.',
      ],
      outline: [
        'Page on checkout success ratio when it drops, and the action is rollback or failover.',
        'Page on checkout p99 above the SLI latency, with the same class of action.',
        'Page on pool saturation held for several minutes, and the action is shed or fail over before the SLO follows.',
        'Request rate, moderate CPU, and a half-full disk do not page, because there is nothing to do tonight.',
      ],
      solution: `Page on three things. First, the checkout success ratio, when failed or slow requests threaten the SLO, for example less than 98% success for five minutes. The action is to roll back or fail over, not to admire the graph. Second, p99 latency of POST /checkout above 400 milliseconds for ten minutes, even if statuses are still 200. The action is the same, because a slow success is the SLI failing. Third, database pool in use above 90% for ten minutes. The action is to shed non-critical load or fail the database over while checkouts are still succeeding. That one is saturation with a timer, not a vanity host metric.

Do not page on request rate. A rising rate with healthy success is the product working. Do not page on CPU at 40%. Nobody should be woken to look at a machine that has spare CPU and happy users. Do not page on a disk that is half full. The action is a ticket to grow or delete, and it can wait until morning. Those three can sit on a dashboard for the person already awake. They are not pages. If you add a fourth page, remove one of these, or say which new pain it sees that these three miss.`,
      rubric: [
        'The paging set is small and each entry has a user-visible reason or an imminent one, plus an action such as rollback, shed, or failover.',
        'Request rate, moderate CPU, and half-full disk are excluded because they do not justify a night-time action.',
      ],
      myth: [
        'More paging metrics make the service safer because you will see problems sooner.',
        'Extra pages that no one can act on teach the on-call to sleep through the one page that was the users. A short list with an action is the safer set.',
      ],
      context:
        'The SLI is the first of these metrics. Pool saturation is the bottleneck hunt turned into a page that fires before the 504s, if you can act on it that fast.',
      tradeoff: 'Paging on saturation catches the failure early and also fires when the pool is high and the SLO is fine. Paging only on the SLO is calmer and shorter on warning.',
      mistake: 'Paging on CPU above 40% because the graph was easy to alert on, with no action written down.',
      followUp: 'Pool saturation is paging every night and checkout success stays at 99.99%. What do you change about the page?',
      extension: 'Which of the three do you drop first if the on-call can only keep one alert trustworthy?',
      alternative: 'A single composite "health" score pages once and hides which action to take. Three named metrics are harder to wire and tell you whether you are rolling back, shedding, or failing over.',
    },
    evening: {
      title: 'A number that improves while users suffer',
      why: 'Some metrics get better because of how they are averaged or counted, not because the experience got better. Treating that rise as recovery extends the incident.',
      explain: `A vanity metric moves in the cheerful direction while the SLI does not. Mean latency is the usual one. Cache hits on easy reads pull the average down, and the slow tail, which is the checkout the SLO measures, gets worse. The chart in the status review improves. Users at the tail wait longer. Retries produce another version: the count of successful responses rises because clients send the same pain three times, and two of those are extra load, not extra success.

The test is whether a user would agree the number got better. If the mean fell and the p99 rose, the user who was already slow does not agree. If successes rose only because failures are retried, the user who needed one checkout does not agree. Prefer the SLI over any number that can diverge from it in the happy direction.`,
      question:
        'Mean checkout latency fell from 90 milliseconds to 40 milliseconds after a cache went in. Over the same hour, p99 rose from 300 milliseconds to 1.5 seconds. Identify the vanity metric, and say what users are feeling while it improves.',
      hints: [
        'The mean is dominated by the new fast cache hits. The SLO cutoff cares about the tail.',
        'Ask whether the person who used to wait 300 milliseconds is better off at 1.5 seconds.',
      ],
      outline: [
        'The vanity metric is the mean latency, which improved because fast hits dominate the average.',
        'p99 moving from 300 milliseconds to 1.5 seconds is the user-visible change.',
        'Users in the tail are slower, past any 400 millisecond SLI cutoff.',
        'A success count inflated by retries would be a second vanity metric of the same family.',
      ],
      solution: `The vanity metric is the mean latency. It fell from 90 milliseconds to 40 because the cache made the common case fast, and the mean is mostly the common case. Users in the tail are worse off: p99 went from 300 milliseconds to 1.5 seconds. Anyone who was already near the slow end now waits five times longer, and a 400 millisecond SLO is failing for that slice even while the average looks like a win. Report p99, or the SLI fraction under 400 milliseconds. Do not report the mean as the outcome of the cache.

The same hour can lie with a counter. If clients retry the slow checkouts, successful response count climbs and so does load. The user still had one bad attempt followed by a maybe. The counter counted several responses. That number can improve, in the sense of going up, while the user suffers. The defense is to pick the metric that cannot be flattered by a faster easy path or a retry storm. The tail and the unretried success ratio are harder to flatter. The mean is easy.`,
      rubric: [
        'Mean latency is identified as the vanity metric, improved by fast cache hits while the tail got worse.',
        'User impact is tied to the p99 rise, not denied because the average fell.',
      ],
      myth: [
        'If average latency improved, the change was good for users.',
        'The average follows the common case. A cache can make that case fast and the tail slower, and the SLO lives in the tail.',
      ],
      context:
        'This is why the SLI named a threshold instead of a mean. A mean has no user in it. A fraction under 400 milliseconds does.',
      tradeoff: 'Publishing the mean keeps a simple number for people who will not read a percentile, and it will bless a regression in the tail. Publishing p99 is harder to explain and matches the objective.',
      mistake: 'Declaring the cache launch a success in the review because the average dropped, without opening the p99.',
      followUp: 'What does the mean do if the cache fails and every request takes the slow path that p99 already shows?',
      extension: 'How would a retry-inflated success count show the same kind of lie on a different graph?',
      alternative: 'A histogram of latency, with the SLO drawn on it, makes the mean unnecessary. It costs more to store and it cannot hide a tail behind fast hits.',
    },
  },
  logs: {
    morning: {
      title: 'A line you can use at 3am',
      why: 'During an incident you will search, not read. A log line that lacks the ids you search by is noise, and a line that is huge will be dropped before the incident starts.',
      explain: `A useful line is one per request, small, and enough to join to a trace or a user. Timestamp, request id, route, status, duration in milliseconds, error class, dependency name if a call failed, and a numeric user id. That is a checkout failure you can find. The line does not need the body, the SQL text of every query, or a paragraph of explanation. It needs to answer "which request, what happened, how long, where next."

Cheap enough to keep means you can afford the volume for the retention you want. At 200 requests per second, a 200 byte line is about 3.5 GB per day, which you can keep for a month. A line per loop iteration inside a fan-out, or a 20 KB body on every request, is hundreds of gigabytes a day. You will sample it, drop it, or stop logging during the incident because the logger is part of the outage. One summary line is the line you still have at 3am.`,
      question:
        'Define the log line you want for a failed POST /checkout. Which fields does it include, and why is one line per request cheap enough to keep at 200 requests per second?',
      hints: [
        'Include the request id and the dependency. Without them the line does not point at a next step.',
        'Multiply 200 requests per second by a few hundred bytes, then by 86,400, and compare with logging the body.',
      ],
      outline: [
        'One line per request, with timestamp, request id, route, status, and duration.',
        'Include error class, dependency name, and a numeric user id so the line joins to something.',
        'At 200 bytes and 200 requests per second the volume is about 3.5 GB per day.',
        'A body or a line per internal loop is too large to keep, so it is not the incident line.',
      ],
      solution: `The line is one record per checkout request: time, request id, route POST /checkout, status, duration_ms, error class, the dependency that failed, and the numeric user id. Example shape, not a novel: status 500, duration 842, error timeout, dependency payments, user 18422, request id a single token you can paste into the trace tool. That is enough to see that this user hit a payments timeout and to find the other lines for the same request id. It is not a stack trace pasted from a library default, and it is not the card data that happened to be in scope.

At 200 requests per second and about 200 bytes, the volume is 200 * 200 * 86,400 bytes per day, about 3.5 GB. Thirty days is near 100 GB. That is cheap enough to keep, so the line exists when you need last Tuesday. Logging a 20 KB body at the same rate is 200 * 20,000 * 86,400, about 346 GB per day, which you will not keep. Logging once per timeline insert inside a fan-out multiplies the useful line by hundreds. The incident line is the single summary. Debug lines can be sampled. They cannot be the only record of a failed checkout.`,
      rubric: [
        'The line includes a request id, outcome, duration, and a pointer such as dependency or user id, and it is one line per request.',
        'Volume is shown to be small at a few hundred bytes, and a body-sized line is rejected as too expensive to keep.',
      ],
      myth: [
        'The most detailed log is the most useful one during an incident.',
        'Detail you cannot store is not there at 3am. One small line with a request id beats a perfect line you dropped to save the disk.',
      ],
      context:
        'The request id is the same join key a trace uses. A log without it and a trace without a link to it are two piles that do not meet in the incident.',
      tradeoff: 'One line per request stays cheap and hides the internal loop that misbehaved. A line per query finds the loop and becomes the volume problem unless you sample it.',
      mistake: 'Logging the entire checkout request body at info on every call so you "have it if you need it."',
      followUp: 'Which field do you add if two dependencies can time out and you need to know which one did?',
      extension: 'What sampling rate would you put on per-query debug lines so they stay under a few GB per day?',
      alternative: 'Structured events in a trace span can replace the log line for latency questions. You still want one durable line for the cases where the trace was sampled out.',
    },
    evening: {
      title: 'What you will not log',
      why: 'A line that contains a secret is a leak you copied into a system many people can search. A line that is unbounded is a bill and an outage. Both belong on a do-not-log list written before the incident.',
      explain: `Secrets in logs stop being secrets. Authorization headers, session tokens, passwords, and card numbers are the usual ones. The request body of a checkout often contains the card, so "log the body when status is 500" is a decision to store card data in the log system. A user id is enough to find the person. The credential is not.

Unbounded means the size depends on the caller. A raw body, a list of every follower in a fan-out, a stack frame that includes the payload, a debug dump of the whole session. One hostile or merely large request makes a line of megabytes, and your 3.5 GB per day estimate is void. Cap what you log, or do not log it. The list of refusals is part of the logging design, not a compliance afterthought.`,
      question:
        'The checkout handler can see the Authorization header, the card number, the full request body, and the list of every line item a client chooses to send. What will you not log, and is the reason a secret, an unbounded size, or both?',
      hints: [
        'A card number and an Authorization header are secrets even when the request is small.',
        'The body and the line-item list grow with the caller. A 200 byte budget cannot survive them.',
      ],
      outline: [
        'Do not log the Authorization header, the session token, or the card number. Those are secrets.',
        'Do not log the raw request body. It is unbounded and it usually contains the card.',
        'Do not log unbounded client lists, such as every line item pasted into one line.',
        'Keep the numeric user id and the error class. Those identify the request without the secret.',
      ],
      solution: `Do not log the Authorization header, any session token, passwords, or the card number. Those are secrets, and the log store is readable by people who are not allowed to charge a card. A 500 does not change that. Do not log the raw body either. It is unbounded, so one request can be megabytes, and it is where the card number sits, so it is both problems at once. Do not log the full line-item list as a single field the client controls. Record a count of items if you need a clue. Record the request id so you can find the trace.

What you keep is the line from the useful set: status, duration, error class, dependency, numeric user id. None of those is a credential, and none of them grows with the body. If a debugger asks for the body "just this once," the once is how the card number lands in a retained index. Sampled, redacted, size-capped debug logs are a different channel with a short retention. They are not an exception you bolt onto the info line during the incident. Write the refusal down where the logger is configured, so a new handler cannot add the header by being helpful.`,
      rubric: [
        'Secrets such as the Authorization header and the card number are refused, with the log store named as the place they would leak.',
        'The raw body or another caller-sized field is refused as unbounded, not only as impolite.',
      ],
      myth: [
        'Logging a secret is safe if the log system is inside the company.',
        'Inside the company is still a wide set of readers, searches, and backups. A card number in that system is a copy you no longer control.',
      ],
      context:
        'Audit logs are the place you deliberately keep who did what. They are not a reason to also keep the password they typed. The audit event wants an id, not a secret.',
      tradeoff: 'Redacting bodies keeps cards out and removes the fastest way to see a malformed payload. A size-capped, short-lived debug sink gives you a piece of that payload and another store to secure.',
      mistake: 'Logging the request body only on 500, because failures feel rare, and thereby storing every card that hits a bad deploy.',
      followUp: 'A stack trace includes the request object by default. What do you strip before that trace is shipped?',
      extension: 'What field that is not a secret would you still refuse because a client can make it a megabyte?',
      alternative: 'Tokenizing the card and logging only the token moves the secret out of the line. The token is still a handle to the card, so the log retention and the token’s power have to be decided together.',
    },
  },
  traces: {
    morning: {
      title: 'What a trace adds',
      why: 'Metrics say the route is slow. Logs say this request was slow. Neither one says which hop inside the request spent the time. That is the gap a trace fills.',
      explain: `A trace is a tree for one request. Each span has a name, a start, a duration, and a parent. For a checkout, the root might be 380 milliseconds at the edge. A child says the app used 60. A child of that says SQL used 20. A sibling says the HTTP client to the fraud service used 300. You can see that the time is in the fraud call, not in the database and not in your JSON encoding. A metric of checkout latency cannot say that. A log line that says "500 in 842 ms, dependency payments" can name a dependency only if you already knew to log it, and it still has no tree.

The trace adds the breakdown you did not think to log, for the requests you bothered to record. Sampling means you will not have every request. The ones you have answer "where did the time go inside this call," which is the question the other two leave open. You still need the metric to know the route is bad, and the log to find a request id worth opening.`,
      question:
        'Checkout p99 is high. A log says request abc took 380 milliseconds and returned 200. A trace of abc shows 60 milliseconds in the app, 20 in SQL, and 300 in the fraud HTTP client. What did the trace add that the metric and the log did not?',
      hints: [
        'The metric already told you the route was slow. The log already told you this request was slow.',
        'The new fact is which child span holds the 300 milliseconds.',
      ],
      outline: [
        'The metric says checkout is slow in aggregate and does not name a hop.',
        'The log says request abc took 380 milliseconds and does not split that time.',
        'The trace puts 300 of those milliseconds in the fraud client span.',
        'The next action is about the fraud call, not about SQL or app CPU.',
      ],
      solution: `The trace added the split of the 380 milliseconds. The metric already said checkout p99 was bad, across many requests, with no hop named. The log already said abc was one of the slow ones and that it returned 200. Neither one showed that 300 milliseconds sat in the fraud HTTP client, 20 in SQL, and 60 in the app. Without the tree you would have indexed the database or scaled the app, because those are the hops you can see in a profiler and a log that never mentioned fraud.

What you do next is about that client span. Look at whether the 300 milliseconds is network, the fraud service, or your client waiting past the server's reply. The trace does not replace the SLO graph. You needed the graph to know this request was representative and not a one-off. It does not replace the log line. You needed the request id to find the trace if the trace UI is not where you start. It answers the question both of those leave open: which hop, inside this request, actually took the time.`,
      rubric: [
        'The trace’s addition is the per-hop breakdown, with the 300 milliseconds placed in the fraud client.',
        'The metric and the log are credited with what they already showed, so the trace is not described as the only telemetry.',
      ],
      myth: [
        'A trace is a more detailed log, so once you have traces you can drop request logs and latency metrics.',
        'A trace explains one sampled request. The metric says whether the route is slow overall. The log is how you find a request when the sample missed it.',
      ],
      context:
        'The missing dependency field in a log is the poor version of a child span. Teams add that field after an incident. The trace is there so the next new dependency does not need a new field first.',
      tradeoff: 'Recording every span on every request makes this breakdown common and can cost more than the checkout. Sampling keeps the cost down and leaves you blind on the request a customer cites if that one was not kept.',
      mistake: 'Scaling the app fleet because checkout p99 moved, without a span that shows the app is only 60 of the 380 milliseconds.',
      followUp: 'The fraud span is 300 milliseconds and the fraud service says its own handler took 30. Where is the other 270?',
      extension: 'What does a metric still tell you that a box of traces from the last five minutes does not?',
      alternative: 'A profiler on the app process shows CPU inside your code and misses the 300 milliseconds you spent blocked on a socket. The trace is the tool that includes that wait.',
    },
    evening: {
      title: 'The span that is not there',
      why: 'A trace only breaks down the hops you instrumented. The slow hop with no span hides inside its parent, and you will scale the parent.',
      explain: `Time that no child span claims is left on the parent. If the handler span is 380 milliseconds, SQL is 20, and nothing else is a child, the missing 360 looks like the app. It might be the app. It might be an HTTP call you forgot to wrap. The picture is the same. You will add indexes or instances for a process that was waiting on the network.

The missing span is the bug in the telemetry, and it hides the bug in the system. Name the call that should have been a child. Outbound HTTP, a queue publish, a cache get. If that span existed and held the time, you would look at that hop. Because it does not exist, the parent is a liar by omission. A trace review is as much "what span should be here" as "which span is slow."`,
      question:
        'A checkout trace shows a handler span of 380 milliseconds and a SQL child of 20 milliseconds. There is no child for the fraud call, which you suspect is slow. What does the missing span hide, and what will you wrongly scale if you trust the picture?',
      hints: [
        'Unspanned time stays on the parent. The handler looks busy because the child was never created.',
        'The fraud call is the hop you cannot see. Scaling the handler does not shorten a call that is not in the app CPU.',
      ],
      outline: [
        'The missing span is the outbound fraud call.',
        'Its time is buried in the 380 millisecond handler span, next to 20 milliseconds of SQL.',
        'The picture hides the slow hop and blames the app.',
        'You would wrongly scale or rewrite the app instead of looking at fraud or the client timeout.',
      ],
      solution: `The missing span hides the fraud call inside the handler. Of the 380 milliseconds, 20 are explained by SQL. The other 360 sit on the parent with no name. If the fraud client took 300 of them, the trace cannot say so. It looks like application work. You will scale the app, profile CPU that is mostly waiting, or rewrite the handler, and the p99 will not move. The slow hop is invisible because nobody started a span around the outbound call.

Add that span, with the peer service and the status of the call, and the next slow checkout will show fraud as a child. Until it is there, do not treat "handler time minus SQL" as proof the app is the bottleneck. That remainder is a bucket for everything you forgot, including cache gets and queue publishes. The practical check is a list of outbound calls in the handler versus the children on a real trace. Every call with no child is a place the next incident can hide. The fraud one is the current hole. Filling it is a telemetry change, and it is what makes the trace worth the cost you already pay to collect it.`,
      rubric: [
        'The missing fraud span is described as time left on the handler parent, so the slow hop is misread as app work.',
        'The wrong response named is scaling or rewriting the app instead of instrumenting and investigating the fraud call.',
      ],
      myth: [
        'If a trace shows the handler is slow, the handler code is what you should optimize.',
        'The handler span includes every call you did not wrap. Slowness on the parent, with no child, means the picture is incomplete, not that the CPU is guilty.',
      ],
      context:
        'This is a bottleneck hunt with bad instruments. Utilization inside the app looks high on the trace because wait time was attributed to the waiter.',
      tradeoff: 'Wrapping every client in a span finds the hidden hop and adds noise and cost on the fast path. Wrapping only SQL keeps traces small and hides every network call, which is where checkout usually waits.',
      mistake: 'Adding app instances because the handler span is 380 milliseconds and the only child is a fast query.',
      followUp: 'After you add the fraud span, it is 40 milliseconds and the handler is still 380. Where do you look next?',
      extension: 'Which outbound call, besides fraud, would you require a span for before you trust this trace?',
      alternative: 'A metric on the fraud client’s latency answers the same question in aggregate, without a trace, and does not tie the time to request abc. You want that metric anyway. It does not find the hole in this particular tree.',
    },
  },
  'prometheus-model': {
    morning: {
      title: 'Scrape, counter, and rate',
      why: 'A counter that only goes up is the wrong shape to paste on a dashboard as "errors right now." The scrape and the rate are what turn that counter into a question you can ask.',
      explain: `Prometheus pulls samples. On an interval, here every 15 seconds, it GETs the service’s /metrics and stores what it finds. The service does not push a point at the moment of each error. A gap in scrapes is a gap in the series. A counter such as http_requests_total only increases, except when the process restarts and the counter drops to zero. The raw number is "how many since this process started," and it lies across the restart.

A rate turns the counter into a per-second increase over a window. rate over five minutes of the 500 status counter is about how many failures per second you are producing now, with the restart handled as a reset rather than as negative traffic. That is the question the counter can answer. The scrape interval is the grain. You will not see a burst shorter than the scrapes, and you should not read the raw counter as the burst.`,
      question:
        'Explain a 15 second scrape, a counter of HTTP 500s, and a five-minute rate of that counter. What question does that rate answer about checkout failures?',
      hints: [
        'The scrape is a pull on an interval. The counter is a total since process start, not a current speed.',
        'The rate is the increase per second over the window. A restart should not look like negative errors.',
      ],
      outline: [
        'Every 15 seconds Prometheus pulls /metrics. The app does not push each failure.',
        'The 500 counter increases by one per failure and resets to zero when the process restarts.',
        'The five-minute rate is the per-second increase, accounting for that reset.',
        'It answers how many 500s per second the service is producing over that window, not how many are in flight.',
      ],
      solution: `Every 15 seconds Prometheus scrapes /metrics and stores the samples. If a scrape fails, that interval is missing. The counter http_requests_total with a 500 label goes up by one each time the process finishes a failed request. It does not go down when users recover. It goes to zero only because a new process started at zero. Reading the raw line as "errors right now" is wrong twice: it is a total, and a deploy looks like the total collapsed.

The rate over five minutes answers "about how many checkout 500s per second occurred over this window." It takes the increase, divides by the time, and treats a reset as a new counter rather than as millions of errors vanishing. That is the graph to put next to the SLO. It will not show a one-second spike that fell between scrapes, and it lags, because a five-minute window is slow to move. Use it for "are we failing now" in the sense of the last few minutes. Do not use the raw counter for that question. The raw counter answers "how many 500s has this process seen since it started," which is a different, less useful question, and a restart wipes it.`,
      rubric: [
        'Scrape is described as a pull on an interval, the counter as a monotonic total that resets on restart, and rate as a per-second increase.',
        'The question answered is the recent failure rate, and the raw counter is rejected as that question.',
      ],
      myth: [
        'A counter on a dashboard shows how many errors are happening right now.',
        'The counter shows a total since process start. The rate over a window is the per-second figure, and a restart makes the raw total drop without errors having been undone.',
      ],
      context:
        'A deploy that restarts every replica will reset this counter in a wave. A graph of the raw total looks like a miracle recovery. The rate graph shows the blip or the ongoing failures instead.',
      tradeoff: 'A five-minute rate is smooth and slow to scream. A one-minute rate tracks a fast burn and flaps on a single scrape miss. Pick the window to match how fast you are willing to page.',
      mistake: 'Alerting when the raw 500 counter is greater than zero, which is true for the entire life of a process that failed once.',
      followUp: 'All replicas restart during a deploy and the raw counter falls. What should the five-minute rate do if failures continue at the same speed?',
      extension: 'What failure mode of the scrape itself would make the rate look like zero while users are still failing?',
      alternative: 'A push-based statsd count can emit at the moment of the error and still needs a rate on the server side. You do not escape the "total versus per second" distinction by changing who opens the connection.',
    },
    evening: {
      title: 'The question a counter cannot answer',
      why: 'Counters are the right instrument for events that accumulate. They are the wrong instrument for a level, and using one there produces a graph that looks rigorous and answers something else.',
      explain: `A counter answers "how many times did this event happen," and with a rate, "how fast is it happening." Checkout 500s per second is that question. A counter does not answer "how many are in flight right now," because in-flight work goes up and down. That is a gauge. It does not answer "what is the p99 latency," because a count of requests has no durations in it. That is a histogram. It does not answer "how many distinct users failed," because it has no set of users, and putting user id on the counter label would create a series per user.

Ask the counter the question it can hold, and name one it cannot, so the dashboard does not grow a fake gauge made out of totals. The restart problem is a hint. Anything that must decrease in place is not a counter. Current queue depth decreases. A total of "requests that have ever waited" does not tell you the depth.`,
      question:
        'You have a counter of checkout HTTP 500s. Give one question it can answer, using a rate if you need one. Give one question it cannot answer, and name the kind of instrument that could.',
      hints: [
        'A rate of the counter is a speed of events. Stay inside events that only accumulate.',
        'In-flight work and latency percentiles move in ways a monotonic count cannot represent.',
      ],
      outline: [
        'The counter can answer how many 500s per second occurred over a window, via a rate.',
        'It can also answer how many 500s this process has seen since it started, with the reset caveat.',
        'It cannot answer how many checkouts are in flight right now. That is a gauge.',
        'It also cannot answer p99 latency. That is a histogram, because a count does not contain durations.',
      ],
      solution: `It can answer "how many checkout 500s per second have we produced over the last five minutes?" Take the rate of the counter. It can answer "how many 500s has this process recorded since it started?" Read the raw value, and throw that reading away across a restart. Both are questions about an event that accumulates.

It cannot answer "how many checkouts are in flight right now?" In-flight count rises and falls. A counter has no way to fall except a restart, which is not a checkout finishing. You want a gauge that each process sets to its current in-flight number, and you sum those gauges. It also cannot answer "what is checkout p99?" Nothing in the counter is a duration. A histogram of latencies answers that. Do not put user id in the counter’s labels to answer "how many distinct users saw a 500." That is a set, and the label would create one series per user, which is how a metrics system falls over. The counter’s refusal is useful. It tells you to pick another instrument instead of stretching this one.`,
      rubric: [
        'The question it can answer is a count or a rate of 500s, not a current level.',
        'The question it cannot answer is a level or a percentile, with a gauge or a histogram named as the fitting instrument.',
      ],
      myth: [
        'Any number you care about can be stored as a counter if you increment it often enough.',
        'A counter only accumulates. Levels that go down, and percentiles that need durations, are different instruments. Incrementing will not turn one into the other.',
      ],
      context:
        'Queue depth during the bottleneck hunt is a gauge. A counter of "queries started" can rise while the queue is empty or while it is jammed. The depth is the number that says which.',
      tradeoff: 'Gauges show the level you wanted and disappear when a scrape misses the process, because a dead process no longer reports zero. Counters survive as a last total and cannot show the level.',
      mistake: 'Graphing the raw 500 counter as in-flight errors and watching it climb for the whole uptime of the process.',
      followUp: 'You want the number of distinct users who saw a 500 today. Why does adding a user label to this counter fail?',
      extension: 'What question does a histogram of checkout latency answer that this counter still cannot, even with a rate?',
      alternative: 'Logging each failure and counting in a query engine can answer distinct users. It costs more than a counter and it can answer the question the counter should not be forced to hold.',
    },
  },
  dashboards: {
    morning: {
      title: 'One screen for one service',
      why: 'An incident does not leave time to assemble a story from twelve dashboards. One screen for checkout, with symptom, saturation, and errors, is the screen you can actually open.',
      explain: `Build one screen and stop. Symptom is the user-visible SLI: checkout success ratio and p99 latency, over the last hour, with the SLO line drawn on them. Saturation is the resource that will become the symptom: database pool in use, database CPU, and the oldest queue wait. Errors are the 5xx rate split by status, enough to see a 502 wave versus a 500 wave.

Those three rows answer "are users hurting, what is full, and what kind of failure is it." Put the service name in the title so this is not a company-wide wall. Link the request-log search and the deploy markers. Do not add a fourth row because a graph was interesting last quarter. If it does not change a decision on this service tonight, it belongs on a different screen that nobody opens during the page.`,
      question:
        'Build a one-screen dashboard for the checkout service. What goes in the symptom row, the saturation row, and the errors row, and what time range do you show first?',
      hints: [
        'Symptom is the SLI a user could recognize. Start with success ratio and p99, not with CPU.',
        'Saturation is a resource that fills before the SLI does. The pool and the database CPU qualify. A vanity mean does not.',
      ],
      outline: [
        'Symptom: checkout success ratio and p99 latency against the SLO, last hour.',
        'Saturation: pool in use, database CPU, and queue wait.',
        'Errors: 5xx rate split by status code.',
        'The screen is checkout only, with deploy markers, and it does not start as a wall of every host.',
      ],
      solution: `The screen is titled checkout, and the first time range is one hour. Symptom row: the success ratio of POST /checkout, using the same definition as the SLI, and the p99 latency with a line at 400 milliseconds. Those two say whether users are hurting right now. Saturation row: database connections in use against the pool size, database CPU, and the p99 of pool wait. Those say what is about to hurt users, or already is, from the bottleneck you already know how to hunt. Errors row: 5xx rate split by status, so a wave of 504s looks different from a wave of 500s.

Add deploy markers on the symptom row so a bad release is visible without a second tool. Add a link to the log query for status 500 with the request id field you decided to keep. Do not put mean latency on this screen. It can improve while p99 worsens. Do not put every service in the company on this screen. The decision it supports is rollback, shed, or failover for checkout. A graph that does not feed that decision waits outside. One screen, three rows, one service.`,
      rubric: [
        'The screen separates symptom, saturation, and errors, and the symptom is the checkout SLI rather than a host metric.',
        'The scope is one service and a short time range, with enough saturation detail to point at a next action.',
      ],
      myth: [
        'A good dashboard shows as many signals as you can fit, so nothing is hidden during an incident.',
        'A good on-call dashboard shows the few signals that change the next action. The rest hide the SLO behind a wall of host graphs.',
      ],
      context:
        'The three paging metrics are this screen’s symptom and saturation rows. If the page and the screen disagree, the on-call will trust neither.',
      tradeoff: 'One hour hides a slow daily burn and shows the shape of a deploy. A 30-day default shows the budget and makes a five-minute outage look flat. Keep the long window one click away, not as the first picture.',
      mistake: 'Leading the screen with cluster CPU averaged across services, so the checkout SLI is panel number twelve.',
      followUp: 'A 504 wave starts. Which row do you read second, and what action does it suggest?',
      extension: 'What panel would you add if checkout depends on fraud and fraud has its own saturation?',
      alternative: 'A generated dashboard from every metric the service exports stays up to date and becomes a wall. A hand-built three-row screen goes stale when you add a dependency, and it stays readable.',
    },
    evening: {
      title: 'The panel that changes nothing',
      why: 'Every panel competes with the SLI for attention. A panel that cannot change a decision makes the real one easier to miss, so removing it is part of building the screen.',
      explain: `A panel earns its place by changing an action. Rollback, failover, shed, or "this is not checkout, go back to sleep." If you would do the same thing whether the panel is high or low, it does not belong on the incident screen. Total requests since process start is that kind of panel. It climbs with uptime and traffic. It does not tell you to roll back. You already have a rate on the symptom row if you need volume.

Remove it. The test is practical. Sit with the three actions this service allows tonight and ask which panel would push you from one action to another. The ones that never push are how dashboards become attics. They can live in a builder view for a quiet afternoon. They do not live on the screen the page opens.`,
      question:
        'The checkout screen has the symptom, saturation, and error rows. It also has a panel of total requests since each process started. Remove or keep that panel, and say which decision it fails to change.',
      hints: [
        'Ask what you would do differently if the total is large versus small. The deploy decision should not move.',
        'A rate belongs with the symptom if you need volume. A monotonic total since boot does not add that.',
      ],
      outline: [
        'Remove the total-requests-since-start panel from the incident screen.',
        'It grows with uptime and traffic and resets on deploy, which mimics a signal.',
        'Rollback, failover, and shed do not change based on that total.',
        'Volume, if you need it, is already a rate next to the success ratio.',
      ],
      solution: `Remove the panel. Total requests since process start climbs for the whole life of the process and drops to zero on a restart. A deploy therefore looks like a dramatic reset, and a long-lived process looks "healthier" because the number is big. Neither reading changes a decision. You do not roll back because the total is high. You do not fail over because it is low. You do not shed load because a counter of all-time requests moved. The panel fails the only test that matters on this screen.

If you want volume, the success-ratio panel already needs a request rate beside it so a tiny sample does not look like an outage. That rate is a different panel, and it changes whether you trust the ratio. The since-start counter does not. Take it off the incident screen. Leave it, if someone still wants it, on a capacity page nobody opens from a page. The same cut applies to a panel of container age, a company-wide host map, and a mean latency. If it cannot move you among rollback, failover, shed, and "not an incident," it does not belong next to the SLI.`,
      rubric: [
        'The since-start request total is removed because it does not change rollback, failover, or shed.',
        'A request rate is distinguished from that total, as the volume signal that can change whether you trust the SLI.',
      ],
      myth: [
        'A panel is harmless if it is only taking a little space on the dashboard.',
        'It takes attention, and a reset of a lifetime counter looks like an incident signal. Harmless panels are how the SLI gets missed.',
      ],
      context:
        'The raw Prometheus counter is this panel. Putting the total on the wall invites the misread the rate was invented to prevent.',
      tradeoff: 'A strict one-screen rule drops a graph that would have explained a weird incident once. A loose rule keeps that graph and hides the SLO every other night.',
      mistake: 'Keeping the total because it was already on the dashboard and nobody wants to delete a panel in case it is useful.',
      followUp: 'Container restart count is the next panel someone wants to add. What decision would it have to change for you to allow it?',
      extension: 'Which saturation panel would you remove if the database pool no longer exists after a client change?',
      alternative: 'A second dashboard called "capacity," linked and not opened by the page, can hold the lifetime counters. The incident screen stays small. The cost is two places to maintain when a metric is renamed.',
    },
  },
  'symptom-alerting': {
    morning: {
      title: 'Page on the user pain',
      why: 'A page is a person woken up. It should fire when users are hurt and when that person can do something, and the alert itself should point at the steps. A cause with no user pain is a ticket.',
      explain: `Write the page in the user’s terms and attach a runbook. "Checkout success is below 98% for five minutes" is user pain: the SLI is failing fast. The body of the page links the checkout runbook. The runbook’s first lines are the actions you already chose: open the one-screen dashboard, roll back if a deploy landed in the last hour, shed or fail over if the pool is saturated. The page does not say "CPU is high" and leave the rest to memory.

The threshold and the hold time are part of the sentence. Five minutes avoids a single bad scrape. 98% over five minutes, on a service that aims at 99.9% over 30 days, is a fast burn, not a polite report that the month is slightly off. Slow burns can be tickets. A page is for the pain happening now, with a link that works at 3am, not a link to the alert system’s home page.`,
      question:
        'Write the page for checkout. Give the condition in user-visible terms, the hold time, and what the runbook link must contain so the person woken up can act.',
      hints: [
        'Use the success ratio of POST /checkout, not a host cause. Name a percent and a duration.',
        'The runbook’s first step is an action, such as rollback, not a description of the architecture.',
      ],
      outline: [
        'Page when checkout success is below 98% for five minutes.',
        'The condition is the user-facing SLI, measured the same way as the objective.',
        'The alert links the checkout runbook, not a generic console.',
        'The runbook starts with dashboard, rollback if a deploy just shipped, and shed or failover if the pool is full.',
      ],
      solution: `Page when the success ratio of POST /checkout stays below 98% for five minutes, using the same edge measurement as the SLI. That is user pain: more than a small slice of checkouts are failing or too slow, and it has already lasted long enough to be more than one scrape. The alert body contains the current ratio, the link to the one-screen checkout dashboard, and the link to the checkout runbook. It does not contain a guess about the cause in the title. The cause is what the person finds. The symptom is why you woke them.

The runbook starts with actions. Open the dashboard. If a deploy went out in the last hour, roll back to the previous image. If the pool or the database is saturated, shed non-critical load or fail over. Then look at logs and traces. A runbook that opens with a paragraph about checkout’s history is a document, not a link that belongs on a page. Five minutes at 98% will also fire on a bad deploy you want to catch, and it will sometimes fire on a dependency you cannot fix by rolling back. The first steps still work: the dashboard says which of those it is, and the rollback is cheap when the deploy is innocent. A page with no runbook is a number and a feeling.`,
      rubric: [
        'The page condition is a user-visible checkout success ratio held for a stated duration, not a host metric.',
        'The alert carries a runbook link whose first steps are concrete actions such as rollback or shed.',
      ],
      myth: [
        'An alert should name the broken component so the on-call does not have to diagnose.',
        'The component is a hypothesis. The page should name the user pain, and the runbook should start the actions. A wrong cause in the title sends the person to the wrong system.',
      ],
      context:
        'Burn-rate pages are this same idea with the error budget as the unit. A five-minute 98% line is the simple form of a fast burn on a 99.9% objective.',
      tradeoff: 'Five minutes at 98% catches a bad deploy and also wakes someone for a short upstream blip they can only wait out. A longer hold misses the deploy’s first ten minutes, which is when rollback is cheapest.',
      mistake: 'Linking the alert to the dashboard home page and calling that a runbook.',
      followUp: 'The success ratio is 99.5% for six hours, which will miss the monthly SLO and never cross the five-minute page. What alert or ticket do you add?',
      extension: 'What do you put in the page body so the on-call can tell a deploy apart from a dependency before opening three tools?',
      alternative: 'Paging on the error budget burn rate over one hour and six hours catches both fast and slow spends. It is harder to explain than 98% for five minutes, and it matches the budget more closely.',
    },
    evening: {
      title: 'An alert nobody can act on',
      why: 'A cause-based page fires when a component looks wrong, including the times users are fine and the times the component belongs to someone you cannot reach. The rewrite is to stop waking people for it.',
      explain: `Causes are clues for someone who is already up because users hurt. They are bad pages. "Payments CPU above 85% for ten minutes" can fire while checkout is healthy, and if payments is a vendor or another team’s box, the person you woke cannot change that CPU. They can stare. Staring is not an action. The page has trained them to clear an alert that was never theirs to fix.

Rewrite it as a non-page. If checkout is healthy, a high CPU is a ticket for the team that owns the box, looked at in the daytime. If checkout is unhealthy, the symptom page already fired, and the runbook tells the on-call to check payments CPU as a step. The CPU did not earn its own night. The rewrite is not a softer threshold on the same cause. A 95% line has the same problem as an 85% line. The problem is the condition, not the number.`,
      question:
        'An alert pages when payments CPU stays above 85% for ten minutes. Checkout can be healthy when it fires, and the on-call cannot resize that box. Rewrite the alert so it does not page when nobody can act.',
      hints: [
        'A cause without a user symptom is a ticket. Move the CPU check into the checkout runbook.',
        'Lowering 85% to 70%, or raising it to 95%, still pages on a cause. Change the condition.',
      ],
      outline: [
        'Stop paging on payments CPU. The on-call cannot act on it, and users may be fine.',
        'File a ticket for the owning team if CPU stays high during the day.',
        'Keep the checkout success page as the thing that wakes someone.',
        'The runbook for that page lists payments CPU as a check after the symptom, not as the page itself.',
      ],
      solution: `Delete the page. Payments CPU above 85% is a cause, and it fails both tests: checkout may be completely healthy, and the person woken up cannot add CPU to a box they do not own or a vendor they cannot resize. Replace it with a ticket, owned by the team that runs payments, when CPU stays high for hours and the SLO is still met. Tickets can wait until morning. Pages cannot.

The page that remains is the checkout success ratio below 98% for five minutes. In that runbook, after the rollback step, one line says: if the dashboard’s dependency row points at payments, check payments latency and CPU and escalate to that team. The CPU is now a step inside an incident that already has user pain, which is the only time the on-call can act, by escalating or by shedding. Do not keep a quiet version of the old page "just in case." A case where users are fine does not need a page, and a case where users are hurt is already covered. Two pages for one incident split the response.`,
      rubric: [
        'The CPU page is removed or turned into a daytime ticket, because it fires without user pain and without an action.',
        'The replacement page is the checkout symptom, with payments CPU demoted to a runbook step.',
      ],
      myth: [
        'Paging on a cause is better because you find the problem before users notice.',
        'You might, and you will also page when users never notice and when the cause is not yours to fix. The symptom page is what lines the wake-up up with pain you can act on.',
      ],
      context:
        'Disk-will-fill-in-seven-days is the same rewrite. It is a ticket. It becomes a page only when the fill is close enough that users will hit it before morning, and someone can still delete or grow.',
      tradeoff: 'Symptom-only paging avoids useless nights and starts a few minutes after the cause began. Cause paging starts earlier and is wrong often enough that real pages get ignored.',
      mistake: 'Raising the CPU threshold from 85% to 95% and calling that a rewrite, so the page still fires with no action attached.',
      followUp: 'Payments CPU is high, checkout success is 90%, and you do own the payments box. What do you do in the first ten minutes, and which alert woke you?',
      extension: 'When would a disk-full prediction deserve a page instead of a ticket?',
      alternative: 'A combined alert that pages only when CPU is high and checkout success is low is logically the symptom page plus a hint. It is harder to tune than a symptom page whose runbook mentions CPU, and it misses a checkout failure that is not the CPU.',
    },
  },
  'incident-response': {
    morning: {
      title: 'Stop the harm, then talk, then explain',
      why: 'The first minutes get spent on a theory because theories feel like progress. Users get better when the harm stops. The explanation can wait until the bleeding has slowed.',
      explain: `Order the first minutes so a person under stress does not invent a new order. First, stop the harm. Roll back the deploy, turn the feature flag off, fail over, or shed traffic. Pick the one that removes the user-visible failure fastest, even if you are not sure it is the root. Second, communicate. Say what users see and what you just did, in the incident channel and to support, and name who is driving. Third, explain. Logs, traces, and the faulty line come after the rollback is in motion.

Explaining first feels responsible and leaves the bad binary in place while you read. Communicating first with no action tells everyone the outage is understood when it is only narrated. The order is stop, tell, then understand. A small incident follows the same order and finishes the first step in a minute. A large one stays in the first step longer. Neither one starts with a root-cause document.`,
      question:
        'Checkout 500s started five minutes after a deploy. You do not yet know which change is at fault. Order the first minutes. What do you do before you explain the bug, and what do you say when you communicate?',
      hints: [
        'The deploy is the fastest thing to undo. You do not need the line number to ship the previous image.',
        'The message names user impact and the action you took. It does not name a theory you have not tested.',
      ],
      outline: [
        'First, stop the harm by rolling back the deploy that just shipped.',
        'Second, communicate the user impact and the rollback, and name who is driving.',
        'Third, explain the bug with logs and traces after the rollback is underway.',
        'A theory about the root cause does not come before the rollback.',
      ],
      solution: `Stop the harm first. Roll back to the previous image while the 500s are still the current deploy’s. You do not know which change inside it is guilty, and you do not need to. The previous image was serving checkouts this morning. Put it back. If the rollback itself is dangerous, turn the flag off or shed checkout traffic. One of those, chosen because it restores users, not because it is the most interesting.

Then communicate, in a few lines: checkout is failing since the 14:10 deploy, we are rolling back, support should tell users to retry shortly, and name the person driving. Do not include a theory about a null pointer you have not confirmed. Then explain. Pull the request ids, look at the trace, find the line, write it down for the review. If you explain first, the bad deploy keeps failing users for as long as the reading takes. If you communicate a theory first, you will be correcting yourself in public while the rollback has not started. The order is the whole response.`,
      rubric: [
        'The first action stops the harm, such as a rollback or a flag, before a root-cause explanation.',
        'Communication states user impact and the action taken, and the explanation is explicitly later.',
      ],
      myth: [
        'You should understand the root cause before you change production during an incident.',
        'You should stop the user-visible harm with the safest reversible action you have. Understanding is what you do once that action is in motion.',
      ],
      context:
        'A bad canary has the same order. Halt the canary first. The diff can wait. The minutes you spend reading are minutes the canary is still taking traffic.',
      tradeoff: 'Rolling back before you understand restores users and destroys a reproduction if the bug is rare. Waiting for a reproduction leaves a common bug in front of every checkout.',
      mistake: 'Starting a war room by reading the diff out loud while the failing deploy stays on every instance.',
      followUp: 'The rollback finishes and 500s continue at the same rate. What is the next stop-the-harm step, before the explanation?',
      extension: 'What do you tell support to say if you have rolled back and you still do not know whether in-flight payments were charged?',
      alternative: 'Failing over to a second region stops harm when the deploy is not the cause and the primary region is. It is the wrong first action when the same bad image is in both regions.',
    },
    evening: {
      title: 'Restore before you understand',
      why: 'Root cause is a luxury the next morning can afford. The action that brings users back is often a reversal you can do while the cause is still a guess.',
      explain: `Name the action that restores service without a cause. For a bad deploy it is the rollback. Users get the previous binary. You may still not know which commit hurt them. That ignorance does not block the rollback, and waiting for the knowledge blocks the users. The same pattern is a feature flag turned off, or a failover to a replica that is still healthy. Each one puts a known-good path back and leaves the explanation undone.

The action has to be reversible and already practiced, or it is not available in the first minutes. A rollback you have never run is a second incident. A failover you have never rehearsed is a guess with extra steps. The point of naming the action now is to see whether it really does not need the cause. If it needs the cause, it is not the first action. It is step three.`,
      question:
        'Checkout failed immediately after the 14:10 deploy. You do not know which change is responsible. Name the action that restores users before the root cause is known, and say what you still will not know after it works.',
      hints: [
        'The previous image was good this morning. Shipping it does not require knowing why the new one fails.',
        'After users recover, the faulty line can still be unknown. That is acceptable.',
      ],
      outline: [
        'Roll back to the image that was serving before 14:10.',
        'Users recover when that image takes traffic, without a root cause.',
        'You may still not know which commit or which line caused the 500s.',
        'Finding that line is the explanation step, and it is allowed to finish later.',
      ],
      solution: `Roll back to the image that was running before 14:10. That is the action that restores users before the root cause is known. The previous image has already demonstrated today’s traffic. The new one has demonstrated 500s. Swapping back does not require you to name the bad line, the bad config, or the bad query. When the old image is serving and the success ratio returns, users are back. You may still have no idea which of the twelve commits did it. Write that down as unknown, not as a reason to delay the swap.

What you still will not know is the cause, and also whether a migration in the new deploy changed data the old image cannot read. If the rollback does not restore users, you learned something: the cause is not only the new code, or the data moved. The next action might be a flag, a failover, or a forward fix. You still do not start with a root-cause hunt while the 500s continue. The rollback is first because it is the action that can work with zero explanation. If you truly cannot roll back, say so out loud and pick the next action that also does not need a cause. Do not fill the gap with reading.`,
      rubric: [
        'The restoring action is a rollback or an equivalent reversal, and it is explicitly allowed to happen before the cause is known.',
        'The answer states what remains unknown after users recover, instead of treating recovery as the explanation.',
      ],
      myth: [
        'Putting the old version back without knowing the bug is reckless.',
        'Leaving a failing version in place while you read is what prolongs the outage. The old version is the known-good path. The reading can happen after users are back.',
      ],
      context:
        'This is the stop-the-harm step pulled out on its own, because teams do the communication and still postpone the rollback until someone important understands the diff.',
      tradeoff: 'A fast rollback restores checkout and may roll back a security fix that shipped in the same image. Splitting security fixes from feature deploys is how you keep the rollback safe to use.',
      mistake: 'Refusing to roll back until someone can explain the stack trace, while checkouts keep failing.',
      followUp: 'The old image is back and checkouts succeed, but a column the new code wrote is now unreadable. What did the rollback not restore?',
      extension: 'Name a second restoring action, besides rollback, that also does not need the root cause.',
      alternative: 'A forward fix that patches the bad line can be faster than a rollback when the line is obvious and the pipeline is slow. It needs more cause than a rollback does, so it is not the default in minute one.',
    },
  },
  'incident-roles': {
    morning: {
      title: 'Three jobs, not one hero',
      why: 'One person debugging, deciding, and broadcasting will drop two of those. The roles exist so the rollback still happens while someone else is talking to support.',
      explain: `Incident command decides and keeps the timeline. They do not also hold the only keyboard. Communications tells support and the status page what users see and what just changed, on a clock, such as every fifteen minutes, and does not invent a cause. Operations runs the rollback, reads the dashboard, and changes the system. Three jobs. They can be three people, or two people with one person refusing to do all three at once.

The commander’s job is to pick the stop-the-harm action and to stop side investigations that do not serve it. Operations’ job is to carry that action out and report what happened, not to disappear into a profiler. Communications’ job is a short true message. A channel with twenty volunteers and no roles produces twenty theories and no rollback. Assign the three out loud at the start, even when the incident is small. A small one is how people practice the assignment before a large one.`,
      question:
        'Checkout is down and eight people have joined the channel. Assign incident command, communications, and operations. What is each one forbidden to drop in order to do someone else’s job?',
      hints: [
        'Command chooses the action and does not become the only person typing on production.',
        'Communications reports impact and actions on a timer. They do not wait for a root cause to post.',
      ],
      outline: [
        'Command decides the next action, keeps time, and does not own the only keyboard.',
        'Communications updates support and the status page about impact and actions, not theories.',
        'Operations executes the rollback or failover and reports the result.',
        'Volunteers who have no role do not change production or post competing status.',
      ],
      solution: `Name them in the channel. Command is one person who decides "we roll back now," keeps a timeline of what was tried, and does not also SSH as the only operator. They are forbidden to go silent inside a debugger. Communications is one person who posts every fifteen minutes: what users see, what we did, what we do not know yet. They are forbidden to wait for the root cause, and forbidden to publish a theory command has not adopted. Operations is one or two people who run the rollback and watch the success ratio. They are forbidden to start a parallel experiment command did not ask for.

Everyone else stays quiet or takes a task from command. Eight undeclared helpers will all read logs and nobody will roll back. If you are alone, you still keep the order: do the rollback first, post one status line, then debug. You have worn the three hats in sequence instead of pretending one person can broadcast and type at the same time. The assignment is done when each name is in the channel and the first status line has gone out. It is not done when the channel topic says "incident."`,
      rubric: [
        'Command, communications, and operations are assigned as distinct jobs, with command not also being the only operator.',
        'Communications is required to report impact and actions without waiting for a cause, and extra volunteers do not take unsolicited production changes.',
      ],
      myth: [
        'The best debugger should run the incident because they will find the bug fastest.',
        'The best debugger should be operations, if anyone. Command is a coordination job. Putting the only expert on both means updates stop and so does the rollback as soon as the expert starts reading.',
      ],
      context:
        'The stop-harm order fails in a crowd. Roles are how rollback stays step one when more than two people are talking.',
      tradeoff: 'Three named people costs coordination overhead on a ten-minute incident and pays for itself when the incident runs an hour. Skipping roles saves a minute of assigning and loses the rollback in the noise.',
      mistake: 'Letting the person who knows the code do command, communications, and the rollback keyboard at once.',
      followUp: 'Operations says the rollback is taking longer than expected. What does command tell communications to post, and what do they not post?',
      extension: 'Who takes operations if the only person with production access is currently assigned to command?',
      alternative: 'A single incident lead with no communications role works when the audience is one on-call teammate. It fails as soon as support and customers need words, because the lead will either stop typing or stop talking.',
    },
    evening: {
      title: 'Severity from the users',
      why: 'Severity decides who is woken and how often you update. Set it from how many users are blocked and what they cannot do, or you will under-call a dull outage and over-call a clever bug.',
      explain: `User impact is the input. All customers unable to pay is the top severity, even if the bug is a one-character typo and the story is boring. A rare race that hit four internal accounts is not the top severity, even if the race is the most interesting bug of the year. Interesting is a reason to write a postmortem. It is not a reason to page the whole company.

Write the scale in user terms before you need it. Top severity: checkout broken for a large share of customers, updates every fifteen minutes, command assigned immediately. Lower severity: a slice of users, a workaround exists, or the bug is internal. You can raise severity when impact grows. You should not raise it because a senior person is curious. The typo in production checkout outranks the elegant race in a dark-launched admin page.`,
      question:
        'Two things are broken tonight. A one-line typo stops every customer checkout. A subtle race corrupts four internal test accounts and is intellectually interesting. Set a severity for each from user impact, and say which one is the page.',
      hints: [
        'Ignore how clever the bug is and how embarrassing the typo is. Count who cannot do what.',
        'The page goes to the one that blocks customers now. The race can be a ticket.',
      ],
      outline: [
        'The checkout typo is top severity because customers cannot pay.',
        'It gets an incident commander, a page, and updates on a short clock.',
        'The race on four internal accounts is low severity, a ticket or a small incident, not a company page.',
        'Interest and elegance do not move either severity up or down.',
      ],
      solution: `The typo is the top severity. Every customer checkout is broken. That is the page. Assign command, communications, and operations, and update every fifteen minutes until customers can pay. The fact that the bug is a dull one-line mistake does not lower it. Dull bugs that stop revenue are the important ones. Roll it back or patch it under that severity, using the same stop-harm order as any other outage.

The race is not that severity. Four internal test accounts, with no customer unable to pay, is a bug for the next business day, or a low-severity incident if data is actively corrupting and someone needs to stop the writer. It does not page the checkout on-call at 3am, and it does not get a status-page post. You can still be fascinated later. Fascination is not impact. If you set severity from how impressive the race looks, you will pull a crowd onto the internal bug while customers cannot check out. Impact first. The checkout failure is SEV-1 in any scale that means "customers are blocked." The race is not.`,
      rubric: [
        'The customer-wide checkout failure is the high severity and the page, despite the bug being a simple typo.',
        'The interesting internal race is a lower severity because user impact is four internal accounts, not because it is subtle.',
      ],
      myth: [
        'Severity should reflect how hard the bug is to understand, so the right experts show up.',
        'Severity should reflect who is blocked. Experts can be invited to a low-severity bug in the morning. Customers who cannot pay are the reason to wake people now.',
      ],
      context:
        'Communications needs this call to know whether the status page changes. A top-severity checkout outage is a status post. An internal race is not.',
      tradeoff: 'A strict impact scale under-calls a bug that will hit customers in an hour and has not yet. Raising severity on a forecast wakes people early and will be wrong when the forecast is wrong.',
      mistake: 'Paging a large audience for the elegant race because the checkout typo "looks like a quick fix" and therefore feels low severity.',
      followUp: 'The typo is fixed and the race starts corrupting customer orders, not test accounts. What happens to its severity?',
      extension: 'A bug breaks checkout only for users in one small country. How do you set severity compared with a global typo?',
      alternative: 'Priority in a bug tracker can rank the race above the typo for engineering interest next sprint. Incident severity cannot. Mixing the two scales is how internal work wakes the on-call.',
    },
  },
  'rpo-rto': {
    morning: {
      title: 'How much you can lose, how long you can be down',
      why: 'Backup arguments go in circles until someone states two numbers: how much data you can afford to lose, and how long you can afford to be down. Those numbers are the requirements. The tools come after.',
      explain: `RPO is the age of the data you can stand to lose. An RPO of two minutes on the orders database means a restore may forget at most two minutes of committed orders. More than that is orders you acknowledged and cannot see, or charges you cannot reconcile. RTO is how long the service may be down. An RTO of 30 minutes means customers may be unable to order for half an hour, and not for an afternoon.

They are different axes. A system can lose almost no data and still take hours to come back, or come back in minutes from a stale copy. Write both for one system, in units an operator can test. "As little as possible" is not an RPO. Two minutes is. Thirty minutes is an RTO. The backup frequency and the restore drill have to be judged against those two, not against a feeling that you have backups.`,
      question:
        'For the orders database, define an RPO and an RTO that a business could actually hold you to. Say what each one allows you to lose or delay, in plain terms.',
      hints: [
        'RPO is data. Pick a short window of orders you could reconstruct or bear to lose, and name it in minutes.',
        'RTO is downtime. Pick a duration customers can wait, and do not reuse the RPO number for it.',
      ],
      outline: [
        'RPO is two minutes. A restore may drop at most two minutes of committed orders.',
        'That is the data you can lose, not a statement about downtime.',
        'RTO is 30 minutes. The store may be down that long and no longer.',
        'The two numbers are independent. A fast return from an old backup can meet one and miss the other.',
      ],
      solution: `RPO is two minutes. If the orders database is lost at 18:00, a correct restore may be missing orders committed after 17:58, and it may not be missing more than that. Those two minutes are the acknowledged orders you will have to rebuild from the payment provider or apologize for. Anything older must be on durable storage that survives the loss. RTO is 30 minutes. From the moment orders are unusable to the moment new orders succeed again, you have half an hour. That includes detection, the restore or the failover, and pointing the app at the recovered database.

The numbers do not match on purpose. Losing two minutes of data is a much tighter requirement than being down for thirty. A snapshot that is restored in ten minutes and is six hours old meets a casual reading of "we recovered quickly" and misses the RPO by hours. A replica that is two minutes behind and takes three hours to promote misses the RTO. Write both on the system’s page. "We back up orders" does not contain either number. The next design choice, snapshot versus continuous shipping versus a warm standby, is a choice about meeting these two, not a choice about which product is familiar.`,
      rubric: [
        'RPO is stated as a bound on lost orders, in a short time such as two minutes, separate from downtime.',
        'RTO is stated as a bound on how long ordering may be down, and the two requirements are not collapsed into one.',
      ],
      myth: [
        'If you have backups, you have an RPO and an RTO.',
        'Backups are a mechanism. RPO and RTO are the numbers the mechanism has to meet. A nightly backup has an RPO of about a day, whatever you hoped.',
      ],
      context:
        'The error budget is about failed requests inside a living service. RPO is about data that is gone. A service can meet its SLO all month and still have no answer for a lost disk.',
      tradeoff: 'A two-minute RPO forces continuous log shipping or a synchronous replica and costs money and operational care. A one-hour RPO is cheaper and means you have agreed to lose an hour of orders.',
      mistake: 'Writing "zero data loss and zero downtime" because both sound correct, with no mechanism that could meet either.',
      followUp: 'A restore brings the database back in 20 minutes and loses 40 minutes of orders. Which requirement did you meet, and which did you miss?',
      extension: 'Whose job is it to accept a longer RPO, the on-call or the person who owns the customer promise?',
      alternative: 'Deriving RPO from the backup tool you already run is backwards but common. Measure what the tool actually guarantees, then tell the business that number instead of inventing a tighter one.',
    },
    evening: {
      title: 'A backup cadence that misses the RPO',
      why: 'A backup you like can still be too rare. The frequency has to be at least as tight as the data you said you could lose, or the RPO was a wish.',
      explain: `Compare the worst-case age of the backup with the RPO, not the typical age. A snapshot taken every six hours is, just before the next one, almost six hours old. If the RPO is two minutes, that snapshot misses it by about six hours of orders. The existence of the snapshot is not in dispute. The frequency is the miss.

Say it with the numbers. Six hours is 360 minutes, which is 180 times the two-minute RPO. A crash at 17:59 with a snapshot from 12:00 loses the afternoon. Continuous log shipping that stays within two minutes meets the RPO. A snapshot every six hours does not, no matter how fast you can restore the stale file. Restore speed is the RTO’s problem. Staleness is the RPO’s.`,
      question:
        'You set an RPO of two minutes for orders. The database takes a full snapshot every six hours. Show that this frequency misses the RPO, using the worst case rather than the minute after a snapshot.',
      hints: [
        'The worst case is just before the next snapshot. The backup is then almost six hours old.',
        'Compare that age with two minutes. Restore speed does not make the data newer.',
      ],
      outline: [
        'A six-hour snapshot is up to six hours behind, not two minutes behind.',
        'Six hours is 360 minutes, far past an RPO of two minutes.',
        'A failure just before the next snapshot loses almost six hours of orders.',
        'A fast restore of that snapshot meets neither the RPO nor, if it is slow, the RTO. Speed does not fix staleness.',
      ],
      solution: `The six-hour snapshot misses the RPO. In the worst case the last good snapshot is almost six hours old, just before the next run. Six hours is 360 minutes. The RPO allows two. 360 / 2 is 180, so you can lose on the order of 180 times as much order history as you wrote down. A crash at 17:59, with the last snapshot at 12:00, drops the orders from noon to 17:59. That is the frequency’s fault, not the operator’s speed.

Restoring that snapshot in fifteen minutes would look efficient and would still miss the RPO, because the data inside it is old. RTO is about the fifteen minutes. RPO is about the noon cutoff. To meet two minutes you need a mechanism whose worst lag is under two minutes, such as log shipping that is monitored when it falls behind, not a fuller snapshot on the same six-hour clock. Do not describe the snapshot as "the RPO backup." It is a backup. It is not this RPO. If the business truly only has a six-hour snapshot, the honest RPO is six hours, and someone has to accept that in writing. Pretending it is two minutes helps the document and not the customers who ordered after noon.`,
      rubric: [
        'The miss is shown as a worst-case age of about six hours against a two-minute RPO, not as a missing backup product.',
        'Restore speed is separated from staleness, so a fast restore of an old snapshot still fails the RPO.',
      ],
      myth: [
        'A regular snapshot means you can recover to about the time of the failure.',
        'You can recover to the snapshot, which is up to one interval old. If the interval is six hours, the RPO is six hours, whatever the document says.',
      ],
      context:
        'Retention deletes and backup intervals fail the same way. A policy sentence is not the interval the job actually runs. The age of the newest restorable copy is the RPO you have.',
      tradeoff: 'Snapshots every few minutes shrink the gap and hammer the database. Log shipping is gentler and fails quietly when the shipper stalls, which puts you back at the last snapshot without a page.',
      mistake: 'Telling the business the RPO is two minutes because a snapshot job exists, without checking the cron interval.',
      followUp: 'What backup frequency would actually meet a two-minute RPO, and what new failure does that frequency add?',
      extension: 'The snapshot is every six hours and log shipping usually lags by 30 seconds, but the shipper has been stuck for a day. What is the RPO right now?',
      alternative: 'A synchronous replica in another zone can push the data-loss window near zero and creates a dependency that can stall commits when the far zone is slow. That is a stricter RPO with a latency cost, not a snapshot.',
    },
  },
  'disaster-recovery': {
    morning: {
      title: 'Restore from backup, or keep a warm standby',
      why: 'The two common shapes do not meet the same RTO. Picking from habit, instead of from the restore time you measured, is how a plan misses the outage it was for.',
      explain: `Backup-and-restore keeps copies and, when you need them, builds a database from the latest one and the logs you still have. It is cheaper while you are healthy. The RTO includes the whole build. If the last test of a 1.5 TB restore took four hours, you do not have a 30 minute RTO, whatever the runbook hopes. Warm standby keeps a replica close to current, already running, so the work in the outage is promotion and cutover, not a restore from empty disk.

Choose for one system, using the numbers you have. Orders, with an RTO of 30 minutes and a measured restore of four hours, does not get backup-and-restore as the plan. It gets a warm standby you can promote inside half an hour, plus backups for the case where the standby is wrong too. A pile of derived thumbnails can use backup-and-restore, because a four hour rebuild may be acceptable and a second hot copy is not. Do not give both systems the tool you already own.`,
      question:
        'Orders have an RTO of 30 minutes. The last restore test of the 1.5 TB snapshot took four hours. A warm standby in another zone is an option. Choose backup-and-restore or warm standby for orders, and say what the four-hour test ruled out.',
      hints: [
        'Compare four hours with 30 minutes. A plan whose measured step is longer than the RTO is not the plan.',
        'Warm standby still needs a promotion step. It does not need to copy 1.5 TB from cold storage first.',
      ],
      outline: [
        'Backup-and-restore is ruled out as the primary plan because the measured restore is four hours.',
        'The RTO is 30 minutes, so the recovery path has to finish inside that.',
        'Choose a warm standby that can be promoted without a full restore.',
        'Keep backups anyway, for a standby that is corrupt or behind, and do not pretend they meet the RTO.',
      ],
      solution: `Choose a warm standby for orders. The four-hour restore test ruled out backup-and-restore as the way you meet a 30 minute RTO. You cannot copy and replay 1.5 TB in half an hour on the evidence you have. A standby that is already running and within the RPO can be promoted, and the app pointed at it, inside the 30 minutes if you have practiced that and only that. The data is already there. The outage is a promotion, not a rebuild.

Keep the snapshots. They are how you survive a bad migration that replicated to the standby, or a standby that was silently broken. They are not the RTO plan, and the runbook should not tell the on-call to start a four-hour restore while customers are down if the standby is healthy. Say the choice in one line on the system page: orders fail over to the warm standby, backups are for reconstruction after the failover path itself is bad. Thumbnails and other rebuildable data can stay on backup-and-restore. Orders cannot, not with these numbers.`,
      rubric: [
        'Warm standby is chosen for orders because a measured four-hour restore cannot meet a 30 minute RTO.',
        'Backups are kept for a different failure, not described as the path that meets the RTO.',
      ],
      myth: [
        'A tested backup is a disaster-recovery plan for any RTO.',
        'It is a plan for an RTO longer than the test. A four-hour restore does not satisfy a 30 minute RTO, no matter how successful the test was.',
      ],
      context:
        'The RPO still has to hold on the standby. A replica that is hours behind is backup-and-restore with extra steps. Warm means the lag is inside the RPO you wrote down.',
      tradeoff: 'A warm standby costs a second database every quiet day and makes a 30 minute RTO possible. Backup-and-restore is cheap on quiet days and spends the outage on a restore you already measured as too slow.',
      mistake: 'Declaring the four-hour test a success and leaving backup-and-restore as the orders plan for a 30 minute RTO.',
      followUp: 'The standby is 45 minutes behind when the primary dies. Which requirement does promotion fail first?',
      extension: 'What would you choose for a thumbnail store whose RTO is one day and whose data can be regenerated?',
      alternative: 'Two active databases, both taking writes, can beat a 30 minute promotion and require a conflict rule for orders that land in both. That is a stricter design than a warm standby, not a backup policy.',
    },
    evening: {
      title: 'The step you have not rehearsed',
      why: 'A drill that restores a snapshot into a scratch cluster does not rehearse the step that will eat the RTO: making production traffic use the new database, and making the old one stop.',
      explain: `Promotion is not the whole failover. The app still has a connection string, pools full of sockets to the old primary, and writers that will resume if the old primary comes back. The unrehearsed step is the cutover: point the app at the new primary, recycle the pools, and fence the old primary so it cannot accept writes. A drill that stopped at "we restored the bytes" never did this. In the real event it is the step that runs long, because the config is in three places and one of them is a secret nobody rotated in the standby.

Name that step as untested. Do not let a green restore drill stand in for it. The next rehearsal has to change a real connection target in a non-production stack that looks like production, or you do not know the 30 minutes. Fencing is part of the same step. A primary that wakes up and still takes orders will split the data the RPO was meant to protect.`,
      question:
        'You have restored an orders snapshot into a scratch cluster in four hours. You have never pointed the app at a promoted standby or fenced the old primary. Which failover step is unrehearsed, and what does the outage look like if you skip it?',
      hints: [
        'The bytes being present is the step you already drilled. The app does not read the scratch cluster.',
        'Without a fence, the old primary can accept writes after it returns. That is a split brain, not a recovery.',
      ],
      outline: [
        'The unrehearsed step is the application cutover and fencing the old primary.',
        'A snapshot restore does not practice the connection string, the pools, or the fence.',
        'If you skip the cutover, users stay down against a dead or demoted host.',
        'If you skip the fence, the old primary can take writes and diverge from the standby.',
      ],
      solution: `The unrehearsed step is the cutover. You have not pointed the application at a promoted standby, recycled its connection pools, and fenced the old primary so a returning host cannot take orders. The four-hour restore drilled a different step: getting bytes onto a disk nobody’s app used. In a real failover the standby can be promoted in minutes and the site can stay down because three services still open the old host, or because a pool holds dead connections until the process restarts.

If you skip the cutover, users keep failing against the old primary and the new one sits idle, so the RTO clock runs while you edit config under pressure. If you skip the fence, the old primary comes back, accepts writes, and you now have two orders databases. The RPO does not describe that world. The next drill has to include the cutover on a staging stack with the same config shape, timed, with the fence included. Until that drill exists, the recovery plan is a restore you already know is too slow, plus a failover you have never finished. Say that in the review. A green checkbox on the snapshot test is how this step stays imaginary.`,
      rubric: [
        'The unrehearsed step is the application cutover, including fencing the old primary, not the snapshot restore.',
        'Skipping it is described as users staying down, or as a split brain if the old primary still accepts writes.',
      ],
      myth: [
        'A successful restore drill means the failover is rehearsed.',
        'It means you can get bytes back. Failover also changes where the app connects and makes sure the old primary stays quiet. Those steps were not in the drill.',
      ],
      context:
        'Connection draining has the same shape at a smaller scale. Stopping one process is not done until callers have moved. A database failover is that move, with writes at stake.',
      tradeoff: 'Drilling the cutover on staging takes a real outage of staging and finds the config mistakes. Not drilling it keeps staging up and leaves the mistakes for the production RTO.',
      mistake: 'Marking disaster recovery as tested because the snapshot restore succeeded, without a cutover in the test.',
      followUp: 'The standby is promoted and one worker fleet still writes to the old primary. What do you turn off first?',
      extension: 'What config, besides the host name, is likely to be missing on the standby and only noticed during cutover?',
      alternative: 'A proxy in front of the database lets you repoint one place instead of every service. It is another thing to fail over, and it is a smaller unrehearsed step than a hunt through every connection string.',
    },
  },
  'safe-deploy': {
    morning: {
      title: 'A rollout that can stop and go back',
      why: 'A deploy that only moves forward turns every bad release into a debugging session on the live traffic. Safe means you can halt the rollout and return to the image that was serving.',
      explain: `Roll one instance at a time, and do not start the next until the new one is actually ready. Readiness has to touch the dependency the handler needs, or a process that cannot reach the database will take traffic. Watch the new instance against the old ones. If its 5xx ratio is more than a couple of points worse, stop. Leave the rest of the fleet on the old image. Going back means deploying the previous image digest, which you recorded and which is still in the registry. "Go back" is a command you have, not a hope that the pipeline can reverse.

Twelve instances, one at a time, is a bounded blast radius only if the halt works. A rollout that continues through a bad canary because nobody wired the halt is a big bang with extra steps. Record the digest before you start, in the release, not in someone’s shell history. The rollback is only as real as that digest.`,
      question:
        'Describe a rollout of twelve checkout instances that can stop halfway and go back. What has to be true of readiness, of the halt condition, and of the previous image?',
      hints: [
        'One at a time, and the next starts only after the new instance is ready on a real dependency.',
        'Going back means a recorded image digest, not a rebuild from a branch that has moved.',
      ],
      outline: [
        'Replace one instance at a time, and wait for a readiness check that uses the real dependency.',
        'Halt if the new instance’s 5xx ratio is a couple of points worse than the old ones.',
        'On halt, send no further instances to the new image.',
        'Go back by deploying the previous digest, which was recorded and is still in the registry.',
      ],
      solution: `Roll the twelve instances one at a time. The new process does not receive traffic until readiness succeeds, and readiness runs a cheap real query rather than returning 200 from a process that cannot reach the database. Only then drain one old instance and move to the next. Compare the new instance’s 5xx ratio and latency with the ones still on the old image. If 5xx is more than about two points worse for five minutes, halt. The instances already on the new image can be rolled back. The ones not yet touched stay old. That is the stop.

Going back is a deploy of the previous image digest, the one you wrote on the release before you started, still present in the registry. It is not "revert the git commit and build whatever that produces now," because dependencies and build args move. It is not a flag you meant to add later. If you cannot name the digest and the command that installs it, the rollout cannot go back, and it is not this design. Twelve steps that always continue to the end are a slow big bang. The halt, and the digest, are what make the slowness useful.`,
      rubric: [
        'The rollout proceeds one instance at a time, gated on a real readiness check, and halts on a worse error ratio.',
        'Rollback is a deploy of a recorded previous image digest, not a rebuild from memory.',
      ],
      myth: [
        'A rolling deploy is safe because it does not restart every instance in the same second.',
        'It is safe if it can stop and if the previous image is deployable. A rollout that always finishes, or that cannot find the old digest, only spreads the blast over more minutes.',
      ],
      context:
        'Drain is part of each step. Replacing an instance without draining it fails the in-flight checkouts even when the new image is fine.',
      tradeoff: 'One at a time is slow and limits a bad image to a fraction of traffic. All twelve at once is fast and makes the halt useless because there is nothing left to halt.',
      mistake: 'Building a fresh image from the previous git tag at rollback time and discovering the build is not the bytes you ran last week.',
      followUp: 'Three of twelve instances are on the bad image when you halt. What do you do with those three, and what do you do with the other nine?',
      extension: 'What should the readiness check avoid doing so it does not stampede the database every few seconds?',
      alternative: 'A blue-green cutover keeps a full second fleet and switches traffic in one step, which is a fast go-back if you keep the old fleet up. It costs two fleets and does not give you the one-instance halt unless you canary first.',
    },
    evening: {
      title: 'The migration a rollback does not undo',
      why: 'The rollback you designed ships an image. A migration ships data. Putting the old image back does not put the old data back, and the old image may be unable to read what it finds.',
      explain: `Code and schema move on different buttons. The deploy tool can return the previous process. It will not reverse an UPDATE that rewrote every row, and it will not put a dropped column back. If the new release uppercased every order status, the old code that still looks for the lowercase value finds nothing. The rollback "succeeded" in the deploy tool and checkout is still down, now in a way the old binary cannot fix.

Treat a migration that rewrites or destroys data as a separate ship, with its own backward path, or do not ship it in the same breath as the code. Expand first, in a way the old code can still run. Contract only after the old code is gone and you have kept it gone. The failure mode is a rewrite that looked like part of the deploy and is not undone when the deploy is.`,
      question:
        'A migration rewrote every order status from lowercase open to uppercase OPEN, and the old code only recognizes open. Explain why rolling the image back does not restore checkout. What would have to be undone that the deploy tool will not undo?',
      hints: [
        'The rollback replaces the process. The rows stay uppercase. The old process reads those rows.',
        'Name the data change as a second ship. The image digest does not contain the old column values.',
      ],
      outline: [
        'The deploy rollback returns the old image and leaves the rewritten rows in place.',
        'The old image looks for lowercase open and finds OPEN, so checkouts and reads still fail.',
        'Undoing the migration means rewriting the data back, which is not the image rollback.',
        'A destructive or rewriting migration needs its own backward path, or it must wait until old code is gone.',
      ],
      solution: `Rolling the image back restores the old binary and leaves the rows as OPEN. The old binary’s queries and comparisons look for open. They match nothing, so the service that "rolled back" still cannot read an order. The deploy tool did what it can do. It cannot invent the lowercase values. Those were overwritten in place. There is no previous digest for a row.

What has to be undone is the data rewrite: an UPDATE that maps OPEN back to open, and any code path that will uppercase it again the moment it runs. That is a second migration, with its own lock and its own chance to fail halfway. It is not the rollback button. If you dropped a column as well, the rollback is worse, because the old image will error on every query that names the column, and the values are gone unless a backup has them. The way to avoid this shape is to stop rewriting in place. Add the new representation beside the old, keep old code able to read old data, and remove the old data only in a later deploy, after the previous image is no longer something you might start. Until then, a code rollback is not a data rollback, and the runbook should say so on the migration that rewrites.`,
      rubric: [
        'The image rollback is described as leaving rewritten rows in place, so the old code still fails.',
        'The undone work is a data change the deploy tool does not perform, not another restart of the new image.',
      ],
      myth: [
        'If you can roll the code back, you can always get to the state you had this morning.',
        'You can get the process you had this morning. The rows are whatever the migration left. A rewrite in place is still there after the old process starts.',
      ],
      context:
        'Expand and contract exists so a code rollback still has data it can read. The rewrite-in-place migration is the version that skips the expand and makes the rollback a lie.',
      tradeoff: 'Rewriting in place is one migration and a simple schema. It makes the previous image unsafe. Expanding into a new column is more steps and keeps the previous image readable.',
      mistake: 'Putting the status rewrite in the same release as the code change and listing "roll back the deploy" as the full recovery.',
      followUp: 'Halfway through the uppercase migration the job crashes. What does the old code see if you roll the image back now?',
      extension: 'A migration only added a nullable column and did not rewrite rows. What does the code rollback do in that case?',
      alternative: 'Restoring the pre-migration snapshot puts the data back and loses every order written after the snapshot. That meets a rollback of the schema and misses the RPO, which is why it is not the button either.',
    },
  },
  canaries: {
    morning: {
      title: 'The metric and the time that decide',
      why: 'A canary that "looks fine" has no clock and no line. Promote and halt have to be a metric, a comparison, and a time, or the canary is a small rollout with a hopeful name.',
      explain: `Decide the rules before the canary takes traffic. The metric is the checkout 5xx ratio and the p99, on the canary, compared with the instances still on the old image. The time is 20 minutes, and the canary must have served at least 2,000 requests in that window before you promote. Halt if the canary’s 5xx ratio is a point or more above the baseline for five minutes, or if its p99 crosses 400 milliseconds.

The sample size is the part that forces the canary to be large enough. At 40 requests per second overall, a 5% canary sees about 2 requests per second, which is about 2,400 requests in 20 minutes. That clears 2,000. A 1% canary sees 0.4 per second, about 480 requests in 20 minutes, and you would be promoting on a sample you already said was too small. Write the fraction from the rate, not from a feeling that one instance is "a canary."`,
      question:
        'Define the metric and the time that promote or halt a checkout canary. Overall traffic is 40 requests per second. Show a canary fraction that can collect 2,000 requests in 20 minutes.',
      hints: [
        'Compare the canary with the baseline, not with zero. A quiet baseline can hide a canary that is merely as bad as this morning.',
        '2,000 requests in 20 minutes is a rate. Divide to see how much of 40 requests per second you need.',
      ],
      outline: [
        'Promote only if, after 20 minutes and at least 2,000 canary requests, 5xx and p99 are within the line.',
        'Halt if canary 5xx is at least one point above baseline for five minutes, or p99 exceeds 400 milliseconds.',
        'At 40 requests per second, 5% of traffic is about 2 requests per second.',
        'That is about 2,400 requests in 20 minutes, which clears the 2,000 request floor. One percent does not.',
      ],
      solution: `Promote if 20 minutes have passed, the canary has served at least 2,000 requests, its 5xx ratio is under one point above the old instances, and its p99 is under 400 milliseconds. Halt if the 5xx gap is one point or more for five minutes, or the p99 crosses 400 milliseconds, and do not wait for the 20 minutes to expire before you halt. The metric is the comparison, not the canary’s absolute error rate. A canary at 1% errors is a failure if the baseline is 0.1%, and it is noise if the baseline is already 1%.

At 40 requests per second, 2,000 requests in 20 minutes requires 2,000 / 1,200, about 1.7 requests per second on the canary. A 5% slice is 2 requests per second, about 2,400 requests in the window, so 5% is large enough to be allowed to promote. A single instance that is 1% of the fleet sees about 0.4 requests per second, about 480 requests in 20 minutes, and must not be promoted on this rule. It has not met the sample. The time and the count are both required. Twenty quiet minutes is not evidence. Two thousand requests in three minutes is not the clock you set, unless you also kept the five-minute halt rule armed the whole time.`,
      rubric: [
        'Promotion and halt use a canary-versus-baseline metric, a duration, and a minimum request count, not a vibe check.',
        'The canary fraction is derived from 40 requests per second so that 2,000 requests can arrive in 20 minutes.',
      ],
      myth: [
        'Any single new instance is a canary if you watch it for a little while.',
        'It is a canary if it carries enough traffic to support the halt and the promote rules. One instance can be too small to learn from and still be large enough to hurt the users it does touch.',
      ],
      context:
        'The rolling deploy’s halt is this rule aimed at one instance at a time. A canary makes the same comparison on purpose, on a slice you chose, before the rest of the fleet moves.',
      tradeoff: 'Twenty minutes and 2,000 requests catch a steady failure and miss a bug that strikes one request in ten thousand. A longer canary catches rarer bugs and leaves the new code in front of users while you wait.',
      mistake: 'Promoting because the canary’s dashboard was green for twenty minutes, without checking that it served enough requests to see a failure.',
      followUp: 'The canary’s 5xx ratio is two points above baseline at minute six. Do you wait for minute twenty?',
      extension: 'What other metric, besides 5xx and p99, would you add if the bug is "successful checkouts that charge twice"?',
      alternative: 'A synthetic checkout against the canary gives you a steady sample when real traffic is low. It misses bugs that depend on real cards and real baskets, so it supplements the 2,000 real requests and does not replace them.',
    },
    evening: {
      title: 'Too small to see, or too large to hold',
      why: 'A canary can miss a total failure if it is a tiny slice watched on a global graph, and it can wound half the users if it is most of the fleet. Both mistakes wear the same name.',
      explain: `Too small: the canary is 1% of traffic and the halt rule watches the global error ratio with a threshold of two points. A canary that fails every request moves the global ratio by about one point. You do not halt. You promote a fully broken slice because the metric you chose cannot see it. Too large: the canary is half the fleet. The same total failure is obvious, and half of users are already in it. You learned quickly and you did not contain anything.

The morning rule, canary versus baseline, with a minimum sample, is what makes 1% either wait or grow until it can be seen. A global threshold does not become a canary rule by wishing. Show the arithmetic of the miss, or the blast radius of the oversized slice. Either one is the lesson. A canary without a fraction and a metric is how you get both, on different days.`,
      question:
        'Overall checkout error ratio is 0.5%. The canary is 1% of traffic and fails every request. Your halt rule is a global error ratio two points above normal. Show that this canary is promoted anyway. In one sentence, what would a 50% canary have done instead?',
      hints: [
        'A fully failed 1% slice adds about one point to the global error ratio. Compare that with a two-point threshold.',
        'A 50% slice that fails every request puts about half of users into the failure before you halt.',
      ],
      outline: [
        'Baseline global errors are 0.5%. The canary is 1% of requests and 100% of those fail.',
        'The new global ratio is about 1.5%, a rise of about one point, under the two-point halt.',
        'The canary is promoted while completely broken. It was too small for this metric to see.',
        'A 50% canary would have been visible immediately and would already have failed half of users.',
      ],
      solution: `The broken canary is invisible to the halt rule. Baseline global errors are 0.5%. The canary takes 1% of requests and fails all of them, which adds about one percentage point of errors. The other 99% still fail at 0.5%, which is about half a point. Together the global ratio is about 1.5%, roughly one point above baseline. The halt wants two points. You do not halt. At the end of the window you promote, and 1% of checkout is now the broken image. The canary was too small for a global threshold to see a total failure.

A 50% canary that fails every request would move the global ratio to about 50% at once. You would see it and halt, after half of users had already been failed. That one is too large to contain the failure. The 1% case is the one this rule actually ships. Fix the rule, not the hope: compare the canary’s own ratio with the baseline, and refuse to promote a slice that cannot gather enough requests. A global graph will keep blessing a small broken canary, because 1% of traffic cannot move a two-point global line.`,
      rubric: [
        'The 1% total failure is shown adding about one point to the global error ratio, below a two-point halt, so it is promoted.',
        'The 50% alternative is described as visible and already harmful to half of users, or the sizing problem is otherwise made numeric.',
      ],
      myth: [
        'A small canary is always the safe canary, because the blast radius is small.',
        'A small canary is safe only if your metric can see it fail. On a global error ratio, a 1% slice can be fully broken and stay under the threshold.',
      ],
      context:
        'This is the sample-size rule from the promote decision, failed on purpose. The 2,000 requests were there so you would not be in the 480-request version of this blindness.',
      tradeoff: 'Growing the canary until the metric can see it also grows how many users a real failure hits before the halt. Shrinking it to "be safe" returns you to a slice that cannot fail loudly.',
      mistake: 'Watching the company-wide error graph during a 1% canary and treating a flat line as a pass.',
      followUp: 'What canary fraction, failing every request, would move a 0.5% baseline up by two full points?',
      extension: 'The canary fails only for one country that is 5% of canary traffic. Does the global rule see that any better?',
      alternative: 'Comparing canary and baseline error ratios on the canary’s own requests would have shown 100% versus 0.5% immediately. You still need enough requests for a partial failure, which is why the sample floor stays.',
    },
  },
  'migration-flags': {
    morning: {
      title: 'Expand, then read, then delete',
      why: 'A schema change, a read-path change, and a delete do not belong in one deploy. Old processes are still running during a rollout, and they will meet whatever you removed.',
      explain: `Separate the migration into three ships. Expand: add the new column as nullable, deploy code that writes both the old column and the new one, and keep reading the old column. Every old instance can still start, because nothing it needs was removed or made mandatory. Move readers: backfill the new column, then deploy code that reads the new column, while still writing both. Delete: only after every running process reads and writes the new column, stop writing the old one, and in a later deploy drop it.

The delete is last because a rollback or a straggler on the previous image still needs the old column. Doing all three in one release means a half-rolled fleet: new code writes only the new column, old code reads only the old one, and checkout depends on which instance the balancer picked. Flags are how you move readers without another branch. They are not how you skip the expand.`,
      question:
        'You are moving checkout from a price column to price_cents. Separate expanding the schema, moving readers, and deleting the old path. What is still true of old instances during the first step?',
      hints: [
        'The first deploy adds a column and dual-writes. It does not drop price, and it does not switch reads.',
        'Old instances must still be able to read and write price while the new binary rolls out.',
      ],
      outline: [
        'Expand: add nullable price_cents, write both columns, keep reading price.',
        'Old instances still run, because price is unchanged and nothing new is required.',
        'Move readers only after a backfill, and keep the dual-write while they move.',
        'Delete the old path in a later deploy, after no running process reads or writes price.',
      ],
      solution: `Expand first. Add price_cents as a nullable column. Deploy code that writes both price and price_cents, and that still reads price. During this rollout an old instance is a valid process: it does not know about price_cents, it writes price, and it can read every row. The new instance writes both and reads price, so a row the old instance just wrote is still readable. Nothing is dropped. Nothing is NOT NULL yet. A rollback to the old image is still a working checkout.

Next, backfill price_cents from price for old rows. Then move readers, behind a flag if you want a fast reversal: new code reads price_cents, and both columns are still written so a rolled-back reader sees fresh prices. Last, and only when every instance is on the new read path and you are not going to start the old image, stop writing price and drop it in a following deploy. That delete is its own ship. If you combine it with the expand, the old instance in the rolling restart queries a column you removed, or misses prices the new instance wrote only to price_cents. Three deploys feels slow. One deploy is how the balancer becomes a coin flip between two schemas.`,
      rubric: [
        'Expand, move readers, and delete are three steps, with dual-write before the read switch and delete last.',
        'During the expand, old instances still read and write the original column, and the new column is not required.',
      ],
      myth: [
        'A migration is one deploy: change the table and the code together, since they are one feature.',
        'A rolling deploy runs two codes at once. The table has to be valid for both until the old code is gone. That is three steps, not one.',
      ],
      context:
        'The rollback that does not undo a rewrite is what happens when delete and rewrite share the expand’s deploy. Keeping the old column is what makes the image rollback real.',
      tradeoff: 'Three deploys take longer and keep the old column alive, which costs space and a dual-write. One deploy is shorter and makes the mixed fleet incorrect.',
      mistake: 'Dropping price in the same migration that adds price_cents, because the new code no longer mentions price.',
      followUp: 'A straggler instance on the old image is still running when you are about to drop price. What do you do before the drop?',
      extension: 'Where does a feature flag help, and which step must not be "just a flag" because it destroys data?',
      alternative: 'A new table and a backfill job, with reads switched by flag, is the same three phases. It isolates the new shape and makes the dual-write a sync between tables instead of columns.',
    },
    evening: {
      title: 'The window where two writes can disagree',
      why: 'Dual-write is the period when expand is done and delete has not started. Two columns are supposed to move together. A failure of one write is a checkout that quietly charges the wrong amount later.',
      explain: `During the dual-write window every update writes price and price_cents. If those are two statements and the second fails, the first may already be committed. Readers still on price see the new amount. Readers that have moved to price_cents see the old amount. The request that returned success has created two truths. Which one the user gets depends on which instance serves the next read.

That window ends only when you stop writing the old column and no reader uses it. Until then, both writes belong in one transaction, and a failure rolls both back and fails the request. Catching the second error and continuing is the bug. A repair job that scans for disagreements is a backstop, not a reason to return success. The window is not a brief implementation detail. It is the whole middle of the migration, and it can last as long as the backfill and the slowest reader.`,
      question:
        'Checkout dual-writes price and price_cents. The price update commits and the price_cents update fails. What does a reader of each column see, and what should the request have done instead of returning success?',
      hints: [
        'The two readers disagree because the columns are no longer one fact. Say the amounts.',
        'One transaction around both updates turns the partial failure into a failed request and no visible change.',
      ],
      outline: [
        'The dual-write window is the time when both columns are live and readers may be on either.',
        'A committed price and a failed price_cents leaves the new amount in one column and the old amount in the other.',
        'A reader of price sees the update. A reader of price_cents does not.',
        'The request should have failed and rolled both back, instead of returning success.',
      ],
      solution: `The columns have diverged. Suppose the row held price 15 and price_cents 1500, and the update meant 20 and 2000. price is now 20. price_cents is still 1500, because that statement failed. A reader still on the old column shows 20. A reader that has moved to price_cents shows 15 dollars. The same cart is two amounts, and the balancer chooses which bug the user sees. If you returned success, the client will not retry, and nothing in the user interface says the columns disagree.

The request should have failed. Put both updates in one transaction, and do not catch a failure of the second write and continue. If the transaction rolls back, price stays 15 and price_cents stays 1500, and the user sees an error they can retry. A repair job can still scan for rows where the two columns do not match, because a crash can leave a torn write you did not intend to commit. The job is the sweep. It is not permission to return 200 on a torn write. The window stays dangerous until the old column is unused. Shorten it by moving readers and then stopping the old write. Do not leave dual-write in place because it feels safer than deleting. It is safer than deleting too early, and it is a new failure mode of its own.`,
      rubric: [
        'A partial dual-write is described as the two columns holding different amounts, with each reader seeing the column it still uses.',
        'The request is required to fail and roll both writes back, rather than succeed after one column updates.',
      ],
      myth: [
        'Dual-writing two columns is safe because they are updated in the same request.',
        'The same request can still commit one statement and fail the next. Safety is one transaction that rolls both back, not two writes that happen to sit next to each other in the handler.',
      ],
      context:
        'This is the charge that committed and the record that did not, in column form. The user got a success. The second fact did not move. Retries will not fix it if you already returned 200.',
      tradeoff: 'One transaction keeps the columns equal and holds a lock a little longer. Two statements without a transaction are shorter on the happy path and create a split price on the sad one.',
      mistake: 'Logging the second-write failure and returning 200, with a comment that the repair job will catch it.',
      followUp: 'Both columns are in one transaction and the process dies after commit and before the response. What does the client do, and what do the columns contain?',
      extension: 'What does the repair job compare, and what does it do when price and price_cents disagree?',
      alternative: 'Writing only the new column and translating for old readers in a database view avoids a second application write. The view has to exist before old code is gone, and a view that is not updatable just moves the dual-write into the database.',
    },
  },
  'operate-service': {
    morning: {
      title: 'What on-call needs on one page',
      why: 'The person paged at 3am did not build the service. They need the objective, the screen, the way to ship, and the way to go back. Anything less turns the first hour into archaeology.',
      explain: `Write the minimum as four concrete things, not as "we have monitoring." The SLO: 99.9% of POST /checkout requests return below 500 in under 500 milliseconds, rolling 30 days, measured at the edge, with the link to where that fraction lives. The dashboard: the one checkout screen with symptom, saturation, and errors. The deploy: which pipeline, who is allowed to run it, and how you can tell what is live. The rollback: the command or button that installs the previous image digest, and the sentence that a schema rewrite is not undone by that button.

If any of the four is "ask Alex," you do not have it. Alex is asleep, or Alex is the person who is already down. The page is short on purpose. A wiki of forty links is not a minimum. It is a search problem. One page, four blocks, each block something you can do or read without a second person.`,
      question:
        'Write the minimum an on-call engineer needs for checkout: the SLO, the dashboard, the deploy, and the rollback. Be concrete enough that a new on-call could use the page without asking who owns the service.',
      hints: [
        'The SLO needs the route, the threshold, the window, and where it is measured. "99.9% uptime" is not that.',
        'Rollback names the previous digest or the button that has it. It also says what a rollback will not undo.',
      ],
      outline: [
        'SLO: 99.9% of POST /checkout under 500 milliseconds and below status 500, rolling 30 days, at the edge.',
        'Dashboard: the single checkout screen with symptom, saturation, and errors.',
        'Deploy: the pipeline name and who may run it.',
        'Rollback: the previous-image action, plus the warning that it does not undo a data rewrite.',
      ],
      solution: `The on-call page says the following, and no less. SLO: 99.9% of POST /checkout requests finish in under 500 milliseconds with a status below 500, over a rolling 30 days, measured at the edge. Link the graph that is that fraction, not a CPU chart. Dashboard: one link, the checkout screen, with success ratio, p99, pool and database saturation, and 5xx by status. Deploy: the checkout pipeline, the group allowed to click it, and where the running digest is shown. Rollback: the button that deploys the previous recorded digest, the expected time, and one line that says this does not reverse a migration that rewrote or dropped data.

A new on-call can page through those four without asking who built checkout. If the SLO line is missing, they will not know whether 2% errors is an incident. If the dashboard is a folder of graphs, they will spend the first half hour assembling the screen you should have built. If deploy and rollback are "use the pipeline," they will find the forward button and not the back one. Write the back one down. This is the minimum. Traces, the log query, and the fraud escalation belong as links under it. They are not substitutes for the four. The page is done when you can hand it to someone who has never merged a change here and they can say what "bad" means and how to go back.`,
      rubric: [
        'All four are present and specific: an SLO with a route and a window, a single dashboard, a deploy path, and a rollback path.',
        'Rollback includes a limit, such as migrations it does not undo, so the page does not pretend the button is omnipotent.',
      ],
      myth: [
        'A competent on-call can operate a service if they have production access and a wiki.',
        'Access without an SLO, a single screen, and a known rollback is how the first hour is spent finding the basics. Competence does not invent a digest you never recorded.',
      ],
      context:
        'This page is the reliability phase in one place: the objective, the signals, the safe deploy, and the rollback that does not undo data. If it is missing, the earlier lessons stay in a doc the incident will not open.',
      tradeoff: 'A short page stays readable and omits the rare dependency. A long page covers the rare dependency and is not read at 3am. Put the rare path one link down, not in the first four blocks.',
      mistake: 'Linking a dashboard folder and a pipeline index and calling the minimum done, with no SLO and no rollback.',
      followUp: 'The rollback button exists and the previous digest was never recorded. What does the on-call actually run?',
      extension: 'What fifth item would you add first: the log query, the fraud escalation, or the database failover?',
      alternative: 'An on-call shadow who knows the service replaces the page until they are asleep or gone. The page is the version that survives them. A shadow is still the fastest way to test whether the page is enough.',
    },
    evening: {
      title: 'The gap that lengthens the next incident',
      why: 'The minimum is four things. The incident gets longer by the one that is missing, because that is the step people will invent under pressure instead of execute.',
      explain: `Look at the four and name the hole, not the polish. A missing SLO means you argue about whether this is bad. A missing dashboard means you argue from three different graphs. A missing deploy path is rare, because shipping is how the service got here. A missing rollback is common and expensive: the pipeline only moves forward, and the previous digest is not on the release. The next bad deploy spends its first hour in archaeology, finding a known-good image and a way to start it, while users keep failing.

That hour is the gap. Filling it is a recorded digest and a command that installs it, written on the on-call page and tried once on a quiet day. A better postmortem template does not shorten the hour. Another dashboard panel does not. The gap is the thing you would be desperate to have in minute five, and that you do not have.`,
      question:
        'The on-call page has the checkout SLO, the dashboard link, and a deploy button. There is no recorded previous digest and no rollback control. Name the gap, and say how it makes the next bad deploy longer.',
      hints: [
        'The first useful action on a bad deploy is to return to the previous image. That action is the one you cannot find.',
        'Count the time spent identifying a digest and a way to start it as incident time, not as prep you can skip.',
      ],
      outline: [
        'The gap is rollback: no recorded previous digest and no control that installs it.',
        'SLO, dashboard, and deploy are present, so the missing one is not "observability" in general.',
        'The next bad deploy spends the first hour finding a known-good image and a way to run it.',
        'Users stay on the bad image during that hour. A written rollback would have been minutes.',
      ],
      solution: `The gap is rollback. The SLO tells you checkout is failing. The dashboard shows it. The deploy button is how the bad image went out and is not a way back. Nobody recorded the previous digest on the release, and the pipeline has no reverse control. The next incident’s first hour is spent finding an image that might be last week’s, checking it was actually the one in production, and inventing a way to start it. That hour is added to the outage. Users are on the broken deploy the whole time, because the stop-the-harm step has no handle.

Write the previous digest on every release, and put a rollback control next to deploy that installs that digest. Run it once when nothing is on fire, so the first use is not the outage. Do not fill the gap with another graph. You already have the dashboard, and it is already telling you to go back. Do not fill it with a longer SLO document. You already know this is bad. The missing piece is the action the incident order puts first. Until it exists, every checkout deploy is a ratchet. The on-call page that lists three of the four is honest only if it says, in the fourth block, that you cannot go back.`,
      rubric: [
        'Rollback, specifically a recorded previous digest and a way to install it, is named as the gap rather than a generic lack of tooling.',
        'The next incident is longer by the time spent reconstructing that rollback while users stay on the bad deploy.',
      ],
      myth: [
        'If you can deploy, you can roll back, because rollback is just another deploy.',
        'Only if you know the digest and have a path that installs it. A forward-only pipeline plus an unrecorded image is not a rollback you have. It is a build you hope you can recreate.',
      ],
      context:
        'The safe rollout’s halt and the incident’s first action are the same button. Leaving it off the on-call page means both lessons are theory the moment a deploy goes bad.',
      tradeoff: 'Recording digests and keeping old images costs registry space and a little discipline on each release. Not recording them saves nothing you can see until the hour you spend reconstructing one.',
      mistake: 'Adding a fifth dashboard panel after this incident, and still shipping the next release without a recorded digest.',
      followUp: 'You add the rollback button and have never pressed it. What is still likely to make the next incident long?',
      extension: 'The digest is recorded and the last release also rewrote order statuses in place. What gap remains even after the button works?',
      alternative: 'A documented "build the previous git tag" procedure is better than nothing and worse than a digest. It can produce different bytes, and it spends the incident in a build queue.',
    },
  },
};
