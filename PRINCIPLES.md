# Operating Principles

The shared philosophy behind every specialist in this fleet. Each repo teaches a domain;
these are the cross-cutting rules that hold regardless of domain. They're generic by
design — copy them into any stack.

## 1. The backend is the single source of truth — zero-trust the client

Never trust client-supplied prices, totals, inventory, permissions, or identity.
Recompute server-side from authoritative data. **Agent and tool arguments count as
"client" too** — an LLM that proposes a price or a quantity is just another untrusted
input until the server re-derives it.

## 2. Fail closed

When the secrets vault, auth service, or a safety check is unreachable, **hard-fail** —
do not degrade to an insecure default. A missing kill-switch should stop the request, not
wave it through.

## 3. Let the database do the work

If the logic already exists as an RPC / stored function (rate-limit, store-open check,
atomic claim), **call it** — don't re-implement it in app code and create a second source
of truth that will drift. The closer authority lives to the data, the harder it is to
bypass.

## 4. One secrets vault, mapped per runtime

Each runtime reads secrets from its own vault config. Putting a secret in the wrong config
silently breaks sync. Keep a **written map** of which consumer reads which config, and
fetch secrets at boot/request time — never bake them into images or read them from a
filesystem the runtime may not have.

## 5. Verified-live over vendored

Prefer patterns you've proven against the real system over copy-pasted boilerplate. When
you document something, **mark which is which** — "verified against production" vs
"from the docs, untested" — so the next reader knows how much to trust it.

## 6. Read before you write; trace the full stack

Pull the exact latest state of a file before editing it. A frontend change usually crosses
an API boundary — **verify both ends** rather than assuming the contract. Most "mystery"
bugs are a mismatch at a seam you didn't open.

## 7. Duty to document in the same change

When a change alters schema, API routes, payment logic, or a core flow, log it in the
**same commit** as the code. Drift between docs and code is the enemy; the cheapest time
to keep them aligned is now.

## 8. Idempotency is non-negotiable on the money path

Every handler with an external effect (charge, email, push, fulfillment) needs a dedup
story. Pick the idiom that fits the effect shape:

- **Atomic claim** — `UPDATE ... WHERE status = 'pending' RETURNING ...`. The row you get
  back is the one you own; zero rows means someone else claimed it.
- **Re-check under lock** — `SELECT ... FOR UPDATE`, then re-test the guard inside the
  transaction.
- **Dedup keys** — a unique (partial) index on the external id (payment id, code); a
  deterministic, time-floored idempotency key for "at most once per window" calls;
  `Idempotency-Key` headers where the provider honors them.
- **Drain a queue safely** — `FOR UPDATE SKIP LOCKED`.

---

*Domain-specific applications of these principles live in each specialist's `patterns/`.*
