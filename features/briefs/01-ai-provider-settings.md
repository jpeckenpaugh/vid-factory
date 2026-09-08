# Feature Brief: AI Provider Settings

## Purpose

Provide a workspace Settings interface in the client browser application allowing users to configure and manage AI provider credentials (Gemini, OpenAI, Ollama), API keys, and custom endpoint URLs for client-side script generation.

## Expected Behavior

1. The user navigates to the workspace Settings interface from the application UI.
2. The user selects an active AI Provider from supported options (`Gemini`, `OpenAI`, `Ollama`).
3. For cloud providers (`Gemini`, `OpenAI`), the user enters their API key.
4. For providers supporting custom hosts or self-hosted instances (`Ollama`, custom endpoints), the user enters the custom service base URL.
5. Upon saving settings, credentials and configuration parameters are stored locally in browser storage.
6. A "Test Connection" button validates the configuration against the selected provider and displays a success or error indicator.
7. Subsequent AI operations (e.g., AI Script Generator) use these configured settings to authenticate requests.

## Inputs / Outputs

- **Inputs:**
  - Selected provider name (`Gemini` | `OpenAI` | `Ollama`).
  - Provider API key string (for Gemini/OpenAI).
  - Custom endpoint URL (e.g., `http://localhost:11434` for Ollama).
- **Outputs:**
  - Saved provider configuration state in local workspace storage.
  - Connection status feedback indicator (Success / Failure message).

## User-Visible Behavior

- A dedicated Settings view or modal accessible within the browser app workspace.
- Input fields for provider selection, API key (masked with reveal toggle), and endpoint URL.
- Immediate UI feedback upon testing connection or saving settings.
- Clear error notifications if API keys are missing or invalid when attempting AI generation.

## Constraints

- Settings must be stored strictly within the client browser workspace (local storage / browser DB) and never transmitted to any application backend server.
- Must preserve existing navigation and workspace layout without regressing baseline CRUD workflows.
- API keys must be masked by default in the UI.

## Basic Acceptance Expectations

- User can select between Gemini, OpenAI, and Ollama providers.
- User can input and save API keys and custom endpoints.
- User can test connection status and see explicit success/failure messaging.
- Saved provider settings persist across page reloads and browser sessions.
