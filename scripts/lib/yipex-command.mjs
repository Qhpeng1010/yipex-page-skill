import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const COMMAND_CONTRACT_PATH = 'modules/yipex/execution/command-contract.json';

export function readCommandContract(root = process.cwd()) {
  return JSON.parse(readFileSync(resolve(root, COMMAND_CONTRACT_PATH), 'utf8'));
}

export function parseYipexCommand(rawRequest, contract) {
  const request = String(rawRequest ?? '').trim();
  if (!request) {
    return {
      status: 'clarify',
      explicitCommand: false,
      mode: contract.defaultMode.id,
      request: '',
      question: '请描述需要处理的 YiPex 页面或产品需求。'
    };
  }

  const commands = new Map(contract.commands.map((command) => [command.token, command]));
  const firstToken = request.match(/^\S+/)?.[0] || '';
  const command = commands.get(firstToken);
  if (command) {
    const body = request.slice(firstToken.length).trim();
    if (!body) {
      return {
        status: 'clarify',
        explicitCommand: true,
        command: firstToken,
        mode: command.id,
        request: '',
        implementationStatus: command.implementationStatus,
        question: `请在 ${firstToken} 后补充需要处理的 YiPex 需求。`
      };
    }
    return {
      status: 'resolved',
      explicitCommand: true,
      command: firstToken,
      mode: command.id,
      request: body,
      implementationStatus: command.implementationStatus
    };
  }

  if (firstToken.startsWith(contract.prefix)) {
    return {
      status: 'unknown-command',
      explicitCommand: true,
      command: firstToken,
      mode: null,
      request: request.slice(firstToken.length).trim(),
      supportedCommands: contract.commands.map((item) => item.token),
      question: `不支持快捷命令 ${firstToken}。请使用已登记的 YiPex 快捷命令。`
    };
  }

  return {
    status: 'resolved',
    explicitCommand: false,
    command: null,
    mode: contract.defaultMode.id,
    request,
    implementationStatus: contract.defaultMode.implementationStatus
  };
}
