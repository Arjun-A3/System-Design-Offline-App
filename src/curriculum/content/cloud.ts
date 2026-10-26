import type { LessonPair } from './publish';

export const cloudLessons: Record<string, LessonPair> = {
  'containers-vms': {
    morning: {
      title: 'Kernel, image, and process',
      why: 'People say "the container" and mean three different things. A failure in the kernel, the image, or the process has a different fix, and only one of them is a restart.',
      explain: `The kernel is the host operating system that schedules processes and talks to devices. A container shares that kernel with the host and with every other container on the machine. A virtual machine brings a guest kernel, so a fault in the guest stays in the guest.

The image is the packed filesystem and the starting command: base layers plus what you copied in. It is not running. The process is what runs when a runtime unpacks the image and starts the program, usually with its own process id space, its own mount view, and maybe its own network view. A bug in the program is the process. A missing library is the image. A kernel panic is the host, and every container on that host shares it.`,
      question:
        'Separate the kernel, the image, and the process for a container that serves your API. Say which one a code deploy replaces, and which one a second container on the same host still shares.',
      hints: [
        'A deploy ships a new image and starts a new process. It does not replace the host kernel.',
        'Two containers on one machine share the kernel even when their images differ.',
      ],
      outline: [
        'The kernel is the host kernel, shared by every container on the machine.',
        'The image is the filesystem and the start command, and it is not yet a process.',
        'The process is the running program with its namespaces.',
        'A deploy replaces the image and the process. The kernel stays.',
      ],
      solution: `The kernel is the host kernel. Your API container does not boot its own. A virtual machine would. The image is the digest you built: the base layers, the application files, and the command that starts the server. It sits in a registry until something runs it. The process is that server, after the runtime creates namespaces and starts the command. Logs, a crash, and a memory leak belong to the process. A missing dependency belongs to the image.

A code deploy builds a new image and starts a new process from it. It does not replace the kernel. A second container on the same host, even one from a different image, still shares that kernel. If the host kernel panics, both processes go away together. Restarting your API process fixes the process. It does not patch the kernel, and it does not change an image you have not rebuilt. Name which of the three you are looking at before you restart anything.`,
      rubric: [
        'Kernel, image, and process are three different objects, and the kernel is the host kernel.',
        'A deploy replaces image and process, and a neighbor container still shares the kernel.',
      ],
      myth: [
        'A container is a small machine with its own kernel.',
        'A container is a process plus an image on someone else kernel. A virtual machine is the one with a separate kernel.',
      ],
      context:
        'Incident notes that say "the box" hide this split. The box might be the node, the image digest, or the one process that ran out of memory.',
      tradeoff: 'Sharing a kernel makes containers small and fast to start, and it means a kernel bug is a fleet bug. A virtual machine pays boot time and memory for a kernel boundary.',
      mistake: 'Rebuilding the image because the host kernel panicked, and calling that a process fix.',
      followUp: 'What do two containers share if they use the host network namespace instead of their own?',
      extension: 'Which of the three changes when you only roll the deployment back to an older digest?',
      alternative: 'Running the API in a virtual machine gives it a guest kernel and a heavier start. You still have an image or a disk, and you still have a process inside the guest.',
    },
    evening: {
      title: 'What a container does not wall off',
      why: 'A container feels like a boundary because the process cannot see the host filesystem by default. That is not the same as a separate machine.',
      explain: `A container gives you a process view: different process ids, a different root filesystem, cgroup limits if you set them, and often a different network namespace. Those are real. They are not a second kernel, and they are not a hardware line. A bug in the shared kernel is reachable from every container on the host. A process that runs as root inside the container is a more powerful process on that kernel, not a harmless pretend root.

You also do not get a separate identity in the cloud just by containerizing. If the node role can read every bucket, every container on the node can use that role unless you give them separate credentials on purpose. Isolation you do not get from a container alone is kernel isolation and a strong boundary against the host.`,
      question:
        'Say which isolation you do not get from a container alone. Include the kernel and the node cloud role. Say what a virtual machine adds that the container did not.',
      hints: [
        'Namespaces change what the process can see. They do not install a second kernel.',
        'The instance role is attached to the node, and containers can inherit that path.',
      ],
      outline: [
        'A container does not provide a separate kernel.',
        'A kernel bug on the host is a bug for every container there.',
        'A container does not provide a separate cloud identity from the node.',
        'A virtual machine adds a guest kernel the host kernel does not share.',
      ],
      solution: `You do not get a separate kernel, and you do not get a separate trust boundary against the host. The container process makes system calls on the host kernel. A vulnerability in that kernel is not contained by the image. You also do not get a separate cloud identity. The metadata service and the instance role belong to the node. A container that can reach that service acts with the node role, which may be far broader than the one process needs.

A virtual machine adds a guest kernel. Breaking out of the guest means crossing a hypervisor, which is a different and smaller interface than the host system-call surface. It still does not fix a shared instance role if you attach the same role to the VM. Pair the runtime with a non-root user, dropped capabilities, and a workload identity that is not the node role. The container alone did not do those. Treat it as packaging and a process view, and add the boundary you actually need.`,
      rubric: [
        'Kernel isolation is named as missing, with the host kernel shared across containers.',
        'The node role or metadata path is named as identity you do not get for free, and a VM is limited to adding a guest kernel.',
      ],
      myth: [
        'Putting the service in a container means a compromise stays inside the container.',
        'The container is a process on the host kernel, often with the node credentials. That is not a security boundary by itself.',
      ],
      context:
        'This is the same mistake as calling a process "sandboxed" because it has a Dockerfile. The policy you did not write is the boundary you do not have.',
      tradeoff: 'Adding a VM under every container buys a kernel boundary and costs memory, slower starts, and another image to patch. Sharing the kernel is cheaper and couples every tenant to one kernel version.',
      mistake: 'Running the process as root in the container and assuming the word container made that root harmless.',
      followUp: 'What do you add so a container cannot use the node instance role?',
      extension: 'Which cgroup control limits damage without pretending to be a second kernel?',
      alternative: 'A separate host per untrusted workload gives you a kernel boundary without a hypervisor in your own stack. You pay a machine where a namespace would have done for a trusted process.',
    },
  },
  'image-discipline': {
    morning: {
      title: 'An image you can build again',
      why: 'Production should be a digest you can produce from the repo. If the image only exists in the registry, you cannot patch it, audit it, or prove what is running.',
      explain: `A rebuildable image has three properties. The base is pinned, by digest rather than by a moving tag, so next month build starts from the same filesystem. The application dependencies come from a lockfile, installed in CI, not resolved again on a laptop. Secrets are not copied into a layer. They arrive at runtime from a store the workload identity can read.

Two builds from the same commit should produce the same tree. A Dockerfile that runs apt-get without pins, copies a local .env, or depends on a file that was never committed, is a script that happened to work once. It is not an image definition.`,
      question:
        'Define a rebuildable image for the API. Include the base, the lockfile, and secrets. Say what must be true of two builds from the same commit.',
      hints: [
        'A tag such as latest moves. A digest does not.',
        'A secret present at build time tends to land in a layer. Runtime injection does not.',
      ],
      outline: [
        'The base image is pinned by digest.',
        'Dependencies are installed from the lockfile in CI.',
        'No secret is copied into a layer or a build argument that sticks.',
        'Two builds from the same commit produce the same contents.',
      ],
      solution: `Pin the base image by digest and record that digest in the repo, so a moving tag cannot change the build under you. Install application dependencies from the lockfile inside CI, and copy the lockfile in the build context. Do not run a resolver that floats, and do not depend on a directory that exists only on one engineer machine.

Do not bake secrets. No password in an ENV instruction, no .env in the build context, no build argument that remains in the history. The process reads the secret at start from the secret store. Two builds from the same commit then produce the same files and the same dependency hashes. The registry digest is what you deploy. If you cannot build that digest again from the commit, you do not know what you will be running after the next patch. The definition of rebuildable is base, lockfile, and no baked secret, and the test is a second build.`,
      rubric: [
        'Base digest, lockfile install, and runtime secrets are all required for the image to be rebuildable.',
        'Two builds from the same commit are required to match, which rules out floating tags and local-only files.',
      ],
      myth: [
        'A Dockerfile in the repo means the running image can be rebuilt.',
        'The file is not enough if the base tag moved, the lockfile was ignored, or a secret and a local file were part of the original build.',
      ],
      context:
        'Supply chain trace ends at this image. A lockfile you do not install from, and a base you do not pin, break the trace at the last hop.',
      tradeoff: 'Digest pins make rebuilds honest and make you touch the repo for every base patch. A moving tag patches you without a review and also changes a build you were not ready to ship.',
      mistake: 'Copying the production .env into the build context so the image "just works" on a fresh cluster.',
      followUp: 'How do you check that a secret did not end up in an image layer after the build?',
      extension: 'What does CI compare if you want the second build to prove it matches the first?',
      alternative: 'A signed base that your platform updates on a schedule can move, as long as the resulting digest is what production runs and the update is a reviewed change. The pin then lives on the digest you deployed, not on a tag.',
    },
    evening: {
      title: 'The container the repo cannot produce',
      why: 'The running container is sometimes a snowflake: patched by hand, built from a dirty tree, or started from a tag that no longer exists. You cannot roll forward from the repo.',
      explain: `A production container cannot be rebuilt when the bytes did not come from a commit. Someone exec'd into it and installed a package. Someone built it on a laptop from a directory that had uncommitted files. The Dockerfile says a base tag, and that tag now points somewhere else, or the builder needed a secret only one person had.

The registry still has a digest, so the process stays up. You cannot produce the next digest from CI. The next security patch becomes "do the hand steps again," and those steps are how the secret and the extra package got there. The failure is not that the container is running. The failure is that the repo is no longer the source.`,
      question:
        'Production is a container somebody patched with a package manager inside the running process, built originally from a laptop. Explain why you cannot rebuild it from the repo, and what you would need before the next patch.',
      hints: [
        'A package installed in a running container is not in the Dockerfile or the lockfile.',
        'A laptop build can include files the commit does not have.',
      ],
      outline: [
        'The live filesystem has a package the repo never described.',
        'The original build context may have had uncommitted files.',
        'CI from the commit will not reproduce this digest.',
        'The next patch has to start from a clean CI build, not from another exec.',
      ],
      solution: `The running filesystem is the repo plus unpublished edits. The package installed with a package manager inside the container is not in the Dockerfile, so a CI build from the commit will not include it. Files that were on the laptop and not in git were copied into the original layers, and a clean checkout does not have them. If the base was a moving tag, you may not even get the same base the laptop pulled that day. The digest in production is an artifact you can pull and you cannot regenerate.

Do not patch it again by hand. That makes the drift larger. Reconstruct the intended change as a commit: pin the base, add the package in the Dockerfile, commit the files that mattered, and build in CI. Deploy the new digest beside the old one and retire the snowflake. Until that deploy, you do not have a patch path. You have a machine someone remembers. Treat the current digest as untrusted for rebuild purposes even though it is still serving.`,
      rubric: [
        'The hand-installed package and the non-repo build context are why CI cannot reproduce the digest.',
        'The next patch is a clean CI image from a commit, not another live package install.',
      ],
      myth: [
        'If the container is healthy, we can always rebuild it later from the Dockerfile.',
        'Healthy only means the process is up. Rebuild means the repo produces the digest. A hand patch broke that.',
      ],
      context:
        'Drift in a live container is the image version of console drift. The thing running is not the thing reviewed.',
      tradeoff: 'Rebuilding clean takes a deploy and may miss a package someone installed for a reason nobody wrote down. Leaving the snowflake avoids that surprise and makes the next incident unreproducible.',
      mistake: 'Snapshotting the live container and calling the snapshot a build. You still cannot see the steps, and you baked whatever was on disk, including secrets.',
      followUp: 'How would you find files in the image that are not produced by the Dockerfile?',
      extension: 'What policy would stop a shell on a production container from installing packages?',
      alternative: 'An immutable root filesystem stops live installs and forces the change through CI. It also stops a debugger from dropping a tool in during an incident, which is the point and the cost.',
    },
  },
  'kubernetes-objects': {
    morning: {
      title: 'Process, address, and replica count',
      why: 'Kubernetes names are easy to memorize and easy to mix up. Map each one to the job it does, or you will debug a Service when the process never started.',
      explain: `A Pod is the process, or a few processes that must share a network namespace and a lifecycle. When the pod dies, that process is gone. The pod IP was never a stable address.

A Service is the stable address. It has a name and a virtual IP, and it selects pods by labels. Callers use the name. They do not track pod IPs.

A Deployment is the desired replica count and the pod template. It keeps N pods running that match the template, replacing them when the template changes. The Deployment does not accept traffic. The Service does not decide how many copies exist. The Pod does not outlive the process.`,
      question:
        'Map a process, a stable address, and a desired replica count to Kubernetes objects for the invoice API. Say which object a client should call, and which object you change to run three copies.',
      hints: [
        'Pod IPs change. A Service name is the address that does not.',
        'The replica count lives on the Deployment, not on the Service.',
      ],
      outline: [
        'The Pod is the process that serves the API.',
        'The Service is the stable name and address in front of the pods.',
        'The Deployment holds the desired replica count and the pod template.',
        'Clients call the Service. You set replicas on the Deployment.',
      ],
      solution: `The process is a Pod running the invoice API container. It has a pod IP that disappears with it. The stable address is a Service named something like invoice, selecting pods with the app label. Clients and other services call that name. They never store a pod IP.

The desired replica count is on the Deployment, set to three, with a template that produces pods the Service selects. You change the Deployment replicas to run three copies. You do not set replicas on the Service, and you do not create three Services. When you roll the image, you change the template on the Deployment. It replaces pods. The Service name stays. If the selector and the labels disagree, the Deployment can be running three pods and the Service can have zero endpoints. That is a mapping bug, not a mystery outage. Check which object owns the symptom.`,
      rubric: [
        'Pod, Service, and Deployment are mapped to process, stable address, and replica count respectively.',
        'Clients call the Service, and the replica count is changed on the Deployment.',
      ],
      myth: [
        'The Service runs your code and scales it.',
        'The Service is an address and a selector. The Deployment runs N pods. The pods run the code.',
      ],
      context:
        'Load balancing from the web phase sits in the Service or the endpoint proxy. The algorithm still does not create replicas. The Deployment does.',
      tradeoff: 'A Service in front of one pod gives you a stable name and an extra hop. Calling the pod IP skips the hop and breaks every caller when the pod is replaced.',
      mistake: 'Pointing a client at a pod IP you saw in a debug session and treating it as the address of the service.',
      followUp: 'What do you look at when the Deployment says three pods ready and the client still gets connection refused?',
      extension: 'Which object do you change to roll back the image without changing the Service name?',
      alternative: 'A StatefulSet gives stable per-pod names when the process itself must be shard 0 or shard 1. A stateless API does not need that. A Deployment and a Service are the smaller map.',
    },
    evening: {
      title: 'What one request is not promised',
      why: 'A Service name looks like a guarantee. It is a way to pick an endpoint. One request can still fail, land on a dying pod, or hit a different replica than the last one.',
      explain: `A Service keeps a list of endpoints, usually the pods whose readiness check is passing, and sends a new connection to one of them. It does not retry the request. It does not remember that this caller belongs on the replica that holds a warm cache, unless you add affinity, and affinity is a hint. It does not wait for a slow pod to get healthy. It does not promise that the pod it chose is still ready by the time the bytes arrive.

Readiness removes pods from the list after the check fails, which is eventually, not instantly. A single request still needs a timeout, and a write still needs to be safe if the client tries again. The Service did not take that job.`,
      question:
        'Explain what a Service does not guarantee about a single request to the invoice API. Include retries, which replica you land on, and a pod that just failed its readiness check.',
      hints: [
        'The Service selects an endpoint. It is not an application retry policy.',
        'Readiness updates the endpoint list on a timer. There is a gap.',
      ],
      outline: [
        'The Service does not retry a failed request.',
        'It does not pin a caller to one replica unless you add a hint, and the hint is not correctness.',
        'A pod can receive a request while it is leaving the endpoint list.',
        'The client still needs a timeout and a safe retry.',
      ],
      solution: `A Service does not guarantee that one request succeeds. It forwards the connection to a selected pod. If that pod resets, or the process crashes mid-handler, the Service does not try another pod for you. The client sees the failure. It does not guarantee a particular replica. The next request can land anywhere in the ready set, so an in-memory session or a local cache is not a contract. Session affinity, if you turn it on, is still a best effort and dies with the pod.

It does not guarantee the pod is ready at the instant of the call. A pod that failed its check can remain an endpoint until the probe and the endpoint update catch up, and a pod that started failing after the last probe can take a request anyway. Your handler still needs a deadline. A POST still needs an idempotency key if the client or a proxy will retry. The Service gave you a stable name and a pool. It did not give you exactly-once delivery or a single warm replica.`,
      rubric: [
        'Retries, replica pinning, and instant readiness removal are all named as things the Service does not guarantee.',
        'The client timeout and a safe retry remain the application responsibility.',
      ],
      myth: [
        'If the Service has ready endpoints, a request will succeed on one of them.',
        'Ready means the pod was selected. The request can still fail, and a pod can be selected in the gap before it is removed.',
      ],
      context:
        'This is the load balancer lesson one level down. A pool of healthy targets is not a promise about the next call, in Kubernetes or in front of a VM.',
      tradeoff: 'Short readiness intervals shrink the gap and add probe traffic. Long intervals quiet the probes and send more requests to pods that have already failed.',
      mistake: 'Turning on session affinity and then storing the only copy of a checkout in that pod memory.',
      followUp: 'Who retries if the pod resets the connection before any response bytes?',
      extension: 'What does the Service guarantee about the name, as opposed to a single request?',
      alternative: 'A service mesh retry policy can retry idempotent calls at the sidecar. It is an extra feature you configured, not a property of the Service object, and it still must not blind-retry a payment.',
    },
  },
  'resource-limits': {
    morning: {
      title: 'A limit from the working set',
      why: 'A memory number copied from a tutorial is not a limit. It is a guess. The process will be killed or starved at that guess whether or not it matches the real working set.',
      explain: `The working set is the memory the process actually uses under the traffic you care about, not the binary size and not the peak on an empty cache. Measure it: resident memory over a representative period, including the spike you already see at deploy or at the top of the hour.

Set the memory limit above that measured peak, with headroom for the next spike you are willing to survive, not at the average and not at an unread default. The request is what the scheduler uses to place the pod. The limit is what the kernel enforces. They are different numbers. A request far below the working set packs the node until the limit kills the process. A limit at the average kills it during the spike you already measured.`,
      question:
        'You measured the invoice API at about 400 MB resident, with a spike to 700 MB when a report runs. Set a memory limit from that working set. Say what is wrong with a 256 MB limit and with setting the limit at the average.',
      hints: [
        'The limit has to sit above the spike you intend the process to survive.',
        'The request is for scheduling. The limit is the enforcement line.',
      ],
      outline: [
        'The working set peak to honor is about 700 MB, not the 400 MB average.',
        'Set the limit above that peak with explicit headroom.',
        'A 256 MB limit is below the steady state and will kill a healthy process.',
        'A limit at the average kills the report spike you already measured.',
      ],
      solution: `Use the 700 MB spike as the working set you must fit, not the 400 MB calm period. Set the memory limit above it, for example 1 GB, so a report can run and a modest further spike still fits. Write down that the headroom is for that report, not a round number. Set the request near the steady 400 MB, or near the spike if the report is common, so the scheduler does not place the pod on a node that only has room for the average.

A 256 MB limit is below the measured steady state. The process will be killed while idle of any report, which means the limit is not related to the working set at all. A limit at 400 MB matches the average and kills the spike you measured. That is not headroom. If you do not want the report in this process, take the report out. Do not pick a limit that forbids a behavior you still run.`,
      rubric: [
        'The limit is set from the measured spike plus headroom, not from a default or the average alone.',
        'Both 256 MB and an average-sized limit are rejected because they sit below memory the process already uses.',
      ],
      myth: [
        'A memory limit should be tight so the scheduler can pack nodes.',
        'Packing is the request. The limit has to be above the working set or the kernel will kill a process that is behaving as measured.',
      ],
      context:
        'Requests and limits are how a shared node stays shared. A pod without a memory limit can push the node into eviction and take neighbors with it.',
      tradeoff: 'Headroom above the spike wastes schedulable memory and survives the report. A tight limit packs the node and turns the report into a kill.',
      mistake: 'Copying 128Mi from a sample manifest and never looking at resident memory in production.',
      followUp: 'How do you notice the working set has grown past the headroom you chose?',
      extension: 'What do you set the CPU request from, if not from the memory measurement?',
      alternative: 'Running the report in a separate job with its own limit keeps the API limit near 400 MB plus a small headroom. The API process must not still build the report.',
    },
    evening: {
      title: 'The kill and the throttle',
      why: 'Exceeding a memory limit and exceeding a CPU limit do not look alike. One stops the process. The other slows it. The graphs are easy to mix up.',
      explain: `Memory is not compressible. When the container exceeds its memory limit, the kernel kills the process. In Kubernetes you see it as OOMKilled. The process does not get an exception it can catch and turn into a 429. It is gone, and the kubelet starts a new one if the replica set says so. A limit below the working set looks like a crash loop.

CPU is compressible. When the process exceeds its CPU limit, it is throttled: it is not killed, it is given less time. Requests get slow, timeouts fire, and the process stays up. A CPU graph that shows throttling with a calm memory graph is a different incident from a restart counter climbing beside an OOM reason.`,
      question:
        'Describe what happens when the invoice process exceeds its memory limit, and what happens when it exceeds its CPU limit. Say which one kills the process and what the user sees in each case.',
      hints: [
        'Memory over the limit is a kill. CPU over the limit is a slowdown.',
        'The process cannot catch the memory kill and return a polite error.',
      ],
      outline: [
        'Over the memory limit, the kernel kills the process. The pod shows OOMKilled.',
        'The user sees failed requests until a new process is up.',
        'Over the CPU limit, the process is throttled and stays up.',
        'The user sees latency and timeouts, not a restart.',
      ],
      solution: `Over the memory limit, the cgroup kills the process. The pod event says OOMKilled, the restart count increases, and in-flight requests die. The user sees errors or timeouts for that replica until the new process is ready. There is no handler log of a caught exception, because the process did not throw. If this happens on the report spike, the limit is below the working set. Raising the limit, or moving the report, is the fix. Restarting forever is the symptom.

Over the CPU limit, the kernel throttles the process. It remains running. Latency climbs, clients hit their deadlines, and you may see no restarts at all. The user sees a slow API, not a crash loop. Raising the CPU limit or reducing the work per request addresses that. Adding memory does not. Read the reason. A kill means memory. A throttle means CPU. Treating both as "the pod is unhealthy, give it more of everything" hides which line you crossed.`,
      rubric: [
        'Memory over limit is an OOM kill and a restart, with requests failing until the new process is ready.',
        'CPU over limit is throttling and latency, and the process is not killed.',
      ],
      myth: [
        'A CPU limit kills the pod the way a memory limit does.',
        'CPU is throttled. The process stays up and gets slow. Memory is the limit that kills.',
      ],
      context:
        'Dashboards that only show restarts will page on memory and stay quiet on CPU throttle while users time out. You need both signals.',
      tradeoff: 'A high CPU limit avoids throttle and lets one pod starve its neighbors on a busy node. A low limit protects neighbors and adds latency to this service first.',
      mistake: 'Raising the memory limit because latency went up, when the process was being throttled and memory was flat.',
      followUp: 'What do you look at to confirm throttling rather than a slow dependency?',
      extension: 'What happens to the node if the pod has no memory limit and it grows without bound?',
      alternative: 'Vertical scaling of the node avoids a tight limit and moves the cost to a bigger machine. You still want a limit so one leak cannot take the whole node.',
    },
  },
  'serverless-limits': {
    morning: {
      title: 'Cold start, timeout, and concurrency',
      why: 'Serverless limits are design inputs, like a database connection cap. A handler written as if the process runs forever will be killed or queued by the platform.',
      explain: `A cold start is the time to create an execution environment and run your init before the handler. After idle, the next call pays it. A timeout is the platform maximum for one invocation. When it fires, the platform stops the process. Your code does not get to finish the file, the transaction, or the outbound call.

Concurrency is how many invocations run at once for this function or this account. Above it, calls queue or fail, depending on the platform and the setting. A reserved concurrency of ten means the eleventh call does not run beside the others. Design the work to fit inside the timeout, to tolerate a cold init on the user path or move init off it, and to do something explicit when concurrency is exhausted.`,
      question:
        'List cold start, timeout, and concurrency as design inputs for a function that resizes an uploaded image. Say what each one forces you to decide before you write the handler.',
      hints: [
        'Cold start is init time the caller may feel after the function has been idle.',
        'Timeout is a kill, not a suggestion. Concurrency is a cap on parallel invocations.',
      ],
      outline: [
        'Cold start forces a decision about what runs in init versus in the handler.',
        'Timeout forces the resize to finish inside the platform maximum.',
        'Concurrency forces a cap on parallel resizes and a plan for the call that does not get a slot.',
        'All three are inputs, not tuning you do after users complain.',
      ],
      solution: `Cold start forces you to decide what you initialize. Loading a large model or opening many connections in init makes the first request after idle slow, and the caller deadline has to include it. Keep init small for a resize, or accept the latency and set the caller timeout above it.

The platform timeout forces the resize itself to finish with margin. If the largest image you accept cannot be processed in that window, this function is the wrong place. Concurrency forces a number: how many resizes may run at once, sized from CPU and from the downstream store, not from hope. When the cap is hit, decide whether the upload queues, returns a busy response, or lands on a worker. Write those three down as inputs. A handler that assumes a warm process, unlimited time, and unlimited parallelism is designed for a machine you do not have.`,
      rubric: [
        'Cold start, timeout, and concurrency are each stated as a constraint that changes the design.',
        'The resize has to fit the timeout, and excess concurrency has an explicit outcome.',
      ],
      myth: [
        'Serverless means we do not have to think about capacity.',
        'The platform still has a timeout, a concurrency cap, and a cold start. Those are the capacity numbers. They are just not a machine you SSH to.',
      ],
      context:
        'Deadlines from the web tier still apply. A function timeout that is longer than the caller timeout means the function keeps working after the user is gone.',
      tradeoff: 'A high concurrency cap absorbs a spike and can stampede a database that expected a small pool. A low cap protects the database and returns busy during a launch.',
      mistake: 'Setting the function timeout to the platform maximum so you do not have to measure the resize.',
      followUp: 'What does the uploader see if the function cold-starts longer than the client deadline?',
      extension: 'Which of the three changes if you keep a minimum number of environments warm?',
      alternative: 'A small always-on worker avoids cold start and reintroduces a process you patch and scale. Use it when the cold start is on a user path you cannot move.',
    },
    evening: {
      title: 'A job that fits, and a job that will not',
      why: 'The timeout is a hard stop. Some work is a short function call. Some work is a batch job wearing a function costume, and the platform will kill it.',
      explain: `A fit is work with a known, small upper bound: resize one image you have already size-capped, write one row, send one webhook, fan out by enqueueing. The handler returns before the timeout with margin, including a cold start if the caller is waiting.

A miss is work whose duration grows with the input and can pass the limit: transcoding a long video, exporting a whole tenant, waiting on a human approval, crawling a site the caller named. The platform will stop the invocation. Partial output and a half-written record are the result. Put that work on a queue and a worker whose life is the job, and let the function only accept and enqueue.`,
      question:
        'Choose one workload that fits a short function timeout and one that will fail it. Use an image resize with a size cap, and a full-tenant export. Say where the export should run instead.',
      hints: [
        'A fit has a bound you control that is well under the timeout.',
        'An export grows with the tenant. The timeout does not.',
      ],
      outline: [
        'The capped resize fits because its duration is bounded under the timeout.',
        'The full-tenant export does not fit because it can run longer than the limit.',
        'The platform kills the export mid-write.',
        'Enqueue the export to a worker that can run for the length of the job.',
      ],
      solution: `The resize fits. You reject uploads above a size cap, the work is one object, and you have measured that the slowest allowed image finishes with margin under the timeout, cold start included if it is on the request path. The function is a reasonable place for it.

The full-tenant export will fail the timeout. A large tenant takes longer than the platform allows, and the invocation is killed while it is still reading or still writing the file. You get a partial object and a confused client, not a finished export. The function should record the request, enqueue a job, and return. A worker or a batch job runs the export with its own deadline, progress, and a way to resume or restart cleanly. Do not raise the function timeout to its maximum and hope the biggest tenant still fits. The limit is a design input. The export does not meet it.`,
      rubric: [
        'The capped resize is accepted as a fit because it has a measured bound under the timeout.',
        'The export is rejected as a function and moved to a queued worker because its duration grows past the kill.',
      ],
      myth: [
        'If the timeout can be configured, any job can be a function.',
        'A configurable maximum is still a maximum. Work that can exceed it does not belong in the invocation.',
      ],
      context:
        'This is the same split as a web handler that should not run a report inline. The platform kill is just more honest than a proxy timeout.',
      tradeoff: 'Enqueueing adds a queue to operate and makes the user wait for a job. Running inline is simpler and dies on the tenant that is larger than the timeout.',
      mistake: 'Catching the timeout in the client and retrying the whole export, which starts a second partial file.',
      followUp: 'What do you store so a retried enqueue does not start two exports?',
      extension: 'How does concurrency change the export if you did leave it on the function and ten tenants start at once?',
      alternative: 'Breaking the export into many small functions chained together can stay inside each timeout and adds a workflow to stitch partial results. A single worker is usually the smaller design.',
    },
  },
  'object-storage': {
    morning: {
      title: 'Bytes and a key, not a disk',
      why: 'Teams design object storage as if it were the disk on the app server. Partial writes, renames, and locks do not work the way a filesystem taught you.',
      explain: `An object is bytes plus metadata, addressed by a key in a bucket. The metadata is the content type, the size, a checksum, and any attributes you set. You put the whole object, or you compose it from parts the service defines. You do not open it and overwrite byte 400. A "folder" is a prefix on the key, not a directory inode you can rename in one operation.

Model the file that way from the start. The invoice PDF is the object at a key you chose. The row in your database holds the key, the checksum, and who may read it. The bucket is not a shared disk the application locks. Two puts to the same key are a replacement, or a new version if you turned versioning on, not an in-place edit.`,
      question:
        'Model an invoice PDF in object storage. Say what the object is, what metadata you keep, and which disk operations you do not get: in-place edit, rename as one inode change, and a lock.',
      hints: [
        'The database row points at the key. The bucket holds the bytes.',
        'Replacing a key is a new put, not a seek and a write.',
      ],
      outline: [
        'The PDF is an object: bytes plus metadata, named by a key.',
        'Metadata includes content type, size, checksum, and your own attributes.',
        'You do not edit the middle of the object or rename a directory as one inode.',
        'The application lock lives in your database, not in the bucket.',
      ],
      solution: `The PDF is one object. The key names the tenant and the invoice, the body is the bytes, and the metadata holds content type, size, a checksum, and maybe an invoice id you also store in the database. The database row is the source of "this invoice exists and this principal may read it." The bucket stores the bytes. A download is a get of that key, or a signed URL that allows that get for a short time.

You do not get an in-place edit of page two. You write a new object and then point the row at the new key, or you overwrite the key with a full new body. You do not get a directory rename that atomically moves a million invoices. A prefix change is a copy and a delete, or a key scheme that did not need the move. You do not get a filesystem lock. If two workers must not write the same invoice, the lock is a database transaction or a conditional write the storage API actually offers. Design the key and the row first. Do not design a mount path.`,
      rubric: [
        'The PDF is modeled as an object plus metadata, with the database holding the key and the authorization.',
        'In-place edit, inode rename, and a filesystem lock are explicitly not available.',
      ],
      myth: [
        'A bucket is a network disk. Our file code can stay the same if we mount it.',
        'A mount hides a different consistency and write model until a partial write or a rename surprises you. Model the object instead.',
      ],
      context:
        'Signed URLs are the read path that keeps the bucket private. The application still decides who may receive the URL. The bucket does not know your users.',
      tradeoff: 'One object per invoice makes puts simple and makes a million tiny files expensive to list. A bundle is harder to replace one invoice inside.',
      mistake: 'Using the local disk cache as the only copy and treating the bucket as an optional backup you sync later.',
      followUp: 'Where do you check authorization, in the app before a signed URL or in the bucket policy alone?',
      extension: 'What metadata do you want when you later need to delete every object for one tenant?',
      alternative: 'A content-addressed key, the hash of the bytes, makes the put idempotent and makes the database the only place that maps an invoice id to bytes. You cannot change the object without a new key, which is the point.',
    },
    evening: {
      title: 'Consistency and request rate',
      why: 'A put that returned success is not a promise about every later list, and a popular prefix is not free. You design the read path and the key around both limits.',
      explain: `Read the provider contract instead of assuming a disk. A get of a key you just created is often visible immediately. An overwrite, a delete, and a list of a prefix can lag or return a previous generation in ways the contract spells out. The user path should read the key it wrote, or read a database row you updated after the put succeeded, not list the prefix and hope the new key appears.

Request rate is the other limit. One prefix or one hot key can be throttled while the account still looks idle. Do not put every upload under a single timestamp prefix that all clients hammer. Cache a popular object at the edge. Treat a list of a million keys as a job, not as a request on the user path.`,
      question:
        'After a successful put of an invoice PDF, the UI lists the prefix to show it. Explain the consistency mistake, and the request-rate limit you hit if every tenant writes keys under one hot prefix. Say what you would read instead.',
      hints: [
        'A get of the key you wrote is a different call from a list of the prefix.',
        'A shared prefix can be throttled on its own, apart from the account limit.',
      ],
      outline: [
        'Listing the prefix is not a reliable "the put is visible" check.',
        'Read the key you wrote, or the database row you committed after the put.',
        'One hot prefix can hit a request-rate limit.',
        'Spread keys and keep list calls off the user path.',
      ],
      solution: `The consistency mistake is using list as the proof of the put. The put of a new key can succeed, and a list of that prefix can still omit it for a window the provider documents. The UI then tells the customer the upload failed, they retry, and you have two objects or a confusing duplicate. Read the object by the key you wrote, or commit a database row after the put and have the UI read the row. Do not ask the bucket to be the index.

The rate mistake is a single prefix, such as a date or the word uploads, that every tenant writes and lists. The provider can throttle that prefix even when your overall quota looks fine. The user sees slow puts or errors at the top of the hour. Put the tenant or a hash in the key so writes spread, cache objects that are actually hot, and run large lists as an offline job with a continuation token. Design for the contract you read, not for a disk that updates a directory the moment the file closes.`,
      rubric: [
        'List-after-put is rejected, and the replacement read is the key or a database row updated after the put.',
        'A hot prefix is identified as a request-rate limit, with key design or caching as the response.',
      ],
      myth: [
        'Object storage is strongly consistent for every API, so a list will show the put.',
        'Contracts differ by call. A get of a new key and a list of a prefix are not the same guarantee. Design the path you actually call.',
      ],
      context:
        'Indexes belong in a database or a search system. The bucket is the bytes. Using list as a query API is how both consistency and rate show up as user-facing bugs.',
      tradeoff: 'A database index of keys adds a component and gives you a read path that does not list the bucket. Listing is fewer moving parts and fails the user on lag and on rate.',
      mistake: 'Retrying the put because the list did not show the key yet, and creating a second object.',
      followUp: 'What do you show in the UI if the put succeeded and the database commit failed?',
      extension: 'How would versioning change an overwrite the user must read immediately?',
      alternative: 'Writing the key only after a database transaction records the intent, then confirming the row, is the outbox version of this. The UI reads the row, never the list.',
    },
  },
  'cloud-networking': {
    morning: {
      title: 'VPC, subnet, and a rule',
      why: 'A packet does not "reach the cloud." It crosses a network you defined, a subnet with a route, and a rule that can drop it without a log line in the application.',
      explain: `A VPC is the private network, with an address range you chose. A subnet is a slice of that range, usually in one zone, with a route table. A public subnet has a route to an internet gateway. A private subnet does not, and its outbound path, if any, is a NAT you placed on purpose.

A security rule on the instance or the load balancer decides which peer, port, and protocol may connect. On the common clouds the default is deny, and you add allows. The packet path is: into the VPC, along the subnet route, through the security rule, then to the process. If the rule drops the packet, the application never sees a request. Connection timeout at the client is the symptom. There is no HTTP status.`,
      question:
        'Trace a packet from a load balancer to the invoice API in a private subnet, and name the VPC, the subnet, and the security rule. Say what the client observes if the rule drops the packet.',
      hints: [
        'The subnet route has to be able to reach the API. The security rule has to allow the balancer on the API port.',
        'A drop is not an HTTP 403. The application writes no access log.',
      ],
      outline: [
        'The packet enters the VPC and is routed into the private subnet.',
        'The security rule must allow the balancer to the API port.',
        'Only then does the process accept a connection.',
        'A dropped packet is a timeout or a reset at the client, with no application log.',
      ],
      solution: `The load balancer and the API sit in a VPC, the network you addressed. The API is in a private subnet: its route table does not put it on the internet, and the balancer is the path in. The packet arrives at the balancer, is routed across the VPC toward the subnet, and hits the security rule on the API interface. That rule must allow the balancer, or the balancer security group, to the port the process listens on. If it does, the kernel accepts and the process can log a request.

If the rule drops the packet, the API process sees nothing. There is no access log and no status code. The balancer, and then the client, wait until a timeout, or they see a connect failure if something rejects instead of drops. Trace in that order when a deploy "cannot reach the new subnet." Check the route, then the peer and the port on the rule. Restarting the API does not insert an allow that is not there.`,
      rubric: [
        'The path includes the VPC, the private subnet and its route, and a security rule that allows the balancer to the API port.',
        'A dropped packet is described as a client timeout with no application log.',
      ],
      myth: [
        'If the process is listening, clients in the VPC can connect.',
        'Listening is the last step. The route and the security rule can drop the packet before the process sees it.',
      ],
      context:
        'Security groups that drop look like a mysterious timeout. A rule that rejects looks like connection refused. The application error rate stays quiet either way if the socket never accepted.',
      tradeoff: 'Default deny with a short allow list is quiet and blocks a dependency you forgot to permit. A wide allow makes the first deploy easy and leaves the port open to peers you did not name.',
      mistake: 'Opening the API port to the whole VPC because one subnet could not connect, and leaving that rule in place.',
      followUp: 'What route does the private subnet need for the API to call a public partner, if it has no internet gateway of its own?',
      extension: 'Which address does the API see as the client, the user or the load balancer?',
      alternative: 'A network ACL on the subnet adds a stateless filter in front of the security group. It is useful as a coarse boundary and easier to get wrong because return traffic must be allowed explicitly.',
    },
    evening: {
      title: 'The rule that lets one path through',
      why: 'Health checks and real dependencies use different peers and ports. A rule can make the balancer call the service healthy while the service cannot reach the database, or the reverse.',
      explain: `The health check is a connection from the load balancer to the API port. The dependency is a connection from the API to the database port. They are different rules. You can allow the first and forget the second. The balancer marks targets healthy, sends users, and every request fails when the handler touches the database.

You can also allow the database and forget the health port. The process is up, the database is reachable, and the balancer marks every target down and sends nobody. Read the rule as a sentence with a peer and a port. "The balancer may connect to 8080" is not "the API may connect to 5432."`,
      question:
        'Show a security rule that allows the health check and blocks the database, or the reverse. Say what the balancer reports, what the process can do, and which rule is wrong.',
      hints: [
        'The health check peer is the load balancer. The database peer is the API, on a different port.',
        'A healthy target only means the check port connected. It does not mean the dependency is allowed.',
      ],
      outline: [
        'The health rule allows the balancer to the API port.',
        'The database rule does not allow the API to the database port.',
        'The balancer marks targets healthy and users receive dependency failures.',
        'The reverse rule set marks targets down even though the database would have worked.',
      ],
      solution: `Take the first failure. The API security group allows the load balancer security group on port 8080, so the health check connects and the target is healthy. The database security group allows an old application group, or the office, and not the API group, on port 5432. The process starts, the balancer sends traffic, and the handler cannot open the database. Users see errors. The health endpoint stays green if it does not touch the database. The wrong rule is the database allow. Add the API security group as the peer on 5432, and do not open 5432 to the world to make the error stop.

The reverse is a database rule that already allows the API, and an API rule that allows your laptop and not the balancer. The process could serve, and the balancer marks it down and drains it. The wrong rule is the health-check allow. Name the peer and the port in the sentence. A green health check is not a green dependency, and a passing dependency is not a target the balancer will use.`,
      rubric: [
        'One concrete mismatch is shown: health allowed and database blocked, or the reverse, with peer and port.',
        'The balancer view and the process view are both stated, and the fix names the missing peer rather than opening every port.',
      ],
      myth: [
        'A passing health check means the security rules for the service are correct.',
        'The check only proves the balancer can reach the check port. The database rule is a separate allow.',
      ],
      context:
        'Readiness that includes the database would mark the target down in the first failure. That is a better check, and it still needs the database rule or the target stays down.',
      tradeoff: 'A health check that only proves the port is up keeps a dependency failure visible as errors. A health check that calls the database marks the target out and can drop the whole fleet when the database blips.',
      mistake: 'Adding 0.0.0.0/0 on the database port because the health check was green and the handler still could not connect.',
      followUp: 'How would you test the database rule without opening it to your laptop?',
      extension: 'What does the balancer report in the reverse case, where the database rule is right and the health rule is wrong?',
      alternative: 'Putting the API and the database in security groups that reference each other by id, in code, makes the peer explicit. A wide CIDR is shorter to write and admits anything that lands in the range.',
    },
  },
  iam: {
    morning: {
      title: 'Name the action and the resource',
      why: 'A policy is a sentence the platform will enforce literally. If the sentence does not name the action and the resource, you do not know what you granted.',
      explain: `Write a policy as an allow of one action on one resource, then add the next action if you need it. The principal is the role the workload assumes. The action is a specific API, such as storage get-object or queue send-message. The resource is the identifier of the bucket prefix, the queue, or the table, not the whole service.

A condition can narrow it further, for example to traffic from one network. The test of the sentence is whether a stranger can read it and say what the role may do. "Invoice worker may get objects in this prefix" passes. "Invoice worker may use storage" does not. That second sentence is how a tutorial role becomes permanent.`,
      question:
        'Write a policy, in words or as a statement, that lets the invoice worker read objects in one prefix and nothing else. Name the action and the resource. Say what you will not put in the action field.',
      hints: [
        'The action is the specific call, not the service name with a star.',
        'The resource names the prefix or the bucket path, not every bucket.',
      ],
      outline: [
        'The principal is the invoice worker role.',
        'The action is get-object, not every storage call.',
        'The resource is the one invoice prefix.',
        'Delete, list on other buckets, and identity actions are absent.',
      ],
      solution: `The statement is allow, principal the invoice worker role, action storage get-object, resource the invoice bucket prefix and nothing broader. A second statement, if the worker also enqueues, is allow send-message on that one queue. A reader should be able to repeat the sentence without looking at the console defaults.

Do not put a wildcard action in the action field. Do not put the whole account or every bucket in the resource field. Do not add list, delete, or put because the console grouped them with get. If the worker later needs a new call, that is a new statement in the same change as the code. A policy that names the action and the resource is the policy. A role name like "read-only" does not constrain anything if the statement underneath says otherwise.`,
      rubric: [
        'The policy names get-object, or an equally specific action, and one prefix or resource.',
        'A wildcard action or a whole-service grant is explicitly excluded.',
      ],
      myth: [
        'Naming the role "invoice-reader" is the policy.',
        'The role name is a label. The statement action and resource are what the platform enforces.',
      ],
      context:
        'Least privilege on a service account is this sentence written down. The cloud policy is where the sentence becomes real.',
      tradeoff: 'One statement per call is verbose and obvious in review. A single broad statement is short and hides a delete you did not mean to ship.',
      mistake: 'Granting the action on all resources because the resource field was annoying to look up.',
      followUp: 'What condition would you add so the role only works from the production network?',
      extension: 'Which new statement do you write if the worker must write a PDF beside the invoice?',
      alternative: 'A permissions boundary that denies identity changes caps what a loose statement can do. It is a backstop, not a substitute for naming the resource on the allow.',
    },
    evening: {
      title: 'The wildcard that is administrator',
      why: 'A star is easy to miss in a policy that otherwise looks specific. One wildcard on the action and the resource is the administrator role under a modest name.',
      explain: `The platform reads the statement, not the role title. An allow of every action on every resource is administrator: it can read and change data, and on most clouds it can change identity too if those actions sit behind the same star. A star on the resource with a data-plane star, such as every storage call on every bucket, is administrator for the data even if identity is untouched.

Find it by reading the JSON or the reviewed plan, not the name in the console. A role called deploy-helper with action star and resource star can do what the admin role can do. Narrow actions on a star resource are still wide. The one that is equivalent to administrator is the unbounded action and the unbounded resource together.`,
      question:
        'A role named invoice-deploy has one statement: allow, action *, resource *. Find the wildcard that makes it equivalent to administrator. Say what the role name does not change.',
      hints: [
        'Read the statement. The role name is not an allow list.',
        'Action star plus resource star is not scoped to invoices, whatever the path suggested.',
      ],
      outline: [
        'The action wildcard allows every API.',
        'The resource wildcard applies that to every resource.',
        'Together they are administrator, including data and identity where those APIs are covered.',
        'The name invoice-deploy does not narrow the statement.',
      ],
      solution: `The wildcard is the pair: action * and resource *. Action * is every API the platform offers that role, not every invoice API. Resource * is every object those APIs can name, not the invoice bucket. Together the statement is "this principal may do anything to anything." That is the administrator role. It can read other teams data, change network rules, and, where identity actions are included by the star, create new keys. The deploy only needed a short list of actions on the invoice resources and the deploy pipeline.

The name invoice-deploy changes nothing the platform checks. A comment in the file changes nothing. Replace the statement with the specific actions and the specific resources, and delete the star. If a second statement in the same role still has action * or a star on a powerful service such as identity, the role is still administrator through that statement. Search for the star. Do not trust the label.`,
      rubric: [
        'Action star and resource star are identified as the administrator grant.',
        'The role name is stated to have no effect on what the platform allows.',
      ],
      myth: [
        'A role cannot be administrator if its name says deploy or read-only.',
        'The name is documentation. Action star on resource star is administrator regardless of the name.',
      ],
      context:
        'Tutorial policies ship this star so the first deploy works. The evening review is deleting it before the role is attached to production.',
      tradeoff: 'Keeping a break-glass admin role is honest if it is rare, logged, and not the deploy role. Hiding admin inside the deploy role means every pipeline run is a standing administrator.',
      mistake: 'Replacing action * with service:* on resource * and believing the role is now narrow because the star is shorter.',
      followUp: 'What is the smallest statement that lets this deploy push one image and roll one service?',
      extension: 'Why is an identity action star more damaging than a single-bucket get star?',
      alternative: 'A permission set generated from the calls the deploy actually made last month is the narrow policy. It will break the next new API until you add it, which is the trade you want.',
    },
  },
  'infrastructure-as-code': {
    morning: {
      title: 'Desired state as a reviewed change',
      why: 'The account is not a console someone remembers. The desired state is a diff you can read before it becomes a real network, a real role, or a real bucket.',
      explain: `Treat the cloud account the way you treat the application. The repo holds the desired networks, roles, buckets, and services. A change is a pull request. The plan shows what the platform will create, edit, or destroy. A person reviews that plan. Automation applies it. The console is not the author.

That review is the control. A firewall opening, a role with a star, and a database that becomes public are visible in the plan if someone reads it. They are invisible in a click that nobody else saw. The applied state should match the reviewed state. If it does not, you do not have infrastructure as code. You have a script that sometimes runs.`,
      question:
        'Treat the production account desired state as a reviewed change. Say what is in the repo, what a reviewer looks at before apply, and what is no longer allowed as the normal way to open a port.',
      hints: [
        'The plan, not only the template syntax, is what shows the port and the role.',
        'A console click is an unreviewed apply.',
      ],
      outline: [
        'The repo holds the desired networks, roles, and services.',
        'A pull request produces a plan of creates, changes, and destroys.',
        'A reviewer reads that plan before automation applies it.',
        'Opening a port in the console is not the normal path.',
      ],
      solution: `The repo is the desired state: the VPC, the security rules, the roles, the buckets, the services, in files the team can diff. A change starts as a pull request. The automation runs a plan and attaches it. The reviewer looks at the plan, not only at the template. They look for a destroyed database, a route that now faces the internet, a role that gained a star, a size change that costs money. If the plan matches the intent, it merges and the pipeline applies it with a credential people do not share.

Opening a port in the console is no longer the normal path. It is an incident exception, followed by a commit that makes the repo true, or a revert of the click. The point of the review is that the account changes the way code changes: named author, named diff, a chance to say no before the platform does it. A script on a laptop that applies without a review is the console with extra steps.`,
      rubric: [
        'Desired state lives in the repo, and a human reviews the plan before an automated apply.',
        'A console change is rejected as the normal way to open a port or edit the account.',
      ],
      myth: [
        'Infrastructure as code means we generated the account once and the files are in git.',
        'The files have to be how changes happen. A generated snapshot that nobody applies or reviews is documentation, and it goes stale.',
      ],
      context:
        'The plan is the code review for resources that do not show up in the application diff. A security group is as much a change as a handler.',
      tradeoff: 'Requiring a reviewed plan slows an incident change and prevents a silent opening. Console access during incidents is faster and creates drift unless someone backfills the repo the same day.',
      mistake: 'Reviewing the template variable and not the plan, so a module default opens a port the reviewer never saw.',
      followUp: 'What do you do with a plan that wants to destroy a database you did not mean to touch?',
      extension: 'Which credential should be allowed to apply in production, a person or the pipeline?',
      alternative: 'A change ticket with a pasted plan is a weaker version of the same review when you cannot put the tool in CI yet. It still beats an unlogged click. Move it into the pipeline when you can.',
    },
    evening: {
      title: 'Drift and the console click',
      why: 'Drift is the live account disagreeing with the last apply. It starts with a click that fixed something and never became a commit. The next apply may undo it, or the repo may lie.',
      explain: `Drift means the resources in the account are not what the repo would build. A console change is the usual cause: a port opened during an incident, a role granted for a debugger, a size bumped by hand. The repo still describes yesterday. Anyone reading the repo thinks yesterday is what is running.

You notice by comparing. A scheduled plan that is not empty, in an account where nobody merged a change, is drift. An audit event from a human identity, rather than the automation role, is the click. Decide which side wins. If the repo wins, the next apply reverts the click, so the click was temporary on purpose. If the click was the real intent, commit it before the apply reverts a fix you still need.`,
      question:
        'Someone opens a database port in the console during an incident and does not commit it. Explain the drift, and how you would notice the console change before the next apply reverts or keeps it by accident.',
      hints: [
        'Drift is live state minus the last reviewed desired state.',
        'A plan run with no merged change, and an audit event that is not the pipeline role, are the two signals.',
      ],
      outline: [
        'The live rule allows the port. The repo does not.',
        'That gap is drift, caused by the console change.',
        'A scheduled plan shows a diff when no commit happened.',
        'An audit event on a human identity shows who clicked, before apply reverts the port.',
      ],
      solution: `The drift is the database rule. Production allows a peer or a CIDR that the last applied commit does not contain. The repo says the port is closed. The account says it is open. Anyone debugging from the repo will be wrong, and the next pipeline apply will revert the opening if the repo is the source of truth. That revert is correct only if the incident is over. If the opening is still how the on-call is reaching the database, the apply recreates the outage.

You notice before that apply in two places. A scheduled plan, run against production with no new commit, reports a change to the security rule. That non-empty plan is the alarm. The cloud audit log shows a human principal modifying the rule, not the pipeline role. Page on the human write, or on the non-empty plan. Then either commit the opening with an expiry you mean, or close it and record why. Do not leave the click as the only copy of the truth. The console is not a branch.`,
      rubric: [
        'Drift is defined as the live port disagreeing with the repo, with the console click as the cause.',
        'Notice comes from a non-empty plan or a human audit event, before an apply reverts the click blindly.',
      ],
      myth: [
        'If we use infrastructure as code, the console cannot change production.',
        'The tool does not lock the console unless you remove that permission. Until you notice the diff, the click is the live state.',
      ],
      context:
        'A hand-patched container is drift of an image. A console click is drift of the account. Both mean the reviewed source is not what is running.',
      tradeoff: 'Applying on a schedule reverts drift quickly and can revert an incident fix at the worst time. Applying only on merge preserves the click until someone notices the plan is dirty.',
      mistake: 'Disabling the scheduled plan because it was noisy, which deletes the only signal that the console changed.',
      followUp: 'How do you let an incident responder open the port without leaving drift overnight?',
      extension: 'What permission do you remove so a normal developer identity cannot edit production rules in the console?',
      alternative: 'Importing the live account back into the repo captures the click as code after the fact. It also captures mistakes as the new desired state if you import without reading the diff.',
    },
  },
  cicd: {
    morning: {
      title: 'Build, test, and deploy are different rights',
      why: 'A single pipeline credential that can do everything means a compromised test, or a pull request, can ship to production. Split the rights with the jobs.',
      explain: `Build reads the repo and writes an artifact or an image to a registry. It does not need to change production, and it should not have that role. Test runs checks, maybe deploys to a scratch environment, and reads nothing it can use to reach production data. Deploy is allowed to apply to one environment, and the production deploy role is not the staging deploy role.

The pipeline identity is not a shared admin key in a repo variable. Each job assumes the role it needs and no other. A pull request build is the least trusted of the three. It runs code the reviewer has not merged, so it must not hold a production credential even for a moment.`,
      question:
        'Separate build, test, and deploy permissions for the invoice service. Say what each job may do, and which job must not be able to reach production.',
      hints: [
        'Build writes an artifact. Deploy changes an environment. They are different roles.',
        'A pull request runs untrusted code. That job is the one that must not hold production rights.',
      ],
      outline: [
        'Build may read the repo and push an image. It may not deploy.',
        'Test may deploy to a scratch environment and may not read production secrets.',
        'Deploy to production is a separate role from staging deploy.',
        'The pull request job must not be able to reach production.',
      ],
      solution: `Build assumes a role that can read the source and push a digest to the registry. It cannot change the production service, read the production database secret, or assume the deploy role. Test assumes a role in a scratch account or namespace. It can install the image there and run checks. It cannot read production buckets or production tokens. If a test needs data, it gets a fixture, not a copy of customers.

Deploy assumes an environment role. Staging deploy can change staging. Production deploy can change production, and only the production pipeline, after merge, can assume it. The pull request job is build plus maybe test in scratch. It must not be able to reach production. A secret in the repo settings called DEPLOY_KEY that every job inherits is the failure mode. Split the roles, and make assumption one-way: build cannot become deploy, and a fork cannot become build with secrets.`,
      rubric: [
        'Build, test, and production deploy are three different permission sets, with production absent from build and test.',
        'The pull request or untrusted job is explicitly unable to reach production.',
      ],
      myth: [
        'The pipeline is trusted, so one cloud admin key for all jobs is fine.',
        'The pipeline runs attacker-controlled code on pull requests and third-party scripts on install. That is not one trust level.',
      ],
      context:
        'Supply-chain installs belong in the build job, which is why that job must not also hold the production token. A bad script then cannot deploy.',
      tradeoff: 'Separate roles take longer to set up and limit the blast of a bad pull request. One admin key is easy and makes every job a production incident.',
      mistake: 'Putting the production deploy key in the repo CI variables so the test job can "just curl production" to verify.',
      followUp: 'How does the production deploy job learn the image digest without being the job that built it?',
      extension: 'What can a fork pull request read if secrets are shared with all pipelines by default?',
      alternative: 'A human who deploys from a laptop with their own production role removes the pipeline power and removes the audit and the repeatability. Prefer a narrow pipeline role over a person admin key.',
    },
    evening: {
      title: 'A deploy nobody approved',
      why: 'Green tests are not an approval, and a log line that says the job finished is not an audit. Production needs a person and a record of what digest moved.',
      explain: `A pipeline that deploys to production on every green main, with an administrator role and no record of the digest or the author, has no human and no audit. Anyone who can merge, or anyone who can change the pipeline, ships whatever the job builds. The cloud trail shows the pipeline role did something. It does not show which digest, and it does not show that a person meant this release.

Close the gap without inventing a heavy platform. Require a person to approve the production environment. Record the commit, the image digest, and the approver on the run. Give the deploy role only the actions that roll this service, not administrator. The build job still cannot assume that role.`,
      question:
        'Show a pipeline that can deploy to production with no human and no audit, and close that gap. Include the permission the deploy role should lose.',
      hints: [
        'Auto-deploy from main with an admin credential is the open gap.',
        'The record you want is the commit, the digest, and the person who approved.',
      ],
      outline: [
        'The open pipeline deploys every green main with an admin role and no approval.',
        'Require a person to approve the production environment.',
        'Record the commit, the digest, and the approver.',
        'Replace the admin role with the rights to roll this service only.',
      ],
      solution: `The open pipeline is: merge to main, tests pass, the job assumes a cloud admin key stored in CI, and it deploys. There is no approval step. The log may keep a few days of console noise and does not store the digest as the release identity. A bad merge, or a change to the pipeline file, is in production before anyone else looks. That is no human and no audit.

Close it. Protect the production environment so a named person has to approve the run after the artifact exists. The approver is not the only author of the change, if you can staff that. Write the commit SHA, the image digest, and the approver into the run record you keep. Cut the deploy role down to the service it rolls and the config it may change. Remove administrator, account-wide stars, and the right to change the pipeline from inside the deploy job. Build remains a different role that cannot assume deploy. A green test can still be required. It is not the approval, and it is not the record.`,
      rubric: [
        'The gap is auto-deploy to production with a powerful credential and no recorded human decision.',
        'The close includes a person approving, a record of commit, digest, and approver, and a deploy role that is not administrator.',
      ],
      myth: [
        'If tests passed, nobody needs to approve the production deploy.',
        'Tests check behavior you wrote tests for. Approval is a person accepting this digest in production, and the audit is the record of that acceptance.',
      ],
      context:
        'A canary is a safer rollout. It is not an approval. You can canary a digest nobody decided to ship if the pipeline is automatic and unaudited.',
      tradeoff: 'A required approver delays a hotfix and stops a silent ship. Skipping the approver at night is how the gap reopens unless the skip itself is an audited exception.',
      mistake: 'Adding an approval button that the same pipeline can click with its own token.',
      followUp: 'What do you keep so you can say next month which digest was in production on a given day?',
      extension: 'Why is the build role still forbidden from assuming deploy after you add the approval?',
      alternative: 'A change window with two people present is the manual form of the same control. It audits poorly unless you still record the digest. The pipeline record is the better log.',
    },
  },
  environments: {
    morning: {
      title: 'What staging must share, and what it must not',
      why: 'Staging is evidence only if it fails for the same reasons production would. It is a liability if it holds production people, production secrets, or production power.',
      explain: `Share the architecture that the bug depends on: the same request path, the same data stores with the same schema and migrations, the same major versions, a config shape that is the production shape with different values. Share enough data volume, or a stated scale factor, when the bug is about volume. Otherwise a pass in staging means the toy worked.

Do not share production secrets, production data that identifies customers, the production identity provider in a way that can act on real users, or the production network and roles. A staging job that can assume the production deploy role is not a stage. It is production with a softer name. Evidence and isolation are the two requirements, and they pull apart. Write both lists.`,
      question:
        'Define what staging must share with production to be evidence for the invoice API, and what it must not share. Include data, secrets, and identity.',
      hints: [
        'The schema, the request path, and the dependency versions are evidence. A laptop database with three rows is a weaker one.',
        'Production customer rows and production credentials are the share that turns staging into a breach.',
      ],
      outline: [
        'Share the request path, schema, migrations, and dependency versions.',
        'Share a stated data shape or scale when the risk is scale.',
        'Do not share production secrets or customer-identifying data.',
        'Do not share production identity, network, or deploy roles.',
      ],
      solution: `Staging must share the path a request takes: the same kind of edge, the same service boundary, the same database engine and migration code, the same object-storage shape, and the same major versions of the runtime. Config keys should match production so a missing setting fails in staging. If you are worried about a query on a large tenant, staging needs a stated volume or a synthetic tenant of that shape, not ten rows and a promise.

Staging must not share production secrets, a copy of customer invoices, production tokens, or a role that can read or deploy production. It must not send mail or charges to real customers. Use synthetic people and a separate identity provider. A pass is then evidence about the software. A leak in staging is not a leak of the customer table. If you "just restore production into staging" to get realistic bugs, you have copied the data you were not allowed to share into a place with weaker access. Generate synthetic data shaped like production instead.`,
      rubric: [
        'Staging shares architecture, schema, and dependency versions, plus volume only when volume is the question.',
        'Production secrets, customer data, and production identity or deploy power are explicitly not shared.',
      ],
      myth: [
        'Staging is realistic only if it is a copy of the production database.',
        'A copy is realistic and illegal to treat casually. Synthetic data with the same shape is the evidence you can actually share.',
      ],
      context:
        'Account isolation is what makes "must not share" true. A separate staging account with no path to production roles is the mechanism, not a wiki page.',
      tradeoff: 'Synthetic data misses the one weird row production has. A production copy catches that row and puts personal data in a weaker environment.',
      mistake: 'Using the production payment key in staging so the end-to-end test is "more real."',
      followUp: 'How do you refresh synthetic data when the schema migration changes a column?',
      extension: 'Which production setting is it useful for staging to deliberately not share, such as a feature flag?',
      alternative: 'A short-lived environment per pull request can match the schema and still be tiny. It is evidence for correctness of the migration and weak evidence for scale. Keep one shared stage for the scale question.',
    },
    evening: {
      title: 'The bug staging will not show',
      why: 'A green staging deploy is evidence about the things staging shares. It is silence about the things it cannot see. Name that class before you trust the pass.',
      explain: `Some bugs need production and only production. The data distribution, including one tenant far larger than the synthetic set. The real certificate name, the real DNS, the partner source addresses. A quota or a rate limit the cloud applies only after production volume. A dependency that only the production identity is allowed to call. A plan that was fine on a small table and scans on the real one.

Staging cannot catch that class, whatever you do to the shared architecture. Pretending the green deploy covered it is how the bug reaches users. Name the class, and name the evidence you will use instead: a production canary, a shadow read, a load test with production-shaped data that is still synthetic, or an explicit acceptance that you will learn in production.`,
      question:
        'Name a class of bug staging cannot catch for the invoice API, even when schema and versions match. Give one example, and say how you would get evidence anyway.',
      hints: [
        'Think of a query plan or a quota that depends on production volume or production identity.',
        'A green staging run is not evidence about a class staging was built not to contain.',
      ],
      outline: [
        'The class is scale or data shape, or another class only production has.',
        'An example is a query that is fine on synthetic rows and scans on a real large tenant.',
        'Staging cannot hold that tenant if you refuse production data, and a small copy will not show it.',
        'Evidence comes from a canary, a synthetic large tenant, or a measured production rollout.',
      ],
      solution: `The class is data shape and volume. Staging has synthetic invoices in the thousands. Production has one tenant with tens of millions of rows and a skew the generator did not copy. A query that uses an index on staging sequential-scans, or times out, on that tenant. Matching the schema and the database version does not catch it. You refused to copy the tenant, correctly, so staging cannot see the bug. Traffic shape, partner allow lists, and cloud quotas are the same class of "only production has this input."

Get evidence another way. Build a synthetic tenant at that cardinality and run the query there, or roll the change behind a canary that measures that tenant latency without making staging a copy of the customer. Do not read the green staging deploy as a pass on the large tenant. Write the class on the change: "staging cannot catch plan changes on the largest tenant; the canary is the evidence." That sentence is the difference between a stage that informs you and a stage that reassures you.`,
      rubric: [
        'A specific class is named, with an example staging is structurally unable to see, such as production data shape or a production-only quota.',
        'The green staging result is not treated as evidence for that class, and another source of evidence is named.',
      ],
      myth: [
        'If staging matches production architecture, a pass means production will pass.',
        'Architecture match covers bugs of architecture. It does not cover inputs only production has: volume, identity, quotas, and partners.',
      ],
      context:
        'Canaries exist because of this class. They are the production experiment you run when a pre-production environment cannot see the input.',
      tradeoff: 'A synthetic huge tenant costs money and still misses real skew. Learning from a small production canary risks that tenant and sees the real distribution.',
      mistake: 'Declaring the migration safe because staging migrated a one-gigabyte sample.',
      followUp: 'What metric on the canary would tell you the large-tenant query got worse?',
      extension: 'Name a second class, besides volume, that this staging environment cannot catch.',
      alternative: 'Replaying anonymized production query shapes, without the personal rows, can catch the plan. Anonymization has to actually remove the personal data, or you have copied production again.',
    },
  },
  'cloud-cost': {
    morning: {
      title: 'Which line on the bill',
      why: 'A bill that is one number cannot be changed on purpose. You need the line that maps dollars to a service, a storage class, or a dependency you can actually turn down.',
      explain: `Attribute cost before you optimize it. A tag or a separate account maps a line to the invoice service, not to "engineering." A storage class maps a line to standard objects, old snapshots, or a disk you forgot. A dependency maps a line to something chatty: cross-zone traffic, a log line per request in an indexed store, a health check that calls a paid API, a NAT processing bytes that could have stayed private.

The bill is a system symptom. The label is what makes it a decision. If you cannot say which of those three a surprising line is, you will resize the API and leave the snapshot or the chatty log untouched.`,
      question:
        'The invoice service bill jumped. Attribute it to a service, a storage class, or a chatty dependency. Name the label you need on the line before you change anything.',
      hints: [
        'A service tag tells you the invoice API owns the line. It does not tell you whether the line is compute, snapshots, or egress.',
        'Logs and cross-zone calls are dependencies that show up as cost, not as a feature flag.',
      ],
      outline: [
        'Start with a label that ties the line to the invoice service.',
        'Split that into compute, a storage class, and network or logs.',
        'A chatty dependency is a call pattern, not a machine size.',
        'Do not resize the API until the line says the API is the cost.',
      ],
      solution: `Put a tag, or a separate account, on the invoice resources so the line is the service and not a shared platform bucket. Then split the line. Compute is the replicas. Storage class is the live bucket versus infrequent access, snapshots, and unattached disks. Chatty dependency is egress, cross-zone traffic, or an indexed log that grew because someone logged every request body.

The label you need before you change anything is that split, not the total. If the jump is snapshots of a database you already replaced, resizing the API does nothing. If the jump is cross-zone calls between the API and the database, a bigger instance does nothing. If the jump is request volume the SLO requires, the line is honest capacity and the change is a product decision. Attribute first. The service, the storage class, or the chatty dependency is the unit of the next edit.`,
      rubric: [
        'Cost is attributed with a service label and then split into compute, storage class, or a chatty dependency.',
        'A change is deferred until the line identifies which of those actually jumped.',
      ],
      myth: [
        'The bill went up, so we should scale the API down.',
        'The API is one line. Snapshots, logs, and cross-zone traffic are others. Cut the line that moved.',
      ],
      context:
        'Tags are the trace ids of money. Without them, a shared NAT or a shared log account hides the service that caused the jump.',
      tradeoff: 'Fine-grained tags cost discipline and sometimes a tagging limit. A single account-wide bill is easier and cannot be assigned to a team or a change.',
      mistake: 'Turning on detailed request logging to debug cost, which adds a log line that costs more than the thing you were measuring.',
      followUp: 'Which tag is missing if a shared log bucket cannot be tied to the invoice service?',
      extension: 'How would you tell a storage-class jump from a request-rate jump on the same bucket?',
      alternative: 'A separate account per service makes the bill the attribution. It costs more accounts to administer and removes a class of shared-line arguments.',
    },
    evening: {
      title: 'Cut cost and keep the SLO',
      why: 'A cheaper system that misses the error budget is not a saving. The change has to leave the user-visible target where it is.',
      explain: `Pick a line that is not on the user path, or a line whose reduction does not change the latency and error targets. Old snapshots beyond the recovery point you already accepted, unattached disks, debug logs that no alert reads, a cross-zone hop you can remove by placing the caller with the callee: those can move the bill without moving the SLO.

Do not remove the only replica, shrink below the measured working set, or drop the health check to save requests. Those move the SLO and sometimes the data. State the SLO you are holding still, and state the line you are cutting, in the same sentence.`,
      question:
        'Propose one change that cuts the invoice service bill without moving its availability SLO. The SLO depends on three replicas and the current request path. Say which tempting cut you reject.',
      hints: [
        'Snapshots and unattached disks are not the request path.',
        'Removing a replica or the only copy of data moves the SLO or the recovery point.',
      ],
      outline: [
        'Name an SLO that stays: availability with three replicas.',
        'Cut a line off the request path, such as old snapshots or debug logs.',
        'Reject dropping a replica or shrinking below the working set.',
        'The user-facing error and latency targets do not change.',
      ],
      solution: `Delete database snapshots and unattached disks older than the recovery point you already promised, and stop indexing debug logs that no alert and no dashboard read. Keep error and latency metrics. The availability SLO is three replicas serving the current path. None of that path changes: same replica count, same instance size if it still matches the working set, same health checks. The bill drops because you stop paying for bytes and log lines the user never waited on.

Reject the tempting cut. Do not drop to one replica to save two machines. That moves the availability SLO, even if the graphs look calm this week. Do not delete the only backup to erase the storage line. That saves money by discarding the recovery you already sold. If a later change moves a chatty call beside its callee to cut cross-zone traffic, check that the latency SLO still holds. The first change does not need that argument. The snapshots were not in the SLO.`,
      rubric: [
        'The cut is off the request path, such as old snapshots or unused debug logs, and the three-replica SLO is unchanged.',
        'A cut that removes a replica or the only backup is rejected because it moves the SLO or the recovery point.',
      ],
      myth: [
        'Any reduction in the bill is a good efficiency project.',
        'A reduction that spends the error budget or the only copy of the data is an outage you scheduled. Cut a line the SLO does not use.',
      ],
      context:
        'Error budgets are the other half of this sentence. You can spend budget on purpose. You cannot call a budget spend a pure cost cut.',
      tradeoff: 'Keeping snapshots for the full recovery window costs money and makes restore possible. Deleting them early saves the line and lengthens the outage you cannot unwind.',
      mistake: 'Scaling the service to one instance overnight because traffic is low, and calling the availability SLO unchanged.',
      followUp: 'What would you measure for a week to show the SLO did not move after the log cut?',
      extension: 'When would moving the database into the same zone cut cost and risk the SLO?',
      alternative: 'A lifecycle rule that transitions old exports to a colder storage class saves less than deletion and keeps the bytes recoverable. It still does not touch the serving replicas.',
    },
  },
  'account-isolation': {
    morning: {
      title: 'Production is a separate account',
      why: 'A shared account means a shared identity and a shared network. The staging role, the laptop key, and the production data then differ only by a naming convention.',
      explain: `Put production in its own account or project. Its identities, its network, and its pipeline role do not exist in the dev account. Developers do not have standing admin there. Staging cannot assume the production role. A laptop credential that can list dev buckets cannot list production buckets, because those buckets are not in the account the credential belongs to.

Naming a bucket prod-invoices inside the dev account is not this split. The identity that can edit dev can edit the name. Isolation is a different account boundary the platform enforces, plus a network that is not peered wide open back to every developer VPC.`,
      question:
        'Separate production identities and networks from everything else for the invoice system. Say what a staging role and a laptop credential must not be able to do. Say why a bucket name prefix is not the separation.',
      hints: [
        'The platform enforces account boundaries. A name prefix is a convention.',
        'Staging and production deploy roles should not be assumable from the other account.',
      ],
      outline: [
        'Production has its own account, identities, and network.',
        'Staging cannot assume the production role.',
        'A laptop dev credential cannot list or change production.',
        'A name prefix inside one account is not a boundary.',
      ],
      solution: `Create a production account whose roles, network, and buckets live only there. The production deploy role is assumable by the production pipeline, not by staging CI and not by a developer group. The production network is not the dev VPC with a subnet called prod. If the accounts must talk, they talk through a narrow, reviewed path, not a full peer that makes the split decorative.

A staging role must not read production invoices, change production rules, or roll the production service. A laptop credential issued for dev must not do those things either. There is no standing admin for people. Break-glass is a separate role, logged, and not the key on the laptop. A bucket named prod-invoices in the shared account fails the test: the dev admin policy, the tutorial star, and the leaked CI token of the shared account can all name that bucket. The account boundary is what makes "cannot name it" true.`,
      rubric: [
        'Production identities, network, and deploy role sit in a separate account from staging and laptops.',
        'A naming prefix is rejected because the same account identity can still reach the resource.',
      ],
      myth: [
        'A prod prefix on resource names isolates production.',
        'A prefix is a label. Any identity in that account that can list or wildcard the service can cross it. A separate account is the boundary.',
      ],
      context:
        'Least privilege inside production still matters. Account isolation is the outer wall so a dev mistake does not get to test that inner policy.',
      tradeoff: 'More accounts mean more pipelines, more billing setup, and a harder "just look at the logs" path. One account means every identity is one policy bug away from production.',
      mistake: 'Creating the production account and then granting the dev admin group a standing role inside it so debugging is easier.',
      followUp: 'How does an on-call engineer reach production logs without a standing admin key on their laptop?',
      extension: 'What network path, if any, should exist between the staging account and the production account?',
      alternative: 'A separate project with a hard organization policy can be the same boundary on clouds that use projects instead of accounts. The test is identical: staging credentials must fail when they name a production resource.',
    },
    evening: {
      title: 'Blast radius in a shared account',
      why: 'A shared account turns a staging leak, a wide role, or a quota burn into a production incident. The radius is everything the account can name.',
      explain: `Blast radius is what one mistake or one stolen credential can reach. In a shared account, a staging deploy role that was granted admin, a branch CI token, or a laptop key can read production buckets and edit production security groups, because those resources are names in the same account and the policy says star. A runaway test can spend the account quota and throttle production. An audit log mixes experiments with real access, so you cannot see the customer read.

A separate production account does not make the staging leak harmless to staging. It makes the leaked staging credential unable to name production. That is the radius you are buying.`,
      question:
        'Explain a blast radius that a shared account makes worse. Use a leaked staging CI token. Say what it can reach in the shared account, and what changes if production is a separate account.',
      hints: [
        'The token can do whatever the shared account role allows, including resources named prod.',
        'A separate account means the staging token cannot name the production bucket at all.',
      ],
      outline: [
        'The leaked staging token carries a role in the shared account.',
        'That role can read production data and change production rules if the account policy is wide.',
        'It can also burn shared quotas and muddy the audit log.',
        'In a separate account the same token cannot name production resources.',
      ],
      solution: `In the shared account, the staging CI token is a credential for the only account you have. If its role is admin, or if any policy uses a resource star, the leak can read the production invoice bucket, change the production database security group, and deploy over the production service. Even a "staging" role often has a star someone added so a job would pass. The blast radius is production data and the production network, plus the quota the test job can exhaust so production deploys start failing. The audit trail lists the token beside real customer access, and you will spend the incident proving which calls were the leak.

In a separate production account, the same stolen token can damage staging and cannot name the production bucket or the production role. The radius shrinks to the account that owned the token. Production still needs its own tight roles, because a leaked production token is a different story. The shared account is what made the staging leak a production breach. The boundary is what stops that sentence from being true.`,
      rubric: [
        'The shared-account blast radius includes production data, network, or quota reachable by the staging credential.',
        'A separate production account is what makes that credential unable to name production.',
      ],
      myth: [
        'A leaked staging key is only a staging incident if the key name says staging.',
        'The key reaches whatever its account role can name. In a shared account that can be production. The name of the key is not the boundary.',
      ],
      context:
        'This is least privilege failing at the account wall. A perfect inner policy is still one star away. The outer account means the star is not in the same place as production.',
      tradeoff: 'Separate accounts slow down a person who legitimately needs to debug across both, and they stop a staging token from being a customer-data incident.',
      mistake: 'Peering the networks and sharing one admin role across the two accounts, which rebuilds the shared blast radius on top of the extra billing.',
      followUp: 'What quota, shared in one account, can a runaway staging test exhaust that production needs?',
      extension: 'How do you still give an incident responder access to production without putting that access on the staging role?',
      alternative: 'A strong organization boundary with deny policies can shrink radius inside one account. It is easier to punch a hole in than a separate account, and it is better than a name prefix. Prefer the separate account when you can operate it.',
    },
  },
  'small-platform': {
    morning: {
      title: 'Build, run, observe, roll back',
      why: 'A platform is the smallest set of paths a team needs to ship a change and undo it. Anything you add before those four exist is a second product you are not ready to run.',
      explain: `Build takes the repo to a digest in CI, with the lockfile and a pinned base, and without a production secret in the job. Run starts that digest with a limit, a health check, a stable address, and an identity that can reach only what the service needs. Observe gives you one log stream with a request id, one metric for errors and latency, and one page that a person can act on. Roll back starts the previous digest again, including a way to stop a migration the code rollback does not undo.

That is the platform. A team can ship the invoice API and undo the ship. A portal, a service mesh, and a custom scheduler are not on this list. They can wait until the four paths are boring.`,
      question:
        'Sketch the minimum platform the invoice team needs: build, run, observe, and roll back. For each, name the one thing it must do. Leave out anything a second team has not asked for.',
      hints: [
        'Build produces a digest from the repo. Run starts that digest with a limit and a health check.',
        'Roll back is a previous digest you can actually start, not a wiki page about deploys.',
      ],
      outline: [
        'Build produces a pinned image digest from CI without production secrets.',
        'Run starts it with limits, a health check, a stable address, and a narrow identity.',
        'Observe provides logs, latency and errors, and one actionable page.',
        'Roll back restarts the previous digest and names migrations the rollback will not undo.',
      ],
      solution: `Build is CI from the lockfile and a pinned base, producing a digest. The build role cannot deploy production. Run is a deployment of that digest, with a memory limit from the working set, a readiness check, a service name, and a role that can read the invoice prefix and nothing else. Observe is structured logs with a request id, a latency and error metric tied to the SLO, and one alert with a runbook link. You do not need a custom tracing backend on day one if the log and the metric name the failing hop.

Roll back is a command or a pipeline step that runs the previous digest and is practiced. Write down the migration it will not undo, such as a dropped column, so nobody expects the old binary to understand the new schema. That is the sketch. It fits on a page. If a piece does not help you build, run, see, or undo the invoice service, it is not in the minimum platform.`,
      rubric: [
        'Build, run, observe, and roll back are each present with a concrete mechanism, not a tool slogan.',
        'The sketch excludes extra platform products and notes that a rollback does not undo every migration.',
      ],
      myth: [
        'A platform starts with a developer portal and a service mesh.',
        'A platform starts with a way to ship a digest and a way to put the previous digest back. Portals and meshes come after a repeated pain.',
      ],
      context:
        'The operate-a-service list from earlier phases is this sketch for one team: SLO, dashboard, deploy, rollback. The platform is those paths made repeatable.',
      tradeoff: 'A minimal platform leaves every team writing a little glue and avoids a platform team with no users. A large platform removes the glue and can block a ship on a queue you do not control yet.',
      mistake: 'Building an internal platform UI before the rollback path has been used for real.',
      followUp: 'What is the rollback step for a schema change that old code cannot read?',
      extension: 'Which of the four is missing if you can deploy and cannot tell whether users are failing?',
      alternative: 'Renting a managed runtime for run, and a managed log for observe, still counts. The platform is the path. It does not have to be software you wrote.',
    },
    evening: {
      title: 'Wait for the second team',
      why: 'One team pain is a script. Two teams with the same pain are a platform feature. Building the feature for an imagined second team freezes the first team on your roadmap.',
      explain: `After build, run, observe, and roll back work for the invoice team, stop. A service mesh, a self-service portal, a multi-cluster scheduler, a homegrown secret UI, and a golden-path generator are real products. They need users, support, and a compatibility promise.

You do not have those users yet if only one team deploys. Their annoyance can be a documented command. When a second team hits the same incident, the same missing rollback, or the same secret-distribution mess, that repeated pain is the requirement. Until then, the thing you would not build is the portal.`,
      question:
        'The invoice team is the only team on the new platform. Say what you would not build until a second team has the same pain. Pick a specific system, and say what the first team uses instead.',
      hints: [
        'A portal, a mesh, or a custom scheduler is a product. A script is a workaround.',
        'The trigger to build it is a second team hitting the same failure, not a roadmap slide.',
      ],
      outline: [
        'Do not build a self-service portal, mesh, or custom scheduler yet.',
        'The invoice team can use the pipeline and a short runbook.',
        'A second team with the same pain is the signal to platformize that path.',
        'Building it now freezes one team on a generalization they did not need.',
      ],
      solution: `Do not build a self-service developer portal. The invoice team is one group. They can run the pipeline, read one page of runbook, and roll back a digest. A portal would take longer to build than the service, would encode guesses about a second team workflow, and would become something you must support. The same answer fits a service mesh and a multi-cluster scheduler. You do not have two clusters of teams. You have one service.

What the first team uses instead is the minimum platform: CI, the deployment, the dashboard, and the rollback step. When a second team shows up and hits the same pain, such as both teams botching secret distribution or both teams unable to roll back without you, that is the requirement for a platform feature. Write it down as their incident, not as a tool you wanted to learn. Until that second pain exists, another abstraction is a project the invoice team waits on. Let them ship.`,
      rubric: [
        'A specific system, such as a portal or a mesh, is deferred until a second team has the same pain.',
        'The first team is given the existing build, run, observe, and rollback path instead of that system.',
      ],
      myth: [
        'We should build the platform general enough for every future team before the first team ships.',
        'You do not know the second team pain yet. Generalizing now delays the first ship and guesses the abstraction.',
      ],
      context:
        'Build-versus-buy applies inside the company too. A portal you write is a product with users, an on-call, and a compatibility story, even if the users are coworkers.',
      tradeoff: 'Waiting for a second team leaves duplicated scripts for a while. Building early removes duplication you do not have yet and creates a platform queue for the team you do have.',
      mistake: 'Staffing a platform group to build a portal while the only service still cannot roll back.',
      followUp: 'What incident, seen twice, would justify building secret distribution as a platform feature?',
      extension: 'What would you still refuse to build even after a second team arrives, if their pains differ?',
      alternative: 'Adopting a managed portal you do not have to operate can be cheaper than writing one, and it is still the wrong purchase if the first team only needed a pipeline and a runbook.',
    },
  },
};
