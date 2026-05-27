# Remote Workers

Remote workers should report through Puter before they start code work and before they hand off
results. Puter does not run the worker; it records the claim, failure reports, and final handoff in
Linear.

## EC2/Systemd Bootstrap

Install Node, pnpm, git, and the Puter checkout on the host. Keep credentials in a root-readable env
file rather than in service units or repository files:

```bash
sudo install -d -m 0750 /etc/puter
sudo tee /etc/puter/worker.env >/dev/null <<'EOF'
PUTER_API_URL=https://puter.example.com
PUTER_API_TOKEN=replace-with-token
PUTER_PROJECT=puter
EOF
sudo chmod 0640 /etc/puter/worker.env
```

Example template unit for a worker command that receives an issue identifier as the instance name:

```ini
[Unit]
Description=Puter worker for %i
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/opt/puter
EnvironmentFile=/etc/puter/worker.env
ExecStart=/usr/bin/env pnpm --filter @lucky9/puter-cli puter exec --surface ec2 --issue %i --project ${PUTER_PROJECT} --area apps/api --require-claim --handoff-on-exit --handoff-validation "Remote worker validation passed" -- bash -lc 'pnpm test'
```

If the wrapped command succeeds, Puter records handoff. If it fails, Puter appends a `failed` report
to the active workpad and leaves the issue in its claimed state for follow-up.

## Public HTTPS API

Expose Puter to remote workers only over HTTPS and require `PUTER_API_TOKEN`.

```bash
export PUTER_HOST=127.0.0.1
export PUTER_PORT=8787
export PUTER_API_TOKEN=replace-with-token
pnpm dev
```

Terminate TLS at a reverse proxy or load balancer and forward only to the local Puter API. The public
URL becomes the worker `PUTER_API_URL`, for example `https://puter.example.com`.
