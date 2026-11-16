# Hosting Environment & Process Limits Guidelines

> **Context**: Shared hosting / Hostinger account process limit advisories.

## ⚠️ The Issue: Account-Wide Process Limits (Max Processes)

The account-wide process usage reaches hosting tier ceilings. The constraint is **Max Processes** (concurrent process / PID ceiling), **NOT** disk space, memory, CPU, or inodes.

Because the Next.js application is one of several sites sharing this hosting account, the process ceiling is reached by combined account-wide website activity (PHP workers, background processes, Node watchers, etc.).

---

## 🛠️ Lasting Fix & Operational Rules

1. **Production Mode Only**:
   * Run the Next.js application in **production mode only** (`bun run build` followed by `bun run start` or via standalone output).
   * **Never** keep development watchers like `npm run dev` or `bun run dev` running on the server, as file watchers (turbopack / webpack / chokidar) spawn multiple child processes and threads.

2. **Single Process Enforcement**:
   * Avoid starting duplicate Node.js / Bun instances or process managers inside the shared hosting account.
   * Verify and clean up dangling or orphaned processes before starting new ones (`kill` stale PIDs).

3. **Audit Sibling Sites on the Account**:
   * Audit other websites/domains sharing this hosting plan for:
     * Background cron workers and queue listeners.
     * WordPress / PHP plugins creating persistent child processes.
     * High-frequency repeated PHP worker requests.

4. **Infrastructure Upgrade Path**:
   * If process usage consistently remains near the shared tier ceiling after stopping development watchers, migrate the Next.js workload to a dedicated **Hostinger VPS** (or dedicated Node.js host such as Vercel / Railway / Cloud Run) or upgrade the shared hosting tier to one with significantly higher process capacity.
