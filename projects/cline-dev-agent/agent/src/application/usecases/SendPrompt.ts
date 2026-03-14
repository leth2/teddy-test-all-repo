import { IACPBridge } from '../../domain/ports/IACPBridge';

export interface SendPromptInput {
  content: string;
  sessionId: string;
}

// S: 프롬프트 전송 단일 책임 유스케이스
export class SendPrompt {
  constructor(private readonly bridge: IACPBridge) {}

  execute(input: SendPromptInput): void {
    if (!this.bridge.isReady()) {
      throw new Error('에이전트가 아직 준비되지 않았습니다');
    }
    this.bridge.sendPrompt(input.sessionId, input.content);
  }
}
