import { ChildProcess, spawn } from 'child_process';
import {
  CompletionItem,
  CompletionItemProvider,
  ExtensionContext,
  languages,
  workspace,
  WorkspaceConfiguration,
} from 'coc.nvim';

class MocwordProvider implements CompletionItemProvider {
  private cfg: WorkspaceConfiguration;
  private proc: ChildProcess | null = null;

  constructor() {
    this.cfg = workspace.getConfiguration('mocword');
  }

  get enable() {
    if (!(process.env.MOCWORD_DATA_PATH || process.env.MOCWORD_DATA)) return false;
    return this.cfg.get('enable') as boolean;
  }

  get filetypes() {
    return this.cfg.get('filetypes') as string[];
  }

  get limit() {
    return this.cfg.get('limit') as string;
  }

  get bin(): string {
    return process.platform === 'win32' ? 'mocword.exe' : 'mocword';
  }

  async provideCompletionItems(): Promise<CompletionItem[]> {
    if (!this.proc) {
      this.proc = spawn(this.bin, ['-l', this.limit]).on('error', () => this.proc = null);
    }

    if (!this.proc) return [];

    const line = await workspace.nvim.line;
    this.proc.stdin?.write(line + '\n');

    return new Promise<CompletionItem[]>((resolve) => {
      const items: CompletionItem[] = [];
      this.proc?.stdout?.on('data', (chunk) => {
        for (const word of (chunk.toString() as string).split(' ')) {
          const label = word.trimRight();
          if (!label) continue;
          items.push({ label });
        }

        resolve(items);
      });

      this.proc?.on('error', () => resolve(items));
    });
  }
}

export async function activate(context: ExtensionContext): Promise<void> {
  const provider = new MocwordProvider();
  if (!provider.enable) return;

  context.subscriptions.push(
    languages.registerCompletionItemProvider('mocword', 'Mocword', provider.filetypes, provider, [' '])
  );
}
