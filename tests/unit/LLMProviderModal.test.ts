import { App, Notice } from 'obsidian';
import { LLMProviderModal } from '../../src/components/LLMProviderModal';
import { createMockElement } from '../helpers/mockFactories';
import { GenericProviderModal } from '../../src/components/llm-provider/providers/GenericProviderModal';
import { LLMValidationService } from '../../src/services/llm/validation/ValidationService';

jest.mock('obsidian', () => {
  class Modal {
    app: unknown;
    contentEl = {
      empty: jest.fn(),
      addClass: jest.fn(),
      createEl: jest.fn(),
      createDiv: jest.fn(),
    };

    constructor(app: unknown) {
      this.app = app;
    }

    open(): void {}
    close(): void {}
  }

  class App {
    vault = {};
  }

  return {
    App,
    Modal,
    Notice: jest.fn(),
  };
});

jest.mock('../../src/services/StaticModelsService', () => ({
  StaticModelsService: {
    getInstance: jest.fn(() => ({})),
  },
}));

jest.mock('../../src/services/llm/validation/ValidationService', () => ({
  LLMValidationService: { validateApiKey: jest.fn() },
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('LLMProviderModal save status', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createModal(onSave: (config: { enabled: boolean; apiKey: string; oauth?: { connected: boolean; providerId: string; connectedAt: number } }) => Promise<void>, providerId = 'openai'): LLMProviderModal {
    const modal = new LLMProviderModal(
      new App(),
      {
        providerId,
        providerName: 'OpenAI',
        keyFormat: 'sk-...',
        signupUrl: 'https://platform.openai.com',
        config: { enabled: false, apiKey: '' },
        onSave,
      },
      {} as never,
    );

    (modal as unknown as { saveStatusEl: ReturnType<typeof createMockElement> }).saveStatusEl = createMockElement('div');
    return modal;
  }

  it('waits for immediate OAuth saves before showing Saved', async () => {
    const deferred = createDeferred<void>();
    const onSave = jest.fn().mockReturnValue(deferred.promise);
    const modal = createModal(onSave);
    const config = {
      enabled: true,
      apiKey: 'token',
      oauth: { connected: true, providerId: 'openai', connectedAt: 1 },
    };

    const savePromise = (modal as unknown as { handleConfigChange: (config: typeof config) => Promise<void> }).handleConfigChange(config);
    await Promise.resolve();

    const saveStatusEl = (modal as unknown as { saveStatusEl: ReturnType<typeof createMockElement> }).saveStatusEl;
    expect(onSave).toHaveBeenCalledWith(config);
    expect(saveStatusEl.textContent).toBe('Saving...');

    deferred.resolve();
    await savePromise;

    expect(saveStatusEl.textContent).toBe('Saved');

    jest.advanceTimersByTime(2000);
    expect(saveStatusEl.textContent).toBe('Ready');
    expect(Notice).not.toHaveBeenCalled();
  });

  it('shows Save failed when an immediate OAuth save rejects', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('disk full'));
    const modal = createModal(onSave);
    const config = {
      enabled: true,
      apiKey: 'token',
      oauth: { connected: true, providerId: 'openai', connectedAt: 1 },
    };

    await (modal as unknown as { handleConfigChange: (config: typeof config) => Promise<void> }).handleConfigChange(config);

    const saveStatusEl = (modal as unknown as { saveStatusEl: ReturnType<typeof createMockElement> }).saveStatusEl;
    expect(saveStatusEl.textContent).toBe('Save failed');
  });

  it('waits for debounced autosaves before showing Saved', async () => {
    const deferred = createDeferred<void>();
    const onSave = jest.fn().mockReturnValue(deferred.promise);
    const modal = createModal(onSave);
    const finalConfig = { enabled: true, apiKey: 'updated-key' };

    (modal as unknown as { providerModal: { getConfig: () => typeof finalConfig } }).providerModal = {
      getConfig: () => finalConfig,
    };

    await (modal as unknown as { handleConfigChange: (config: typeof finalConfig) => Promise<void> }).handleConfigChange({
      enabled: true,
      apiKey: 'initial-key',
    });

    const saveStatusEl = (modal as unknown as { saveStatusEl: ReturnType<typeof createMockElement> }).saveStatusEl;
    expect(saveStatusEl.textContent).toBe('Saving...');

    jest.advanceTimersByTime(500);
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledWith(finalConfig);
    expect(saveStatusEl.textContent).toBe('Saving...');

    deferred.resolve();
    await Promise.resolve();

    expect(saveStatusEl.textContent).toBe('Saved');
  });

  it('saves the normalized key through the real provider getConfig boundary', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    jest.mocked(LLMValidationService.validateApiKey).mockResolvedValue({ success: true });
    const modal = createModal(onSave, 'anthropic');
    const provider = (modal as unknown as { createProviderModal: () => GenericProviderModal }).createProviderModal();
    (modal as unknown as { providerModal: GenericProviderModal }).providerModal = provider;
    (provider as unknown as { apiKey: string }).apiKey = '  sk-ant-new-key  ';
    (provider as unknown as { handleApiKeyChange: (value: string) => void }).handleApiKeyChange('  sk-ant-new-key  ');
    await (provider as unknown as { validateApiKey: () => Promise<void> }).validateApiKey();

    jest.advanceTimersByTime(500);
    await Promise.resolve();

    expect(LLMValidationService.validateApiKey).toHaveBeenCalledWith('anthropic', 'sk-ant-new-key', expect.anything());
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({
      apiKey: 'sk-ant-new-key',
      enabled: true,
    }));
  });

  it('flushes the pending autosave when closed', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const modal = createModal(onSave);
    const finalConfig = { enabled: true, apiKey: 'last-key' };
    (modal as unknown as { providerModal: { getConfig: () => typeof finalConfig; destroy: () => void } }).providerModal = {
      getConfig: () => finalConfig,
      destroy: jest.fn(),
    };
    await (modal as unknown as { handleConfigChange: (config: typeof finalConfig) => Promise<void> }).handleConfigChange(finalConfig);

    modal.onClose();
    await (modal as unknown as { saveTail: Promise<void> }).saveTail;

    expect(onSave).toHaveBeenCalledWith(finalConfig);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('serializes saves so the newer key persists last', async () => {
    const firstSave = createDeferred<void>();
    const onSave = jest.fn().mockImplementationOnce(() => firstSave.promise).mockResolvedValue(undefined);
    const modal = createModal(onSave);
    const write = (config: { enabled: boolean; apiKey: string }) =>
      (modal as unknown as { handleConfigChange: (value: typeof config) => Promise<void> }).handleConfigChange(config);

    await write({ enabled: true, apiKey: 'old-key' });
    jest.advanceTimersByTime(500);
    await Promise.resolve();
    await write({ enabled: true, apiKey: 'new-key' });
    jest.advanceTimersByTime(500);
    expect(onSave).toHaveBeenCalledTimes(1);

    firstSave.resolve();
    await (modal as unknown as { saveTail: Promise<void> }).saveTail;
    expect(onSave).toHaveBeenLastCalledWith({ enabled: true, apiKey: 'new-key' });
  });
});
