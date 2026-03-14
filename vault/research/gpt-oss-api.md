# GPT-OSS 120B — Free API for Hackathon

## Access

Provided by hackathon organizers. Free, shared server. Avoid hogging.

## Setup

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "test"),
    base_url="https://handles-virtual-creating-introduced.trycloudflare.com/v1",
)

resp = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Say hello in one sentence."},
    ],
    max_tokens=50,
)
```

## Capabilities

- Function calling
- Reasoning
- Web browsing
- Python code execution
- Structured outputs

## Resources

- Examples: https://developers.openai.com/cookbook/articles/gpt-oss/run-vllm/#use-the-api
- API Docs: https://developers.openai.com/api/docs/

## Notes

- Uses standard OpenAI API format
- Model ID: `openai/gpt-oss-120b`
- API key can be anything (e.g., "test")
- Shared server — be considerate with usage
