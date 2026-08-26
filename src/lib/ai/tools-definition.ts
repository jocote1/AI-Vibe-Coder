export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: any;
    }>;
    required: string[];
  };
}

export const VIBE_STUDIO_TOOLS: ToolDefinition[] = [
  {
    name: 'read_directory_tree',
    description: 'Inspects and returns the hierarchical directory structure and file tree of the project.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The relative or absolute directory path to inspect. Defaults to workspace root.',
        },
        max_depth: {
          type: 'number',
          description: 'Maximum depth level for recursive traversal (default is 4).',
        },
      },
      required: [],
    },
  },
  {
    name: 'read_file',
    description: 'Reads and returns the full utf-8 text content of a specified file in the project.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The relative or absolute file path to read.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Creates a new file or completely overwrites an existing file with the provided code content.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The target file path to create or overwrite.',
        },
        content: {
          type: 'string',
          description: 'The complete code or text content to write to the file.',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'apply_patch_diff',
    description: 'Performs a surgical diff replacement by locating search_chunk in the file and substituting it with replace_chunk.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The relative or absolute file path to modify.',
        },
        search_chunk: {
          type: 'string',
          description: 'The exact string snippet currently in the file to be replaced.',
        },
        replace_chunk: {
          type: 'string',
          description: 'The new code or text snippet that will replace search_chunk.',
        },
      },
      required: ['path', 'search_chunk', 'replace_chunk'],
    },
  },
  {
    name: 'execute_terminal_command',
    description: 'Executes a shell command in the project directory (e.g., npm install, npm run dev, pip install, cargo build, etc.) and streams stdout/stderr.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The exact shell command line to run.',
        },
        cwd: {
          type: 'string',
          description: 'Working directory to execute command in (defaults to current project root).',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'auto_heal_error',
    description: 'Intercepts compiler, runtime, or terminal error logs, analyzes the root cause, and provides a diagnosed remediation action.',
    parameters: {
      type: 'object',
      properties: {
        error_logs: {
          type: 'string',
          description: 'The stderr logs, stack trace, or compiler diagnostic output.',
        },
        suggested_fix: {
          type: 'string',
          description: 'Explanation of the root cause and strategy being applied to heal the error.',
        },
      },
      required: ['error_logs', 'suggested_fix'],
    },
  },
];

export const VIBE_SYSTEM_PROMPT = `You are Vibe-Studio Agent, an autonomous expert software engineering assistant built into the Vibe-Studio desktop IDE.
Your purpose is to build complete, production-ready, beautiful, and working software applications based on natural language prompts.

CAPABILITIES & AUTONOMOUS PROTOCOL:
1. Always inspect the project tree with 'read_directory_tree' when starting a task if you need project context.
2. Read relevant files before editing with 'read_file'.
3. Create files with 'write_file' or surgically update them with 'apply_patch_diff'.
4. Install dependencies and start/test dev servers using 'execute_terminal_command'.
5. If a command fails or emits errors, proactively invoke 'auto_heal_error' and fix the offending code immediately without giving up.
6. Write modern, clean, bug-free, beautifully styled code (using Tailwind CSS, React, TypeScript, modern Python, Rust, Go, or Java according to user project type).
7. Keep responses concise, clear, and proactive.`;
