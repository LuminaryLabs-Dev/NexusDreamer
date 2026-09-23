# NexusDreamer architecture

NexusDreamer is an immutable image-revision chain harness.

Core flow:

`Renderer → Command → CommandBus → Services → Domain Events → Persisted State`

Inference flow:

`Accepted image → delta instruction → InferenceProgram AST → provider compiler → stable-diffusion.cpp → new artifact → review → accept/reject`

## Invariants

- Accepted images are immutable.
- A new edit consumes the accepted output of the current chain head.
- Rejecting a run never changes the chain head.
- Retrying a step creates another run, not another logical step.
- Branching creates a new chain whose head points to an existing accepted step.
- Renderer code never spawns inference binaries directly.
- Projects persist materialized JSON plus an append-only NDJSON event journal.
- Model/provider behavior is data-driven through manifests.
- Backend execution is compiled from an AST so providers can be replaced later.

## Storage

Each project contains project state, artifacts, and events. Runtime model weights and backend binaries live under the OS application-data directory and are never committed to Git.

## Security boundary

Electron uses context isolation with Node integration disabled. The preload exposes only command execution, runtime status, image selection, image preview, and domain-event subscription.
