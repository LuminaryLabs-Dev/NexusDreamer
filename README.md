# NexusDreamer

NexusDreamer is a local-first Electron **image revision chain harness**.

You import an image, describe one small change, generate the next image, review it, then accept or reject it. An accepted result becomes the immutable source for the next edit, so you can build detail gradually over many steps without rewriting the whole prompt.

## Quick start

```bash
git clone https://github.com/LuminaryLabs-Dev/NexusDreamer.git
cd NexusDreamer
npm install
npm run dev
```

The UI opens without model weights. Real inference requires a local `stable-diffusion.cpp` `sd-cli` executable.

Set it before launch:

```bash
export NEXUS_DREAMER_SD_CLI=/absolute/path/to/sd-cli
npm run dev
```

On Windows PowerShell:

```powershell
$env:NEXUS_DREAMER_SD_CLI='C:\path\to\sd-cli.exe'
npm run dev
```

## Model setup

The Runtime panel can explicitly download the required Qwen Image 2.1 bundle from Hugging Face. Downloads resume from `.part` files when the server supports ranges.

The default bundle contains:

- `qwen_image_2.1-Q4_K.gguf`
- `qwen_image_2.1_vae_bf16.safetensors`
- `Qwen3VL-8B-Instruct-Q4_K_M.gguf`
- `mmproj-Qwen3VL-8B-Instruct-F16.gguf`

## Architecture

- Electron + React/Vite
- secure preload IPC
- Command Bus
- application services
- Event Bus
- immutable chain/step/run/artifact data model
- append-only event journal
- inference AST
- stable-diffusion.cpp provider compiler
- real local `sd-cli` execution
- progress, failure, and cancellation events
- chain accept/reject/retry/checkout/branch semantics
- resumable model downloading
- Windows/macOS/Linux CI build and packaging workflows

See `docs/ARCHITECTURE.md`.
