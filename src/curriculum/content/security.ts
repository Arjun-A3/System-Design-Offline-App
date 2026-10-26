import type { LessonPair } from './publish';

export const securityLessons: Record<string, LessonPair> = {
  'threat-modeling': {
    morning: {
      title: 'Assets, actors, and one abuse',
      why: 'A review that starts with "is it secure?" has nowhere to land. Name the thing you would hate to lose, who can reach it, and one way that reach goes wrong.',
      explain: `Take a small feature and list three things before you list bugs. The assets are what the feature holds: the note body, the owner, and the share link that grants a read. The actors are who can show up: the owner, a person who was given the link, anyone who can hit the public route, and an operator who can read the database. One abuse is enough. A share link that never expires and is not tied to a person still works after it is forwarded, pasted into a ticket, or left in a browser history.

Write that abuse as a sentence with an actor and an asset. A former recipient keeps reading the note because the link is still a credential. That is a product path. You can add more later. A model with no asset and no actor is a pile of tool output, and it does not tell you what to change first.`,
      question:
        'A notes app adds "share this note by link." List the assets, the actors, and one abuse of that link. Keep the abuse to a single path a real person can take.',
      hints: [
        'The link is an asset and a credential. Treat it as both.',
        'Include an actor who is no longer supposed to have the note, not only a stranger.',
      ],
      outline: [
        'Assets include the note body, the owner, and the share link.',
        'Actors include the owner, a recipient, the public route, and an operator.',
        'The abuse is a forwarded or leftover link that still grants a read.',
        'The sentence names who keeps access and which asset they still see.',
      ],
      solution: `The assets are the note contents, the identity of the owner, and the share link itself, because the link is the key. The actors are the owner, a recipient the owner chose, anyone who later obtains the link, and an operator with database access. Anonymous internet traffic matters only because the redemption route is public.

One abuse is enough to start: the owner sends the link to a contractor, the contractor forwards it, and the link still opens the note after the contract ends. Nothing on the request proves the caller is still allowed. The control is to make the link expire, or to bind it to a person you can remove, and to give the owner a way to revoke it. Write that down before you hunt for a more surprising bug.`,
      rubric: [
        'Assets, actors, and one abuse are listed as three different things, and the link is treated as a credential.',
        'The abuse is a concrete path, a leftover or forwarded link, rather than a generic claim that sharing is risky.',
      ],
      myth: [
        'A threat model is a catalog of clever techniques you found in a write-up.',
        'It is a list of assets, actors, and abuses for the feature you are shipping. Technique comes after, if it still matters.',
      ],
      context:
        'Security review on a small feature fails when the ticket says "consider security" and nobody names the note or the link. The list is the review.',
      tradeoff: 'A link that expires forces the owner to send it again. A link that lives forever is easy to share and impossible to take back once copied.',
      mistake: 'Skipping the asset list and starting with a scanner report that does not mention the share link.',
      followUp: 'Which actor can revoke the link, and what still works after they do?',
      extension: 'What asset does an operator with a database login hold that a link holder does not?',
      alternative: 'Sharing by inviting an account, instead of a link, removes the anonymous credential and blocks the case where the recipient has no account yet.',
    },
    evening: {
      title: 'Rank the damage, not the cleverness',
      why: 'Teams fix the bug that was interesting to find. The incident comes from the bug that exposes the most data or keeps working the longest.',
      explain: `Impact is whose data moved, how much of it, and whether you can undo it. A share link that still opens customer notes is a wide, durable exposure. A surprising header that only changes the color of a public badge is a small, visible defect. The header can be harder to find. That does not raise its rank.

Cleverness is a property of the discovery. Rank is a property of the outcome. Put the abuses in order by what a customer or a regulator would lose, then by how long the access continues after you wish it had stopped. Fix in that order.`,
      question:
        'You have two abuses. A share link never expires, so a forwarded link still opens the note. A surprising header changes the color of a public badge. Rank them by impact, and say what you ignore.',
      hints: [
        'Ask whose data is exposed, and for how long, before you ask how the bug was found.',
        'A public badge has no private note behind it. The link does.',
      ],
      outline: [
        'The leftover share link exposes note contents to whoever obtains the link.',
        'The badge change alters a public field and does not reveal the note.',
        'Rank the link first because the data and the duration are worse.',
        'How surprising the header was does not change the order.',
      ],
      solution: `Rank the share link first. It exposes the note, which is the asset you listed, to anyone who has the link, for as long as the link stays valid. You may not know who copied it. Revocation is the only undo, and only if you built it. The badge bug changes a color everyone was already allowed to see. It is a defect. It is not the incident.

Ignore which one took longer to find, which one looks better in a slide, and which one uses a header the team has not seen before. Cleverness is not a severity. If you only have time for one change this week, expire or revoke the link. File the badge beside it so it is not forgotten, and do not pretend the two are the same kind of loss.`,
      rubric: [
        'The link is ranked above the badge because of data exposure and duration, not because it is easier to explain.',
        'The answer explicitly sets aside how clever or surprising the header was.',
      ],
      myth: [
        'The hardest bug to find is the one you should fix first.',
        'Difficulty of discovery is not impact. A simple leftover link can outrank a surprising header.',
      ],
      context:
        'Incident severity works the same way. A quiet export of customer notes outranks a loud, clever outage of a public decoration.',
      tradeoff: 'Ranking by impact delays visible bugs that annoy people today. Ranking by cleverness ships a story and leaves the note exposed.',
      mistake: 'Scheduling the header bug first because the write-up was more impressive than the link.',
      followUp: 'What would you measure to show the link abuse has actually stopped?',
      extension: 'How would the rank change if the badge color were visible only to the note owner?',
      alternative: 'Scoring both on a formal matrix is fine when the two impacts are close. Here the data difference is large enough that the order does not need a spreadsheet.',
    },
  },
  'trust-boundaries': {
    morning: {
      title: 'Where data becomes untrusted',
      why: 'Every check you put in the client can be skipped by a client you did not write. The boundary is the first place a caller cannot edit.',
      explain: `Draw the line where a request enters your server. The browser, the mobile app, and a partner posting JSON are all outside it. Body fields, query parameters, and headers are untrusted on arrival, including fields your own UI filled in. A cookie becomes trusted only after you have checked the signature and the expiry. A message on your queue is inside the boundary only if the producer is authenticated and you accept that producer as a peer.

The handler is the first code that can refuse. Anything earlier is a convenience for an honest client. Say that out loud when you draw the picture: this line is where we start believing checks, and nothing on the left of it counts.`,
      question:
        'Sketch a notes app with a browser, a public API, and a database. Draw the boundary where data becomes untrusted, and name one field that is still untrusted even though your page set it.',
      hints: [
        'Your page is a client. A client is outside the boundary.',
        'The database is not the boundary. It stores whatever the handler already accepted.',
      ],
      outline: [
        'The boundary is the server handler that receives the request.',
        'The browser and any other client sit outside that line.',
        'A field the page filled in is still untrusted at the handler.',
        'The database trusts the handler, so it is the wrong place to discover the lie.',
      ],
      solution: `Put the boundary at the handler. The browser is outside. So is a script, a replayed request, or a second client using the same API. The database is inside, which means it is too late: it will store a price, a role, or a note id that the handler already accepted.

One field that stays untrusted is the note id, the owner id, or a price the page computed. The page setting the value is not a check. It is a suggestion. The handler has to load the row, decide that this caller may touch it, and ignore any copy of the truth the client repeated back. Mark that on the drawing so the next reviewer does not add the check in the component and call it done.`,
      rubric: [
        'The boundary is the server entry, and clients including your own UI are outside it.',
        'A concrete field is named as untrusted even though the page populated it.',
      ],
      myth: [
        'Data is trusted if our own frontend sent it.',
        'The frontend is a client. Anyone can send the same request without that page, so the handler must check again.',
      ],
      context:
        'This is the same line as a proxy header you only trust from the proxy. The writer has to be inside the boundary, or the field is just user input.',
      tradeoff: 'Checking only at the handler means the UI can still be wrong and confusing. Checking only in the UI means the API is unprotected. The UI check is for people. The handler check is for the system.',
      mistake: 'Drawing the boundary around the whole company, so every internal caller is treated as trusted by default.',
      followUp: 'When would a message from your own queue sit outside the boundary anyway?',
      extension: 'Where does the boundary move if a gateway authenticates the caller and the app is reachable past the gateway?',
      alternative: 'A gateway check helps when the gateway is the only path in. The handler still owns checks that need the row, because the gateway does not have it.',
    },
    evening: {
      title: 'The field the UI already checked',
      why: 'Disabled inputs convince the team the value cannot change. The server then stores the client copy, and a modified request becomes the order.',
      explain: `A check that lives only in the page is invisible to the API. The page can disable a price box, cap a quantity, or hide an admin toggle. The handler never sees those controls. It sees JSON. If it copies price, qty, or isAdmin from that JSON into the database, it has accepted a field because the UI already looked fine in a demo.

Find the field by reading the handler, not the component. Anywhere the server writes a client-supplied value that the server could have looked up itself, the UI check does not count.`,
      question:
        'Checkout disables the price box and posts sku, qty, and price. The handler checks that qty is positive and inserts the posted price. Which field did the server accept because the UI checked it, and what should set the price?',
      hints: [
        'A disabled input is a browser behavior. It is not on the request path.',
        'The server can price a sku from the catalog without reading a price from the client.',
      ],
      outline: [
        'The price field is the one the UI pretended to lock.',
        'The handler writes the posted price after checking only qty.',
        'A client can send a different price and the UI never runs.',
        'The server must price the sku from the catalog and ignore the posted price.',
      ],
      solution: `The field is price. The page disabled the box, so an honest browser will not edit it. The handler never checks the number against the catalog. It checks qty and stores whatever price arrived. A client that posts the same JSON with a different price never loads the page, so the disabled box does nothing.

The catalog sets the price. The handler loads the sku, reads the current price on the server, and computes the total from that and from qty. The posted price is discarded, or compared and rejected if you want to detect a stale page. Quantity still needs a server-side cap if the catalog has one. The UI can keep showing the price. It cannot be the place that decides it.`,
      rubric: [
        'Price is identified as trusted only because the UI disabled it, and qty is not confused with that hole.',
        'The fix is server-side pricing from the catalog, with the posted price ignored or rejected.',
      ],
      myth: [
        'A disabled form field means the API will only ever see the value we rendered.',
        'Disabling a field changes one browser. The API receives whatever body a caller sends.',
      ],
      context:
        'The same hole is an isAdmin flag, a discount percent, or an account id in the body. If the server can know the value, the client copy is untrusted.',
      tradeoff: 'Ignoring the posted price avoids a forged total and surprises a client that cached a stale price. Returning a clear conflict is kinder and is still a server decision.',
      mistake: 'Re-checking the price in the mobile app and leaving the handler as it is.',
      followUp: 'What do you return if the posted price does not match the catalog?',
      extension: 'Which other field in that body is the same class of mistake if the client sends it?',
      alternative: 'Signing the price in the page and verifying the signature still means you, not the client, issued the number. A catalog lookup is simpler when the sku is enough.',
    },
  },
  'oauth-systems': {
    morning: {
      title: 'Who is allowed to see what',
      why: 'OAuth splits a login across more than one party. If you cannot say what each party is allowed to see, a token ends up in the wrong hands by design.',
      explain: `Four roles show up in a typical grant. The resource owner is the person. The client is the application that wants to call an API on their behalf. The authorization server is what they log in to, and what issues the tokens. The resource server is the API that holds the photos, the notes, or the invoices.

They do not all see the same things. The owner sees a consent screen, not other people tokens. The client sees an authorization code and then the tokens for the scopes that were granted, not the password. The authorization server sees the login and the grant, not the photos. The resource server sees an access token, the scopes, and the resources those scopes allow. It does not need the password, and it does not need the refresh token.`,
      question:
        'A photos app sends the user to an identity provider and then calls a photos API. Name the four roles in that system, and say what each one is allowed to see. Include the password and the photos.',
      hints: [
        'The app is the client. The identity provider and the photos API are different roles.',
        'The password belongs at the authorization server. The photos belong at the resource server.',
      ],
      outline: [
        'The person is the resource owner. The photos app is the client.',
        'The identity provider is the authorization server. The photos API is the resource server.',
        'The client sees granted tokens, not the password and not every photo.',
        'The photos API sees the access token and the allowed photos, not the password.',
      ],
      solution: `The resource owner is the person whose photos they are. The client is the photos app. The authorization server is the identity provider that signs them in and records consent. The resource server is the photos API.

The owner sees the login and the consent screen. The client is allowed to see an authorization code and the tokens for the scopes the owner granted, and then the photos those scopes cover when it calls the API. It is not allowed to see the password. The authorization server sees the authentication and the grant, not the photo bytes. The resource server sees the access token, the scopes or claims inside it, and the photos that grant allows. It should not see the password or a refresh token. If your design shows the password to the photos app, you have collapsed the roles and given the client a secret it was never supposed to hold.`,
      rubric: [
        'All four roles are named, with the app, the identity provider, and the photos API kept distinct.',
        'The password stays at the authorization server, and the photos stay at the resource server behind the granted scopes.',
      ],
      myth: [
        'The client has to see the password, or it cannot act for the user.',
        'The authorization server sees the password. The client receives a grant, limited by scopes, and never handles the password.',
      ],
      context:
        'Collapsing these roles is how a "sign in with us" button turns into the photos app storing a password. The token exists so those stores stay separate.',
      tradeoff: 'Narrow scopes limit damage when a client is sloppy, and they force the owner through consent again when the app needs a new kind of access.',
      mistake: 'Letting the photos app collect the password and call that OAuth because a token is issued afterward.',
      followUp: 'Which role should learn that the owner revoked the app, and how does the photos API find out?',
      extension: 'What is the client allowed to see if the owner grants only "read thumbnails"?',
      alternative: 'A first-party session cookie is a reasonable design when you own the app and the API. It is not a reason to hand that app the password of a third-party account.',
    },
    evening: {
      title: 'A stolen device is a stolen grant',
      why: 'An access token dies quickly on purpose. The refresh token is what lets a client keep acting after the person walks away, so its storage is the account.',
      explain: `A refresh token tells the authorization server to mint a new access token without the owner typing a password. That is the point of it. Whoever holds the refresh token can be the client, for as long as the grant stays valid. If that token sits in a plain file, a backup, or a browser store any script can read, then a stolen device or a stolen backup is enough. The thief does not need the password and does not need the owner to approve anything.

The access token being short does not fix a copied refresh token. The authorization server will keep honoring the grant. The control is where you store it, how fast you can revoke that grant, and whether a reused refresh token tells you the grant was copied.`,
      question:
        'A phone app stores the refresh token in a plain file so a webview can read it, and backups include that file. Explain how a stolen device, or a stolen backup, becomes a stolen account. Say what you would store instead.',
      hints: [
        'The refresh token is enough to get new access tokens without the owner present.',
        'A short access token does not help once the refresh token has left the phone.',
      ],
      outline: [
        'The plain file is readable to whoever has the device or the backup.',
        'The authorization server treats the refresh token as the client.',
        'New access tokens are issued without the password and without the owner.',
        'Store the refresh token in the platform keystore and make the grant revocable.',
      ],
      solution: `The file is the grant. A person who images the phone, or who reads the backup, copies the refresh token. They present it to the authorization server from their own machine. The server issues access tokens for the scopes the owner already approved. The photos API sees a normal client. The password was never required, because the refresh token exists so the owner does not have to be there. That is a stolen account until the grant is revoked or it expires, and a long-lived grant may not expire soon.

Store the refresh token in the platform keystore and keep it out of the webview and the backup. Keep access tokens short. Rotate the refresh token and revoke the whole grant if an old one is presented again, which is a sign it was copied. Give the owner a way to revoke the app, and make the photos API refuse tokens whose grant is dead. The stolen file then stops working even if you never get the device back.`,
      rubric: [
        'The stolen file is enough because the authorization server mints new access tokens from the refresh token alone.',
        'The replacement storage is the platform keystore, with revoke or reuse detection on the grant.',
      ],
      myth: [
        'A short-lived access token means a stolen phone stops being the account within minutes.',
        'The access token is the short piece. A refresh token in a plain file keeps minting new ones after the phone is gone.',
      ],
      context:
        'This is the phone version of putting a refresh token where page script can read it. The bearer of the token is the client, from the authorization server point of view.',
      tradeoff: 'Refresh rotation detects a copied token and can lock the owner out if two legitimate clients race. A refresh token that never rotates is easier and stays valid for whoever copied it.',
      mistake: 'Encrypting the plain file with a key that sits in the same backup, and calling that a keystore.',
      followUp: 'What should the photos API do with an access token whose grant was revoked five minutes ago?',
      extension: 'Which role learns about the theft first if reuse detection fires at the authorization server?',
      alternative: 'A device-bound grant that the server will not refresh without a hardware signature still fails if you also ship a copyable refresh token beside it. Binding only helps if the copyable token is gone.',
    },
  },
  secrets: {
    morning: {
      title: 'Where the secret lives',
      why: 'A secret you cannot locate will be copied into the next config file. Say the store, the readers, and the rotation, or you do not have a secret. You have a string.',
      explain: `A database password should live in a secret store, not in the repo and not in the image. The workload identity can read that one secret at start, or the platform mounts it into the process. People do not get standing read access. An on-call break-glass path can read it, and that read is itself recorded.

Rotation writes a new version while the old version still works, reloads the process or waits until new instances have the new value, then disables the old version. Two valid versions overlap so a restart is not an outage. If you cannot say who can read the current value, or how the old value dies, the secret is not managed. It is baked.`,
      question:
        'A service connects to a database with a password. Say where that secret lives, who can read it, and how you rotate it without an outage. Name a reader who should not have it.',
      hints: [
        'The running service needs the secret. Every developer with the repo does not.',
        'Rotation needs an overlap. Disabling the old password first is an outage.',
      ],
      outline: [
        'The password lives in a secret store, fetched or mounted at runtime.',
        'The workload identity can read it. Standing human access cannot.',
        'Rotation adds a new version, reloads, then disables the old one.',
        'A developer cloning the repo is a reader who should not see it.',
      ],
      solution: `The password lives in a secret manager, one secret for this database. The service identity is allowed to read that name at runtime. The platform injects it into the process environment or a file with restricted permissions after the container starts. Developers do not have it in the repo. A break-glass role can read it, and that read is audited. A developer who only cloned the repository is a reader who should not have it.

Rotate by publishing a new version and updating the database to accept both passwords for a window. Roll the service so new processes read the new version. When every running process has reloaded, disable the old version at the database and then in the store. If you disable first, you take an outage on every process that has not reloaded. If you never disable the old one, you did not rotate. You added a second permanent password.`,
      rubric: [
        'The store, the workload reader, and a human who must not have standing access are all named.',
        'Rotation overlaps two versions and only then disables the old password.',
      ],
      myth: [
        'An environment variable in the deploy config is secret management.',
        'An environment variable is a delivery mechanism. Management is the store, the reader list, and a rotation that actually disables the old value.',
      ],
      context:
        'Connection strings hide the password in a longer string. They are still the secret. Whoever can read the string can log in as the service.',
      tradeoff: 'A short overlap reduces the window with two passwords and breaks a slow rollout. A long overlap survives a stuck deploy and leaves the old password useful to anyone who already copied it.',
      mistake: 'Rotating by editing a shared password in chat and hoping every process was restarted.',
      followUp: 'How do you know every running process has dropped the old password?',
      extension: 'Who is allowed to read the secret audit log that records break-glass access?',
      alternative: 'A short-lived database credential minted for the workload identity removes the long-lived password. You still have to say which identity can mint it, and what happens when the minter is down.',
    },
    evening: {
      title: 'The secret in the image, the repo, or the logs',
      why: 'Runtime injection does not help if a copy already shipped in a layer, a commit, or a log line. Those copies have their own readers and their own retention.',
      explain: `Three places keep defeating the secret store. The image bakes the value into a layer, and anyone who can pull the image can read the history. The repo stores it in a file that was committed once, and history keeps it after the file is deleted. The logs print a config object or a connection error that includes the password, and the log system retains that line for as long as you keep logs.

Each copy has readers who are not the workload identity. A registry, a source host, and a log bucket are secret stores you forgot to name. Finding one of them is the exercise. Removing it means rebuilding or rewriting history, and redacting the sink, not only changing the current task definition.`,
      question:
        'A Dockerfile sets the database password as an environment default, the same file was committed last quarter, and the process logs its config on startup. Show where the secret is, who can read it, and what changing today deploy file does not fix.',
      hints: [
        'Image layers and git history keep a value after you delete the line that introduced it.',
        'A log of the config object is a copy with the log retention period as its lifetime.',
      ],
      outline: [
        'The secret is in the image layer, the git history, and the startup log.',
        'Readers include anyone who can pull the image, read the repo, or read the logs.',
        'Those readers are not the workload identity you intended.',
        'Editing today deploy file leaves the layer, the history, and the old log lines in place.',
      ],
      solution: `The secret is in all three. The Dockerfile wrote it into a layer, so anyone who can pull the image, including people who pull old tags, can recover it from the build history. The commit put it in the repo, so anyone with clone rights, and anyone with a fork or a backup of the git host, can see last quarter file. The startup log printed the config, so anyone with log access can read it for as long as that index keeps the line.

Changing today deploy file, or rotating the current task, does not remove those copies. You have to build a new image that never contained the value, stop publishing the old one, and treat the old password as compromised: rotate it at the database. You have to purge or accept the git history, and turn off the config dump so the new password does not land in the logs. Until the old password is disabled, every one of those copies still logs in.`,
      rubric: [
        'At least one of image, repo, and logs is shown with a reader who is not the service identity.',
        'The answer says a current-config edit leaves the old copy, and the password has to be rotated.',
      ],
      myth: [
        'Deleting the line and redeploying removes the secret.',
        'The line is gone from the tip. The layer, the git history, and the log retention still have it until you rebuild, purge, and rotate.',
      ],
      context:
        'Crash reports and error trackers are the log case again. A connection string in an exception is a secret with the vendor retention policy.',
      tradeoff: 'Rewriting git history removes the secret from the main clone and breaks everyone who based work on those commits. Leaving the history means you must rotate, because you will not erase every clone.',
      mistake: 'Rotating the password and leaving the startup log in debug, so the new password is printed on the next boot.',
      followUp: 'How long do the old log lines keep the password after you fix the logger?',
      extension: 'Which of the three copies can a person with registry pull access read without touching the repo?',
      alternative: 'Building the image with a secret mount that never enters a layer avoids the image copy. It does nothing for a password that is already in git history. That one still forces a rotation.',
    },
  },
  'least-privilege': {
    morning: {
      title: 'Only the calls this account makes',
      why: 'A service account named after the app often can do anything the app might someday need. The breach uses the calls you allowed and the code never makes.',
      explain: `List the calls the process actually makes, from the code and from a week of audit data, not from the name of the service. An invoice worker that reads one prefix and sends to one queue needs those two actions on those two resources. It does not need list and delete on every bucket, and it does not need to change passwords, even if the platform default role offers them.

Write the policy from that list. If a call is not on the list, it is not allowed. When the code grows a new call, the policy change is part of that code change. A role that was convenient on the first day becomes the real permission boundary, so convenience is the wrong source.`,
      question:
        'An invoice worker calls get-object on one bucket prefix and send-message on one queue. Reduce its service account to the calls it actually makes. Name two permissions you would remove from a broad default role.',
      hints: [
        'Start from observed calls, not from the permissions screen the console offered.',
        'Delete, list-all, and identity changes are not required by those two calls.',
      ],
      outline: [
        'Allow get-object only on the invoice prefix.',
        'Allow send-message only on the one queue.',
        'Remove delete and list on other buckets.',
        'Remove any identity or account permission the default role included.',
      ],
      solution: `Allow storage get-object on the invoice prefix and nothing else in that service, and allow send-message on the invoice queue and nothing else. Deny or simply omit delete, put, and list on that bucket, and omit every other bucket. Omit the queue actions that receive, purge, or reconfigure.

Remove two things the broad role usually has. First, object delete and list across all buckets, which the worker never calls. Second, any identity permission, such as creating keys or changing policy, which has nothing to do with invoices. If a weekly trace shows a third call, add that call on that resource. Do not add the whole service because the trace surprised you. The reduced account should be readable as a sentence: this worker may read invoices and may enqueue one message.`,
      rubric: [
        'The allowed set is the two real calls on the two real resources, not a whole service.',
        'Two broader permissions are named and removed, including something the worker never calls.',
      ],
      myth: [
        'A service account is least privilege if it is not a human administrator.',
        'A non-human account can still hold every action. Least privilege is the list of calls the process makes, on the resources it uses.',
      ],
      context:
        'Platform defaults exist so a tutorial finishes. They are the opposite of a production role. The first deploy is when you replace them, not after the first incident.',
      tradeoff: 'A tight role breaks the next feature until the policy is updated, which is a loud failure. A broad role never breaks the feature and turns a bug into access you did not intend.',
      mistake: 'Granting the whole storage service because one get-object call returned access denied during a deploy.',
      followUp: 'How would you notice a permission the worker has not used in a month?',
      extension: 'What permission do you add, and on which resource, if the worker must later write a PDF beside the invoice?',
      alternative: 'A separate role per queue and per bucket prefix is stricter and multiplies identities to rotate. One role with two statements is enough for a single worker.',
    },
    evening: {
      title: 'The bug a broad role turns into a breach',
      why: 'The same defect is a 500 or a breach depending on what the platform will still do for the process. The role decides which one you get.',
      explain: `Imagine the worker passes an object name from the request through to storage. The intended names are invoice keys for one tenant. The bug is that the name is not constrained to that prefix. If the role can read only that prefix, the platform refuses every other key. The caller gets an error. The other buckets stay unread.

If the role can read every bucket, the platform does what the bug asked. One request returns another team backup, a secret file, or a customer export. The code defect is the same in both stories. The broad role is what turns it into a breach, because nothing behind the bug says no.`,
      question:
        'A bug forwards a caller-supplied object name to get-object. Explain the incident you get if the worker role can read every bucket, and the incident you get if it can read only the invoice prefix.',
      hints: [
        'The platform enforces the role. The buggy line does not.',
        'Compare an access error with a successful read of someone else data.',
      ],
      outline: [
        'The bug sends an unconstrained object name to storage.',
        'A prefix-scoped role makes the platform deny anything outside the invoices.',
        'A role that can read every bucket returns the object the caller named.',
        'The breach is the broad role obeying the bug, not a second bug.',
      ],
      solution: `With the broad role, the bug is a breach. The caller supplies a name outside the invoice prefix, the worker asks storage, and storage returns the object because the role is allowed to read it. That can be another service backup or a file of customer data. Your application never decided to expose it. The platform followed the role. Logs may show a normal get-object. Nothing in the happy path looks like an exploit framework. It looks like the worker doing its job on the wrong key.

With the prefix-scoped role, the same call is denied. The caller still has a bug to fix, and they do not receive the foreign object. The incident is an error, maybe a noisy one if they keep trying. It is not a disclosure. Reduce the role before you are clever about the bug, because you will not find every bug, and the role is what the platform believes.`,
      rubric: [
        'The broad role is what lets the buggy get-object succeed on data the worker should never read.',
        'The scoped role turns the same bug into a denial, and the two outcomes are contrasted.',
      ],
      myth: [
        'If we fix the input check, the role can stay broad.',
        'The input check is one bug. The role is the backstop for the next bug that also passes a name through.',
      ],
      context:
        'This is why a leaked application bug and a cloud incident report describe the same request. One team sees a bad parameter. The other sees a successful read with a powerful principal.',
      tradeoff: 'Scoping to a prefix means a legitimate new folder fails closed until you update the policy. Leaving the role broad means that failure never happens, and neither does the denial that would have saved you.',
      mistake: 'Calling it a breach only if the caller used an unusual tool, and ignoring a normal request that returned the wrong object.',
      followUp: 'What audit event tells you the broad role actually read a key outside the prefix?',
      extension: 'What changes if the broad permission was delete-object instead of get-object?',
      alternative: 'A storage proxy that only accepts invoice ids, and that holds the powerful role itself, moves the check into a smaller component. The worker role can then be nothing, which is stricter and is another service to run.',
    },
  },
  injection: {
    morning: {
      title: 'Data that got parsed as code',
      why: 'Command, SQL, and template bugs look different in the report and fail the same way. A parser treated a caller value as instructions.',
      explain: `A shell command built by joining strings gives the shell a chance to parse the joined text. The filename was data. The shell may treat part of it as syntax. A SQL statement built by joining strings gives the database the same chance. The search term was data. The database may treat part of it as the statement. A template that evaluates expressions, if you paste a comment into it, gives the template engine the same chance.

The three names are one mistake. Data and code were put in the same string, and a powerful parser read that string. The damage follows whatever the parser is allowed to do: run a program, read a table, or render something you did not write. The fix is not a longer denylist of characters. The fix is to stop handing data to a parser that executes.`,
      question:
        'Explain command injection, SQL injection, and template injection as the same confusion of data with code. Use a filename, a search box, and a comment. Do not write a payload.',
      hints: [
        'Name the parser that received the string: the shell, the database, or the template engine.',
        'The failure is the join into one string, not a particular punctuation mark.',
      ],
      outline: [
        'A filename joined into a shell command is parsed by the shell.',
        'A search term joined into SQL is parsed by the database.',
        'A comment joined into an evaluating template is parsed by the template engine.',
        'All three fail because data and code shared one string.',
      ],
      solution: `Command injection is a filename, a host, or an argument placed into a shell command line. The shell parses the whole line, so the value is not guaranteed to stay one argument. SQL injection is a search term placed into the text of a query. The database parses the whole text, so the term is not guaranteed to stay a value in a comparison. Template injection is a comment placed into a template that evaluates expressions. The engine parses the comment, so the text is not guaranteed to stay text on the page.

In each case the program trusted a parser to know which characters were yours and which were the caller. It does not. The caller value has to travel on an API that cannot change the statement, the argument list, or the template. Filtering characters is a guess about that parser. Separating data from code is the actual control, and it is the same control for all three.`,
      rubric: [
        'All three are explained as a caller value being parsed as instructions, with shell, database, and template named.',
        'The answer describes the confusion and does not include a working payload or a character-by-character bypass.',
      ],
      myth: [
        'Injection is a list of bad characters you can strip out of the input.',
        'The parser, not the character list, decides what is code. Stripping characters guesses at a grammar. Binding data avoids the grammar.',
      ],
      context:
        'Reports split these into different categories because the parsers differ. The design review should see one mistake so the same fix is applied at each call site.',
      tradeoff: 'A denylist is easy to add to a form and will miss a parser you did not study. A bound parameter is a small API change and removes that parser from the path.',
      mistake: 'Escaping quotes for SQL and then building a shell command with the same string because the quotes were already handled.',
      followUp: 'Which parser runs if your SQL library builds the statement on the server from a joined string?',
      extension: 'Why does a stored note become dangerous later if a template evaluates it on the way out?',
      alternative: 'A query builder that only accepts structured filters can keep data and code apart. A builder that falls back to raw strings reopens the hole at the fallback.',
    },
    evening: {
      title: 'The API that keeps them apart',
      why: 'The safe call is the one that cannot express "run this too." Point at that API, not at a filter you hope is complete.',
      explain: `SQL drivers let you send the statement and the values separately. The database binds each value as data, even when the value contains punctuation. Process APIs let you pass an argument vector and skip the shell, so a filename is one argument and is not parsed as a command line. Template engines can be configured to insert text as text, with encoding for the output format, and to refuse to evaluate expressions that came from stored content.

Those are three APIs with one shape. The code structure is fixed in your program. The caller value is a parameter. If the call site still builds one string and passes it to a shell, a raw query, or an evaluating template, you are not using the API that keeps them apart.`,
      question:
        'Point at the API that keeps data and code separate for a search term in SQL, a filename passed to a program, and a comment rendered on a page. Say what the dangerous call looks like beside each.',
      hints: [
        'Look for a call that takes the statement and the values as different arguments.',
        'A shell command string is the dangerous form. An argument array that does not invoke a shell is the safe form.',
      ],
      outline: [
        'SQL uses a parameterized statement. The search term is a bound value.',
        'The dangerous SQL call concatenates the term into the statement text.',
        'The process API takes an argument list and does not start a shell.',
        'The template inserts the comment as text and does not evaluate it.',
      ],
      solution: `For the search term, point at the driver call that takes a fixed statement and a separate list of values, often described as a prepared or parameterized query. The term is bound. It cannot close a quote and become syntax, because it never joins the statement text. The dangerous call builds that text by concatenation or by an f-string and sends one string to the database.

For the filename, point at a process spawn that takes the program and the arguments as a list and does not invoke a shell. The filename is one element of that list. The dangerous call is a single command string passed to a shell. For the comment, point at a template or encoder that inserts the comment as text and encodes it for HTML, and that does not compile stored comments as templates. The dangerous call is an engine that evaluates expressions in the comment. If you cannot find the safe call at the site, the site is still joining data and code.`,
      rubric: [
        'The SQL, process, and template APIs are named as separate-argument or text-only calls.',
        'Each safe API is paired with the string-joining or evaluating call it replaces.',
      ],
      myth: [
        'Using an ORM means injection is handled, whatever the call site does.',
        'An ORM that interpolates a raw clause is the dangerous API. The safe API is the one that binds parameters, and you have to point at that call.',
      ],
      context:
        'Code review can check this without a payload. The signature of the call tells you whether data can change the statement.',
      tradeoff: 'Parameterized queries block injection and can prevent a database from reusing a plan if you parameterize things that should be structure, such as a column name. Column names belong in your code, not in a bound value, because they are syntax.',
      mistake: 'Binding the search term and still concatenating a caller-supplied ORDER BY column into the same statement.',
      followUp: 'How do you allow a caller to choose a sort column without concatenating it?',
      extension: 'What is the equivalent safe API when the "command" is a URL query you are building?',
      alternative: 'Stored procedures keep the statement on the database and still fail if the procedure itself concatenates its input into dynamic SQL. The boundary has to be safe on the far side too.',
    },
  },
  ssrf: {
    morning: {
      title: 'The server fetches a URL the caller chose',
      why: 'A preview or an import feels like the user opening a page. The request actually comes from your network, with your routes and sometimes your credentials.',
      explain: `Some features take a URL and fetch it on the server: a link preview, an invoice import, a webhook delivery, an avatar from a remote host. The caller picks the destination. Your process makes the connection. From the target point of view, the client is your server, not the person.

That matters because your server can reach addresses the person cannot. Internal hostnames, the metadata service a cloud instance uses, and services that trust the private network are all on that map. If the fetch also sends internal headers or runs with a role that can read cloud credentials, the URL is not a bookmark. It is a way to ask your server to be the client.`,
      question:
        'You add "import this invoice from a URL." Describe what fetches the URL, from which network, and why a caller-chosen address is different from the caller opening it in a browser.',
      hints: [
        'The browser would fetch from the user network. This feature fetches from the server network.',
        'Internal names and the instance metadata service are reachable from the server and not from the public user.',
      ],
      outline: [
        'The server, not the browser, performs the fetch.',
        'The connection comes from the server network and the server identity.',
        'The caller chooses the destination, including destinations they cannot open themselves.',
        'Internal services and metadata endpoints become reachable through the feature.',
      ],
      solution: `The application server fetches the URL. The packet leaves from the server address, inside your VPC or cluster network, using whatever routes and firewall rules the server has. It does not leave from the customer laptop. A URL that points at an internal admin host, a database port, or the instance metadata service is a normal destination for that server and an impossible or meaningless destination for the customer browser.

The difference is the identity and the route. The browser is an untrusted client outside. The server is a trusted client inside, and some internal services allow it because of where it sits. If the feature will fetch any URL the request contains, the caller gets to aim that trusted client. Describe the feature that way in review: user-supplied destination, server-side request. The danger is the aim, not the invoice format.`,
      rubric: [
        'The server is the client, fetching from its own network, and the caller chooses the URL.',
        'Internal or metadata destinations are named as reachable because of that network, not because of a payload.',
      ],
      myth: [
        'A URL parameter is safe if we only intend it for public web pages.',
        'Intention is not what the socket does. The server will connect to whatever address the URL names unless you constrain it.',
      ],
      context:
        'Webhook senders and "see also" preview cards are the same shape. The document you are fetching is not the risky part. The chooser of the destination is.',
      tradeoff: 'Fetching on the server gives a stable preview and can reach sites the user browser would block. It also spends your egress and your trusted network on a caller-chosen host.',
      mistake: 'Blocking a few public URL shorteners and allowing every other destination, including internal names.',
      followUp: 'What identity does the remote host see, the user or the server?',
      extension: 'Why is a metadata address a different kind of target from a public invoice host?',
      alternative: 'Having the browser upload the file, instead of passing a URL, removes the server-side fetch. You then scan and store an upload, which is a different problem and does not aim your network.',
    },
    evening: {
      title: 'The fetch must not see the inside',
      why: 'The control is on destination, route, and credentials. A filter on the URL string will miss a name that resolves inward or a redirect that hops there.',
      explain: `Decide the destinations you are willing to contact, and make everything else impossible for this client. That means an allow list of hosts when the set is small, or a deny of loopback, private, and link-local ranges when you truly must fetch arbitrary public sites. Resolve the name and check the address before you connect. If the response is a redirect, check the next address too. A public name that sends you inward is a new destination, not a detail.

Use a fetcher that cannot reach the metadata service and that does not attach internal authorization headers or the instance role credentials. The invoice import should look like an ordinary public client. If this process has to hold a powerful role for other work, the fetch belongs in a separate client that does not have that role and does not have the internal routes.`,
      question:
        'Restrict the invoice-import fetch so it cannot reach the instance metadata service or other internal services. Say what you check, when you check a redirect, and what credentials the fetcher must not have.',
      hints: [
        'Check the address after DNS, not only the text of the URL.',
        'A redirect is a second destination and needs the same check.',
      ],
      outline: [
        'Allow only intended public hosts, or deny private, loopback, and link-local addresses.',
        'Resolve names and apply that rule before connecting.',
        'Apply the same rule to every redirect.',
        'Run the fetch without metadata access, internal headers, or the instance role.',
      ],
      solution: `Give the importer an allow list of partner hosts if you can. Otherwise deny loopback, private ranges, and link-local addresses, which is where instance metadata services live, and deny your own internal names. Resolve DNS first and apply the rule to the address you will actually connect to, not to the string before resolution. Do this again for each redirect before following it. If any hop fails the rule, stop and return an error to the caller. Do not send them the internal response.

Run that client with no route to the metadata address and with no cloud role that can read instance credentials. Do not copy the application internal auth headers onto the outbound request. The fetcher holds nothing the public internet should be able to aim. If the import feature shares a process with a privileged worker, split them. A string block on one hostname is not the restriction. The address check, the redirect check, and the missing credentials are.`,
      rubric: [
        'Destinations are restricted by resolved address, including private and link-local ranges, and redirects are checked again.',
        'The fetcher is denied metadata access and does not send internal credentials.',
      ],
      myth: [
        'Blocking the word localhost in the URL is the restriction.',
        'Names can resolve to internal addresses, and redirects can change the target. You have to check the address you connect to, every hop.',
      ],
      context:
        'The metadata service is a special internal URL only instances can use. A server-side fetch turns a caller-chosen URL into a client that is allowed to ask.',
      tradeoff: 'An allow list is strict and breaks a customer who needs a new host until you add it. A deny list of private ranges is flexible and fails if you miss a range, a redirect, or a new network you later peer.',
      mistake: 'Checking the first URL, following a redirect blindly, and attaching the application Authorization header to the outbound call.',
      followUp: 'What do you log when you refuse a destination, and what do you leave out of that log?',
      extension: 'Why split the fetcher into its own identity instead of only filtering URLs in the privileged worker?',
      alternative: 'A commercial "fetch this public URL" proxy with its own network can be the allow-listed client. You still have to stop your app from fetching directly beside it.',
    },
  },
  'abuse-limits': {
    morning: {
      title: 'Make stuffing and scraping expensive',
      why: 'Login and list endpoints are cheap to call and expensive to answer. A limit is how you move that cost back onto the caller who is guessing or copying.',
      explain: `Credential stuffing is many password attempts, either many passwords for one account or one common password across many accounts. Scraping is many reads that copy a catalog, a directory, or an export. Neither needs a broken parser. They need your real endpoints and enough tries.

Place a limit that makes those tries expensive in time and in identities. Failures per account, attempts per source address, and reads per token are the usual keys. The response is a refusal, not a slower success. Size the numbers from real traffic so a person can mistype and a partner can sync, and so a script cannot walk the whole set on one credential this hour.`,
      question:
        'Place a limit that makes credential stuffing and scraping expensive on a login route and a contact-list route. Name the key, the kind of caller it slows down, and the response.',
      hints: [
        'Stuffing needs a key on the account and a key on the source. One of them is not enough.',
        'Scraping a list is an authenticated read, so the key is the token or the account, not only the IP address.',
      ],
      outline: [
        'Login failures are limited per account and per source.',
        'That makes guessing many passwords, or one password across many accounts, slow.',
        'List reads are limited per token so one credential cannot copy the directory.',
        'Over the limit, respond with a refusal the client can back off from.',
      ],
      solution: `On login, count failures per account and attempts per source address. A script trying many passwords for one person hits the account limit. A script trying one password across the user table hits the source limit. Return 429 with a wait, or a uniform failure that does not do more work. Do not lock every account in a shared office because one address was noisy. The source limit can be coarser than the account limit.

On the contact list, count reads per token or per account, with a tighter cap on the export than on a single page. One stolen session then cannot pull the whole directory before someone notices. Return 429 before you build the full page. A person paging through their own contacts stays under it. A scraper does not. The limit is doing its job when the abuse needs more accounts, more addresses, and more time than the data is worth.`,
      rubric: [
        'Login is limited per account and per source so both shapes of stuffing get expensive.',
        'The list or export is limited per token or account, and the over-limit response refuses the work.',
      ],
      myth: [
        'A single per-IP limit handles both stuffing and scraping.',
        'Many people share an address, and a scraper can use the real login. You need an account or token key, not only the IP.',
      ],
      context:
        'This is a capacity control and an abuse control at the same time. The graph you protect is password checks and large reads, not only a vague notion of traffic.',
      tradeoff: 'Tight limits make stuffing expensive and lock out a user on a bad network or a partner with a legitimate bulk sync. Loose limits keep them happy and leave the export cheap to copy.',
      mistake: 'Limiting only failed logins per IP, so a distributed set of addresses still walks the password list.',
      followUp: 'What do you do with a partner whose legitimate import exceeds the list limit?',
      extension: 'Which key stops one password from being tried against many accounts?',
      alternative: 'A second factor after a risky login raises the cost of a stolen password. It does not replace the limit. Stuffing still burns your hasher if you let it try.',
    },
    evening: {
      title: 'The limiter sits before the expensive work',
      why: 'A counter that runs after the hash, the query, or the export has already spent the thing the attacker was trying to spend.',
      explain: `Password hashing is deliberately slow. A directory query and a PDF export are accidentally slow. If you increment the limit after those run, every rejected attempt still cost you the CPU, the database, or the file. The attacker got the work done. Your 429 arrived too late to matter.

Put the limiter at the edge of the handler, keyed on the account and the source, and refuse before the expensive call. The counter itself has to be cheap and shared across replicas, or each replica enforces a private budget and the real budget is N times larger. When the counter is down, decide fail closed on login. Serving unlimited hashes because the limiter failed is the abuse path with the lights off.`,
      question:
        'Login hashes the password and then increments a failure counter. The contact export builds the file and then checks a rate limit. Explain why both limits fail, and where the check has to move.',
      hints: [
        'The expensive step is the hash and the export, not the counter increment.',
        'A limiter that runs inside one replica after the work does not protect the fleet.',
      ],
      outline: [
        'The hash and the export run before the limit, so the cost is already spent.',
        'Move both checks to before that work.',
        'Share the counter across replicas so the budget is global.',
        'On login, a broken limiter should fail closed rather than hash without a cap.',
      ],
      solution: `Both limits are souvenirs. The login path paid for a slow hash on every guess and only then noticed the account was over budget. The export path built the file, which is the scrape, and only then returned 429. The caller may not even need your response. They needed your CPU and your data. A limit that observes the completed work does not make the work expensive to them. It makes it expensive to you.

Move the check in front. On login, read the counter for that account and source first, and return 429 without hashing when the budget is gone. On export, refuse before the query. Keep the counter in a shared store so ten replicas do not grant ten budgets. If that store is unavailable, fail closed on login: a short outage of sign-in beats an unlimited hashing run. A product list might fail open under a coarser edge cap. Login should not. The limiter belongs outside the expensive work, including when you are degraded.`,
      rubric: [
        'Both routes are wrong because the hash and the export happen before the refusal.',
        'The fix moves the shared check in front, and login fails closed if the counter is down.',
      ],
      myth: [
        'Returning 429 means the limit worked, wherever you increment it.',
        'The status code is not the control. The control is refusing before the hash, the query, or the export.',
      ],
      context:
        'Edge rate limits in the web tier fail the same way when they run in the handler after a card charge or a search. Cost you already paid is not a limit.',
      tradeoff: 'Failing closed protects the hasher and blocks every login when the counter is down. Failing open keeps logins up and removes the control during the incident.',
      mistake: 'Adding a larger password hasher and leaving it in front of the counter, which makes stuffing more expensive for you.',
      followUp: 'What is the expensive work on the contact route if the export is already cached?',
      extension: 'Why does a per-replica memory counter under-count a stuffing run?',
      alternative: 'A queue that sheds load when it is deep can sit in front of the hasher. It is still a limiter, and it still has to be outside the hash, or the queue only records work you already did.',
    },
  },
  'audit-logs': {
    morning: {
      title: 'Who, what, when, which object',
      why: 'An application log tells you the process was alive. An audit event tells you which principal changed which object. Incidents and disputes need the second one.',
      explain: `An audit event has four fields you can answer a question from. Who is the authenticated principal, a user id or a service identity, not a display name and not a header the client typed. What is the action, a verb you chose, such as invoice.export or member.remove. When is the server time, not a timestamp in the body. Which object is the tenant and the id, or a counted set of ids if the action touched a page of them.

Write it when the action succeeds, and write a denial if the denial itself matters, such as a failed break-glass read. Store it somewhere the application deploy cannot rewrite. Debug logs can sample and expire. The audit trail is the record you will use to say whether a person exported a customer list last Tuesday.`,
      question:
        'Define an audit event for an admin exporting a tenant invoice list. Include who, what, when, and which object. Say which caller-supplied field you will not use as who.',
      hints: [
        'Who has to be the principal you authenticated, not a name in the JSON.',
        'Which object needs the tenant and enough identity to find the invoices later.',
      ],
      outline: [
        'Who is the authenticated admin or service identity.',
        'What is a stable action name for the export.',
        'When is the server clock.',
        'Which object is the tenant and the invoice set, not a client-supplied actor name.',
      ],
      solution: `Who is the admin subject from the session or the token, plus the tenant they were acting in. Do not use a name, email, or "actor" field from the request body. The client can type anything there. What is invoice.export, a verb you control, not the URL accidentally, and not a free-text comment. When is the time on the server when the export was authorized and started. A client timestamp is not evidence.

Which object is the tenant id and the query that defines the set, or the list of invoice ids if it is small. If the list is huge, store a count and a durable pointer to the export job, not a second copy of every row inside the log line. Write the event even if the download later fails halfway, and record the outcome. A debug line that says "export ok" without the principal and the tenant is not this event. You cannot answer "who took the list" from it.`,
      rubric: [
        'The event has an authenticated principal, a stable action, server time, and a tenant-scoped object.',
        'A caller-supplied name or actor field is rejected as the identity.',
      ],
      myth: [
        'Request logs are audit logs if they include the URL and a user agent.',
        'A URL does not name the authenticated principal or the object decision. An audit event is written from the authorization result, on purpose.',
      ],
      context:
        'Break-glass reads of secrets belong here too. The event is the only reason a standing "no humans" rule is enforceable after the fact.',
      tradeoff: 'Logging every denied attempt gives you probing visibility and a bigger trail that can contain ids of objects the caller should not even learn exist. Log denials for sensitive actions, not for every 404.',
      mistake: 'Recording the email the client posted as who, and investigating the wrong person after an export.',
      followUp: 'How do you represent an export of ten thousand invoices without putting every row in the log?',
      extension: 'What extra field do you want when the principal is a service account rather than an admin?',
      alternative: 'A database history table written in the same transaction as the change can be the audit record for row edits. An export that does not change a row still needs an explicit event, because nothing was updated.',
    },
    evening: {
      title: 'What you leave out, and how long you keep it',
      why: 'The audit log is a high-value store. If you paste secrets and message bodies into it, you have built a second, widely readable copy of the data you meant to protect.',
      explain: `Leave out anything that is itself a secret or a full private payload. No passwords, no raw tokens, no session cookies, no card numbers, no recovery codes. An export event can record that an admin exported a tenant. It should not record the file contents. A login event can record success or failure for a principal. It should not record the password that was tried.

Retention is a product decision with a clock. Keep the trail long enough to investigate and to meet the obligation you actually have, and no longer by default. Access to read the audit log is itself an audited action, limited to a small role. A debug habit of logging the request body will copy the omitted fields back in through a side door.`,
      question:
        'Say what you will not put in the invoice-export audit log, and how long you will keep the event. Name the debug habit that would put the omitted data back.',
      hints: [
        'The fact of the export is the event. The invoice bodies and any credential are not.',
        'Retention has to cover an investigation and has to end, or the log becomes a second archive.',
      ],
      outline: [
        'Omit passwords, tokens, card numbers, and the exported file contents.',
        'Keep the who, what, when, and tenant record.',
        'Choose a retention that covers investigation and then deletes.',
        'Logging the raw request or response body would copy the omitted data in.',
      ],
      solution: `Do not put the exported invoices, the caller Authorization header, the session cookie, or any payment number that happened to be in a row. The event is the admin id, the tenant, the action invoice.export, the server time, a count, and a job id. That is enough to show who took the list. The list itself stays in the export system, with its own access control, not in a log a broader set of people can search.

Keep those events for the investigation window you commit to, for example a year if that matches your obligation, and then delete them on a schedule. Do not keep them forever because disk is cheap. Forever means every omitted-field mistake lives in the trail indefinitely. The debug habit that puts the data back is logging the request or response body, or the full row, at info level beside the audit write. Redact those logs, and review the audit schema when someone adds a "helpful" payload field. Reading the audit log should require a role, and that read should append its own event.`,
      rubric: [
        'Secrets and the export contents are excluded, while the principal, action, time, and tenant remain.',
        'A finite retention is stated, and raw body logging is named as the habit that defeats the omission.',
      ],
      myth: [
        'More detail in the audit log is always better for the investigation.',
        'Detail that includes secrets or the exported data creates a second breach in the tool you opened to investigate the first.',
      ],
      context:
        'Application logs already have a "do not log secrets" rule. Audit logs need it more, because you keep them longer and show them to more investigators.',
      tradeoff: 'Short retention limits damage from a bad field and can erase the only evidence of an export you learn about late. Long retention preserves the evidence and preserves any secret you logged by mistake.',
      mistake: 'Storing the generated CSV path in a world-readable log bucket so the audit line is "useful."',
      followUp: 'Who is allowed to read the audit trail, and what event is written when they do?',
      extension: 'What do you do with old events that already contain a token because a body logger ran last month?',
      alternative: 'Hashing an object id in the event reduces exposure and makes the event useless when you need to name the invoice. Prefer a real id with access control on the log over a hash you cannot investigate.',
    },
  },
  'supply-chain': {
    morning: {
      title: 'From the lockfile to the process',
      why: 'A dependency is not a name in a manifest. It is bytes that end up in a process. If you cannot trace that path, you cannot tell what you are running.',
      explain: `Start at the lockfile, not at the import statement. The manifest may allow a range. The lockfile pins a version and a hash. The installer in CI fetches those bytes, verifies the hash, and puts them in a build directory. The image or the artifact copies that directory. The running process loads the module from what was copied, not from what the manifest says today.

If CI resolves ranges again and does not use the lockfile, the trace breaks. You cannot point from a commit to the bytes in production. If the image was patched by hand after the build, the process has bytes the lockfile never named. The trace is the control. Every hop has to be a function of the previous one.`,
      question:
        'Trace one library from the lockfile to a running process. Name each hop, and name the hop that disappears if CI installs from version ranges instead of the lockfile.',
      hints: [
        'The manifest range is not the pin. The lockfile hash is the pin.',
        'The process loads what the image contains, which is only as good as the install that filled it.',
      ],
      outline: [
        'The lockfile pins the version and the hash.',
        'CI installs those bytes and verifies the hash.',
        'The image copies the install, and the process loads that copy.',
        'A range install without the lockfile removes the pin between the commit and the bytes.',
      ],
      solution: `The hop list is: the lockfile entry names the package, the version, and the hash; CI installs from that lockfile and rejects bytes that do not match the hash; the build copies the installed tree into an artifact or an image layer; the deploy runs that digest; the process imports the module from the tree inside that digest. Given a commit, you can name the digest, and given the digest, you can name the hash that was loaded.

The hop that disappears is the pin. If CI runs an install that reads the manifest range and floats to whatever the registry serves today, the commit no longer determines the bytes. Two builds from the same commit can run different code, and a bad publish in the range lands in the process without a lockfile change to review. Keep the lockfile in the repo, install from it in CI, and do not run a second resolver in production startup. The process should not be the place that decides which version it is.`,
      rubric: [
        'The trace includes lockfile hash, CI install, artifact or image, and the running process.',
        'A range-based install is identified as the break between the commit and the bytes.',
      ],
      myth: [
        'The import line in the source is the dependency you are running.',
        'The import is a name. The running bytes came from the lockfile through the installer and the image. Those are the dependency.',
      ],
      context:
        'This is the same idea as an image digest. A tag is a range. A lockfile hash and an image digest are pins. Production should run pins.',
      tradeoff: 'Pinned lockfiles make upgrades explicit and slow down a routine bump. Floating ranges update you quickly and can update you in the middle of a deploy you did not review.',
      mistake: 'Committing the lockfile and then letting the production container run the package manager at startup.',
      followUp: 'How do you prove the bytes in a running container match the lockfile from its build commit?',
      extension: 'What is the equivalent pin for a base image the Dockerfile names only by a tag?',
      alternative: 'Vendoring the source into the repo makes the pin the git commit itself. It enlarges reviews and still requires you to notice when you copy in a new upstream.',
    },
    evening: {
      title: 'The check that stops a bad update',
      why: 'A malicious or broken release matters only if your build will pick it up. The check is the gate between a publish and your process.',
      explain: `An update becomes your code when a resolver accepts a new version and the install runs with your credentials nearby. The check that stops it is a lockfile change that a person reviews, plus an install that will not take a version whose hash is not already in that file. A surprise publish in a range then waits, unrun, until someone bumps the pin on purpose.

A second check belongs on the install environment. Lifecycle scripts and the build should not see production tokens. Even a review can miss a bad release. A missed review must not be able to read the deploy secret. The check you will name first is the one that stops the update from entering the artifact.`,
      question:
        'A package you depend on publishes a new version inside a range you allow. Name the check that would have stopped that update from running in CI. Say what the install environment must not contain even if the check fails.',
      hints: [
        'The lockfile hash is the allow list of bytes. A review of that file is the human gate.',
        'CI credentials are a separate problem from which version was resolved.',
      ],
      outline: [
        'CI installs only versions and hashes already in the lockfile.',
        'A new release does not run until the lockfile changes.',
        'A person reviews that lockfile diff before it merges.',
        'The install environment still must not hold production credentials.',
      ],
      solution: `The check is a lockfile-only install. CI refuses to resolve a newer version on its own. The new publish sits in the registry and does not enter the build until a commit changes the pinned version and hash. That commit is reviewed like code: the reviewer sees the package name and the version move, and can reject it. A range install in CI has no such check. The publish becomes the next build without a diff.

Keep production tokens, cloud keys, and publish rights out of the install step even so. A review can miss a bad release, and a lifecycle script runs during install. The script should have no path to production and no path to push an image. If you also ignore or disable lifecycle scripts you do not need, a bad release has less to run with. The stop, though, is the pin. Without it, you are not choosing the update. The registry is.`,
      rubric: [
        'The stopping check is a reviewed lockfile pin that CI will not float past.',
        'Production credentials are kept out of the install even if a bad version is somehow built.',
      ],
      myth: [
        'We are safe if we only depend on popular packages.',
        'Popularity is not a pin. A new publish in a range you install automatically is your next deploy, popular or not.',
      ],
      context:
        'Provenance attestations and registry signatures are extra checks on the same hop. They do not help if CI never consults the lockfile.',
      tradeoff: 'Human review of every lockfile bump catches a bad release and delays security patches. Automating patch bumps is reasonable when the pin still changes in a visible diff and the install still has no production credentials.',
      mistake: 'Reviewing application code carefully and letting a bot float dependencies in CI with the deploy key present.',
      followUp: 'What do you do with a lockfile bump that updates fifty packages in one diff?',
      extension: 'Which check stops a bad base-image publish if the Dockerfile uses a moving tag?',
      alternative: 'A private registry that only proxies versions you have already approved moves the pin to the proxy. You still need a person or a policy at the approval, or the proxy is just a faster float.',
    },
  },
  'data-minimization': {
    morning: {
      title: 'What this feature does not need',
      why: 'A feature accumulates columns because they might be useful. Every column you store is a column you can leak, and a column you must delete later.',
      explain: `List the personal data the feature writes, and then list the data a helpful design wanted to keep "just in case." A support form needs the account id, the order id, and the message the customer typed. It does not need a copy of the address book, the full card number, the password, or a precise location if a country or a timezone would do.

Need means the feature cannot function without it, or a specific obligation requires it. "Support might ask" and "the model might want it later" are not needs. Write the not-needed list into the design so the table does not gain those columns in review. Dropping a column before you ship is cheap. Dropping it after it has production rows is a project.`,
      question:
        'A "contact support about this order" form stores whatever the client posts. List the personal data the feature actually needs, and the personal data it does not need. Include at least one field you would refuse.',
      hints: [
        'The order id points at data you already store. Copying that data again is a choice.',
        'A password and a full card number are never required to answer a support message.',
      ],
      outline: [
        'Keep the account id, the order id, and the message.',
        'Do not keep the password, the full card number, or the address book.',
        'Do not keep precise location if the ticket does not use it.',
        'Refuse extra fields instead of storing the whole posted object.',
      ],
      solution: `Store the authenticated account id, the order id the account is allowed to reference, the message text, and the time. That is enough to open a ticket on the right order. If you need a contact channel and the account already has an email, store that you will use the account email, not a second copy of an address book.

Do not store the password, a card number, a full postal address, precise location, or the rest of the profile the client felt like posting. Refuse those fields. Do not write a blob of the request body into the ticket table. The order service already holds the shipping address for people who are allowed to see orders. Copying it onto every ticket widens the set of staff and backups that contain it. The list of what you do not need is the design. The list of what you store should be short enough to read in the pull request.`,
      rubric: [
        'The stored set is limited to account, order, message, and time, or a similarly small necessary set.',
        'Password, payment data, or another concrete field is refused rather than stored because it might help.',
      ],
      myth: [
        'Storing extra personal data is fine if the feature is internal.',
        'Internal tools are copied, logged, and backed up. Data you do not need is data you can still leak.',
      ],
      context:
        'Minimization is a storage decision, not a banner. The column list is where it is true or false.',
      tradeoff: 'Refusing extra fields makes some tickets slower, because support must open the order to see the address. Storing the address on the ticket makes support faster and spreads the address to every ticket reader and backup.',
      mistake: 'Saving the entire JSON body so you can decide the schema later, which is a decision to store everything.',
      followUp: 'Who can read the message body after it is stored, and who should not?',
      extension: 'What do you return to the client if they post a card number in the message text?',
      alternative: 'A form that only sends an order id, and lets support pull the rest live, stores even less. It fails when support must see the message the customer wrote, so the message stays and the address does not.',
    },
    evening: {
      title: 'A shorter retention, and the habit it breaks',
      why: 'Keeping every message forever feels like good operations until you are debugging from a copy of customer text you no longer have a reason to hold.',
      explain: `Retention is how long the row lives after the feature is done. A support message has a life: the ticket is open, it closes, a dispute window passes, and then the body is no longer needed. Shorten that clock on purpose. Keep the account id and a coarse outcome longer if you must count tickets. Delete the message body earlier.

The habit that breaks is replaying production text to reproduce a bug. "Pull last quarter messages and retry them" depends on a retention you just decided is too long. Replace it with a bug id, a redacted fixture, and logs that never held the body. If the only way you can debug is to keep personal data, the debug path is the thing to redesign.`,
      question:
        'Support messages are kept for two years. Shorten the retention of the message body, and say which debug habit that breaks. Say what you would keep instead so the ticket is still countable.',
      hints: [
        'The body and the fact that a ticket existed do not have to share one lifetime.',
        'Reproducing a bug from raw customer text is the habit that needs the long retention.',
      ],
      outline: [
        'Shorten the message body to the dispute or support window, not two years.',
        'Keep a ticket id, account id, and outcome longer if you need counts.',
        'The broken habit is replaying old message bodies to debug.',
        'Replace that habit with a redacted fixture or a structured error id.',
      ],
      solution: `Cut the message body from two years to the window you can actually justify, such as thirty days after the ticket closes, or the dispute period if that is a real obligation. When the window ends, delete the body. You can keep the ticket id, the account id, the opened and closed times, and a coarse result code for as long as you need counts and abuse reports. Those are not the customer story.

The habit that breaks is pulling a months-old message and replaying it in a dev tool to chase a bug, or reading the body in an admin page "to see what they meant." That path will 404, and it should. Debug from a structured error code, a request id, and a fixture someone redacted on purpose. Do not extend retention because a debugger is used to the admin page. If legal retention is longer than the product needs, record that obligation as the reason, with a date, instead of defaulting to forever.`,
      rubric: [
        'The body retention is shortened to a named window, and a smaller record is allowed to outlive the body.',
        'The debug habit of replaying stored customer text is named and replaced with a redacted or structured alternative.',
      ],
      myth: [
        'We should keep the data until we are sure nobody will ever want it.',
        'That is forever. Set the clock from a real obligation or a real product window, and debug without the raw text.',
      ],
      context:
        'Backups inherit retention. A thirty-day delete in the database is a lie if the backup keeps the body for two years and is easy to restore.',
      tradeoff: 'Short retention reduces exposure and makes some late complaints unreadable. Long retention helps those complaints and keeps a copy of every story in the backup set.',
      mistake: 'Deleting the row in the app and leaving the same body in the debug log for two years.',
      followUp: 'How do you make backups forget the body on the same clock as the database?',
      extension: 'What breaks for a customer who asks, after the window, what they wrote?',
      alternative: 'Encrypting the body with a key you delete at thirty days makes the leftover backups unreadable. You have to actually delete the key, including copies in the secret-store history.',
    },
  },
  containment: {
    morning: {
      title: 'Stop access before you finish the story',
      why: 'A clear narrative feels like progress. While you write it, a stolen token still works. The first steps are the ones that make the token stop working.',
      explain: `Order the response by what stops the bleeding, not by what explains it. First, cut ongoing access: revoke the session or the key, disable the grant, or isolate the workload that is still minting access. Second, keep the evidence you already have. Do not rebuild the host or rotate logs away as your first move. Third, tell the people who must act. Fourth, write the timeline.

You will be missing facts at step one. That is normal. You do not need the full path to revoke a credential you know is in the wild. Waiting for a complete story is how a leaked token stays valid through the afternoon.`,
      question:
        'A token is being used from a new network and you do not yet know how it leaked. Order the steps that stop ongoing access before the narrative is finished. Include what you will not do first.',
      hints: [
        'Revoke or isolate is the first move. A complete timeline is not.',
        'Preserve logs you already have, but do not let preservation delay the revoke.',
      ],
      outline: [
        'Revoke the credential or isolate the workload that is still accepting it.',
        'Preserve the logs and records you already have.',
        'Notify the people who have to act.',
        'Write the narrative after access has been stopped.',
      ],
      solution: `Stop access first. Revoke the token, the refresh grant, or the key that is still being accepted, or isolate the service if you cannot name the credential yet. Do that before you agree on a timeline, a slide, or a root cause. You already know enough: a credential is in use from somewhere it should not be, and waiting keeps that use working.

Next, preserve the logs, audit events, and images you already collected, so the revoke itself does not destroy the only copy. Then notify whoever must rotate a downstream secret or talk to a customer. Only then write the narrative: how it leaked, what was touched, what you still do not know. What you will not do first is spend the hour on a complete story, rebuild the host before you copy its logs, or leave the token valid because you are not sure which employee to blame. Blame is not containment. A dead credential is.`,
      rubric: [
        'Revoke or isolate comes before the narrative, and the answer says why waiting keeps the token useful.',
        'Evidence preservation is included without being allowed to delay the revoke.',
      ],
      myth: [
        'We should understand the incident fully before we revoke anything, so we do not disrupt users.',
        'A live stolen credential is the disruption. Revoke first. Explain with the logs you kept.',
      ],
      context:
        'Incident response already says stop harm, then communicate, then explain. A leaked token is harm that a revoke can stop before the root cause exists.',
      tradeoff: 'Revoking a shared key immediately stops the thief and stops every honest client until you ship a new value. Waiting preserves those clients and preserves the thief.',
      mistake: 'Opening a document to write the timeline and leaving the token valid until the document is reviewed.',
      followUp: 'What do you revoke if the only fact you have is a user id and a strange source address?',
      extension: 'Which step changes if the credential is an instance role the fleet is still using on purpose?',
      alternative: 'Forcing a global logout stops every session, including the stolen one, and is justified when you cannot identify the grant. It is a wider revoke, not a substitute for one.',
    },
    evening: {
      title: 'Revoke, rotate, or isolate',
      why: 'The right move depends on whether one principal holds the secret, many clients share it, or the platform keeps minting it. The wrong verb leaves a path open.',
      explain: `Revoke when the credential is a session or a grant you can name and kill without replacing anyone else secret. The authorization server drops that refresh family, and the API refuses the access token.

Rotate when the secret is shared. One API key in a repo is on every client that has the file. You cannot revoke "the copy." You issue a new value, move honest clients over, and disable the old value.

Isolate when the leaked string is a short-lived token from a role the platform will keep renewing. Killing one string does not stop the next mint. Remove the role from that workload, cut its route, or replace the instance, and then rotate anything long-lived that the token could already have read.`,
      question:
        'Choose revoke, rotate, or isolate for each leak: a user refresh token in a paste, a shared API key in a public repo, and a short-lived instance credential in a log while the role is still attached. Say why.',
      hints: [
        'A per-user grant can be killed. A shared key has to be replaced.',
        'A token the platform can mint again is not contained by deleting one string.',
      ],
      outline: [
        'Revoke the user refresh token and its grant.',
        'Rotate the shared API key and disable the old value after clients move.',
        'Isolate the instance or detach the role so it cannot mint another credential.',
        'Then rotate any long-lived secret that short-lived credential could have read.',
      ],
      solution: `Revoke the pasted refresh token. It is one owner grant. The authorization server can drop that family, and other users keep their own tokens. Tell the owner to sign in again. Do not rotate a global secret for a single-user paste. That spreads an outage without binding the thing that leaked.

Rotate the shared API key. Every client has the same string, so revocation of one session does not exist. Publish a new key to the honest clients, accept both for a short window if you must, then disable the old key. Isolate the instance credential. The string in the log will expire, and the attached role will mint a fresh one, so deleting the log line does nothing. Detach the role, stop the instance, or cut the path that exposes credentials, and rotate the database passwords or storage keys that role could read. Match the verb to who else depends on the secret and to whether the platform will issue another one.`,
      rubric: [
        'The user token is revoked, the shared key is rotated, and the instance role is isolated because it can mint again.',
        'Each choice says who else would break, or why killing one string is not enough.',
      ],
      myth: [
        'Every leaked secret is handled by rotating it.',
        'Rotation is for a shared value. A user grant should be revoked. A role that mints tokens has to be isolated or it will mint the next one.',
      ],
      context:
        'Containment picks the verb. The narrative later explains how the paste, the repo, or the log happened. The verb does not wait for that paragraph.',
      tradeoff: 'A dual-key window during rotation keeps honest clients up and keeps the leaked key valid until you finish. A hard cut stops the leak now and breaks callers that have not shipped the new value.',
      mistake: 'Rotating a user password and leaving the refresh token grant valid, so the pasted token still mints access.',
      followUp: 'How do you know the old shared key is no longer accepted anywhere?',
      extension: 'What do you isolate if the instance role is used by a whole fleet and only one node leaked?',
      alternative: 'Replacing the workload with a new identity and a new role is a stronger isolate than detaching a policy. It costs a deploy. It is appropriate when you do not trust the node anymore.',
    },
  },
  'api-security-review': {
    morning: {
      title: 'Auth, the object, and injection',
      why: 'An endpoint review that says "looks fine" did not look. Three checks cover most of the holes that ship in ordinary CRUD: who is calling, which object, and whether data stays data.',
      explain: `Read one route as three questions. Authentication: is there a real principal, or can a missing session still reach the handler? Authorization: does that principal have this action on this object, or does any logged-in caller get any id in the path? Injection: is any field concatenated into a query, a shell, a template, or a URL the server will fetch, or is it bound as a value?

Do not award a pass because the list page hides other people rows. The route is the review. A middleware session check answers only the first question. The object check is usually missing on the handler that loads by id. The injection check is the call site, not the validator that only checks the type.`,
      question:
        'Review GET /invoices/{id}/export for authentication, object access, and injection. The handler requires a session, loads the invoice by id, and concatenates a caller-supplied format string into a query. What fails?',
      hints: [
        'A session proves some user. It does not prove this invoice.',
        'A format string joined into a query is data being parsed as code, even if a session exists.',
      ],
      outline: [
        'Authentication is present because a session is required.',
        'Object access is missing because the id is not tied to the caller.',
        'Any logged-in user can export another tenant invoice.',
        'The format string is concatenated, so the query call is an injection site.',
      ],
      solution: `Authentication passes in the narrow sense: there is a session, and an anonymous caller should get 401. That is not the review. Object access fails. The handler loads whatever id is in the path and exports it. A logged-in user from tenant A can pass tenant B invoice id and receive the file. The list page never linking to that id is not a control. The handler never compared the invoice tenant to the session tenant, or checked an export permission on that row.

Injection fails on format. The value is joined into the query text, so the database parses caller data as part of the statement. The safe call binds format as a value, or, better, maps an allow-listed format in your code onto a fixed query you wrote. One endpoint, three results: auth is present, object access is absent, injection is present at the format call. Do not average them into "mostly safe."`,
      rubric: [
        'The session check is separated from the missing tenant or owner check on the invoice id.',
        'The concatenated format string is called out as injection, with a bound value or an allow list as the fix.',
      ],
      myth: [
        'Requiring a session means the route is authorized.',
        'A session names the caller. Authorization is the decision that this caller may export this invoice. The handler never made it.',
      ],
      context:
        'This is the write-path lesson applied to an export, plus the injection call site on the same handler. Exports are easy to forget because they feel like reads.',
      tradeoff: 'Returning 404 for a foreign invoice hides existence and makes client errors vaguer. Returning 403 admits the id exists. Either is acceptable if you choose it on purpose and test it.',
      mistake: 'Fixing the format concatenation and shipping the export without the tenant check.',
      followUp: 'What permission, other than being in the tenant, would an export-only role need on this route?',
      extension: 'Where would a caller-supplied callback URL on this same route add a third class of bug?',
      alternative: 'Generating the export in a job that re-checks the tenant at start and at download is stronger than checking only at enqueue. A check only at enqueue goes stale if you grant access and then revoke it before the job runs.',
    },
    evening: {
      title: 'The test that fails while the hole is open',
      why: 'A review comment can be talked out of the ticket. A test that fails on the current handler keeps the hole visible until the check exists.',
      explain: `Write the test from the missing check, not from the happy path. Two principals, one object owned by the second, one call by the first. The assertion is that the response is a refusal and that the body does not contain the second principal data. On today code, that test fails, because the handler returns 200 and the file. That failure is the proof.

Do not write a test that only checks that a logged-in user can export their own invoice. That test stays green while the hole is open. The failing test is the one the missing check would turn red, and the fix is what turns it green for the right reason.`,
      question:
        'Write the failing test that proves the export route lets one tenant read another tenant invoice. Say what it sets up, what it calls, and which results fail the build. Do not include an injection payload.',
      hints: [
        'The test needs two tenants. One happy-path user will stay green.',
        'Assert both the status and that the other tenant data is absent from the body.',
      ],
      outline: [
        'Create tenant A and tenant B, and an invoice owned by B.',
        'Call the export as A with B invoice id.',
        'Fail if the status is success or the body contains B data.',
        'The current handler fails this test. The tenant check makes it pass.',
      ],
      solution: `Set up two tenants, A and B. Create an invoice that belongs to B and note its id. Authenticate as A, not as an admin. Call GET /invoices/{id}/export with B id and A credential. The test fails the build if the status is 200, and if the body contains B total, B customer, or any fixture string you put only on B invoice. Expect 404 or 403, whichever you chose, and an empty or error body.

Today handler fails that test, which is the point. It has a session for A and returns B file. Add a second assertion only after the first is red: A can still export A own invoice, so the fix did not simply lock the route. Do not mark the suite green by catching the error in the test. The proof is the failure on current code. A comment that says "we should check the tenant" is not a test and will not fail the build on Friday.`,
      rubric: [
        'The test uses two tenants and has A request B invoice, expecting a refusal and no B data.',
        'The current 200 response is what fails the build, and the own-invoice path is not accepted as proof.',
      ],
      myth: [
        'A test that the owner can export their invoice covers access control.',
        'That test never crosses tenants. The hole is A succeeding on B id. Only that call proves the check.',
      ],
      context:
        'Object-access bugs survive code review because every demo uses the owner. The second principal is what the demo forgot.',
      tradeoff: 'A fixture with two tenants takes more setup than a single-user test and catches the bug the single-user test is structurally unable to see.',
      mistake: 'Asserting only that the status is not 500, so a 200 of the other tenant data still passes.',
      followUp: 'What do you add to the test if an admin is supposed to export across tenants and a normal user is not?',
      extension: 'How would you write the non-payload version of a test that the format argument is bound rather than concatenated?',
      alternative: 'A property test that picks random ids from other tenants is the same check with more cases. One explicit pair is enough to fail the build and is easier to read.',
    },
  },
  'login-flow': {
    morning: {
      title: 'Hash, lockout, and reset',
      why: 'Login is a small protocol with three places to get wrong: how the password is stored, what happens after repeated failures, and how a reset proves the mailbox.',
      explain: `Store a slow, salted hash. You cannot read the password back, and you do not need to. On login, load the account by the identifier, hash the submitted password with the same parameters, and compare. Create a session only after the compare matches. The session is a new credential. It is not the password.

Count failures. After a threshold, delay or lock that account and alert, and do not let the attempts skip the limiter that sits in front of the hash. A reset is a different proof: a single-use token, stored only as a hash, with a short expiry, sent to the mailbox or device you already have on the account. Using it sets a new password and revokes existing sessions, including the reset token. A reset link that works twice, or that lives in a log, is a second password.`,
      question:
        'Walk a password login for an existing account, including how the password is stored, what lockout does after repeated failures, and how reset works. Name what you never store.',
      hints: [
        'The database holds a salted slow hash, not the password and not a reversible encryption you can decrypt with a key beside it.',
        'A reset token is single-use and stored hashed. Success revokes sessions.',
      ],
      outline: [
        'Store a slow salted hash, and compare on login.',
        'Issue a session only after a match.',
        'Lock or delay the account after repeated failures, before extra hashes.',
        'Reset uses a single-use hashed token, then revokes sessions.',
      ],
      solution: `The account row holds a unique salt and a slow hash, plus the algorithm parameters. It does not hold the password. Login takes the email and the password over TLS, finds the account, and checks the limiter before hashing. If the hash matches, you create a server-side session or a signed cookie and return it. If it does not, you increment the failure count and return a refusal.

After a small number of failures, lock that account for a window or add delay, and notify the owner. The lock is per account, not a single switch that disables the whole product, and the counter sits before the hash so stuffing cannot spend the hasher. Reset starts with a request for that account, stores only a hash of a random token, and emails the raw token once. The link expires soon and works once. When it is used, set a new password hash, delete the reset token, and revoke existing sessions so a stolen session dies when the owner takes the account back. You never store the raw password, the raw reset token, or a copy of the session in the mail log.`,
      rubric: [
        'Storage is a salted slow hash, login compares it, and the password itself is not stored.',
        'Lockout is per account and in front of the hash, and reset is single-use, hashed, expiring, and revokes sessions.',
      ],
      myth: [
        'Encrypting passwords with a key you store nearby is as good as hashing them.',
        'Encryption is reversible by anyone who gets the key. A password store should be a slow hash you cannot turn back into the password.',
      ],
      context:
        'Reset mail and login share the session table. Forgetting to revoke sessions is how a stolen cookie survives the password change that was supposed to end it.',
      tradeoff: 'A hard lockout stops stuffing on that account and lets someone else lock the owner out by guessing on purpose. Delay plus an alert is softer and leaves a slow path open.',
      mistake: 'Writing the reset token into the application log, which turns the log into a mailbox.',
      followUp: 'What happens to other sessions when the owner changes the password from the settings page rather than from a reset link?',
      extension: 'Where does the lockout counter live so two app replicas share it?',
      alternative: 'A second factor after the password reduces the value of a stolen password and does not replace the hash or the reset design. You still store the password as a hash, and you still revoke sessions.',
    },
    evening: {
      title: 'The response that names an account',
      why: 'Two different error strings are a directory. Callers use them to learn which emails exist before they spend any effort on passwords.',
      explain: `The leak is any step whose observable result differs between "no such account" and "account exists, secret wrong." A login message that says the email is unknown, versus a message that says the password is wrong, is that step. A reset form that says "no account" versus "we sent mail" is the same step. A faster response when you skip the hash because the row is missing is the same step, even if the JSON matches.

You may choose to allow it in one place. A registration form that says "an account with this email already exists" tells the person they already signed up. That is a product decision, and it is a directory. If you allow it, allow it there on purpose. Do not also allow it on login and on reset by using different copy or different timing.`,
      question:
        'Login returns "unknown email" or "wrong password." Reset returns "no account" or "mail sent." Registration says "email taken." Find each step that tells a caller whether an account exists, and say which one you would allow, if any.',
      hints: [
        'Different sentences are the obvious leak. Different response times are the same leak.',
        'Registration is the step teams often allow on purpose. Login and reset do not have to match it.',
      ],
      outline: [
        'Login copy distinguishes a missing email from a bad password.',
        'Reset copy distinguishes a missing account from a sent message.',
        'Registration copy says the email is taken, which is an existence oracle if you keep it.',
        'Allow it only on registration if the product requires it, and make login and reset uniform.',
      ],
      solution: `Login leaks at the error choice. "Unknown email" means the row is absent. "Wrong password" means the row is present. A caller can sort a list of emails without a single correct password. Reset leaks the same way: "no account" versus "mail sent" is a directory with extra courtesy. Registration leaks on purpose when it says the email is taken. That one you may allow if the product cannot function without telling a person they already have an account. Record it as a choice, not as an accident.

If you allow it, allow it only on registration. Login and reset should return one status and one sentence either way, and they should do the slow hash work even when the account is missing, so the timing does not replace the sentence. Send the reset mail only when the account exists, and keep the response the same when it does not. The step an attacker learns from is whichever response you left different. Close login and reset. Keep the registration message only if you are willing to publish that directory.`,
      rubric: [
        'Login and reset are both identified as existence leaks because their responses differ, and timing is included.',
        'Registration is the only step allowed to differ, and only as an explicit product choice.',
      ],
      myth: [
        'Hiding the message is pointless because registration already says the email is taken.',
        'Registration is one directory, and only if you chose it. Login and reset are two more, used far more often, and you can close those without closing signup.',
      ],
      context:
        'Support tools that say "user not found" to any employee are the same oracle with a larger audience. The audience is part of the decision.',
      tradeoff: 'A uniform login error slows honest people who mistyped their email. A precise error is kinder and publishes the account list to anyone who asks.',
      mistake: 'Unifying the JSON message and returning in a millisecond when the user is missing, because you skipped the hash.',
      followUp: 'What do you send, and what do you return, when a reset is requested for an email you have never seen?',
      extension: 'How does a public "email taken" check on registration interact with the minimization of who can read the user table?',
      alternative: 'Requiring an invite to register removes the public "email taken" check and still requires login and reset to stay uniform. It is the right trade when the product is not open signup.',
    },
  },
};
